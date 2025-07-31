import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";

export interface FcIngestionStackProps extends cdk.StackProps {
  mongodbUri: string;
}

export class FcIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FcIngestionStackProps) {
    super(scope, id, props);

    // Create VPC for ECS
    const vpc = new ec2.Vpc(this, "FcIngestionVpc", {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create S3 bucket for data files
    const dataBucket = new s3.Bucket(this, "FcIngestionDataBucket", {
      bucketName: `fc-ingestion-data-${this.account}-${this.region}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "DeleteOldVersions",
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: "DeleteIncompleteUploads",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });

    // Create SQS FIFO queue for data ingestion
    const queue = new sqs.Queue(this, "FcIngestionQueue", {
      queueName: "fc-ingestion-queue.fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: cdk.Duration.seconds(250),
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Enable long polling
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, "FcIngestionDLQ", {
          queueName: "fc-ingestion-dlq.fifo",
          fifo: true,
          contentBasedDeduplication: true,
          retentionPeriod: cdk.Duration.days(14),
        }),
      },
    });

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, "FcIngestionCluster", {
      vpc,
      clusterName: "fc-ingestion-cluster",
    });

    // Create task definition with SQS and S3 permissions
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "FcIngestionTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );

    // Add SQS permissions to task role
    taskDefinition.taskRole?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess")
    );

    // Create custom S3 policy for specific bucket access
    const s3BucketPolicy = new iam.Policy(this, "S3BucketPolicy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket",
          ],
          resources: [dataBucket.bucketArn, `${dataBucket.bucketArn}/*`],
        }),
      ],
    });

    // Attach the custom S3 policy to the task role
    s3BucketPolicy.attachToRole(taskDefinition.taskRole!);

    // Add container to task definition
    const container = taskDefinition.addContainer("FcIngestionApp", {
      image: ecs.ContainerImage.fromAsset("../applications/nestjs-app", {
        buildArgs: {
          NODE_ENV: "production",
        },
        platform: Platform.LINUX_AMD64,
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "fc-ingestion",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        QUEUE_URL: queue.queueUrl,
        S3_BUCKET_NAME: dataBucket.bucketName,
        MONGODB_URI: props.mongodbUri,
        NODE_ENV: "production",
      },
    });

    // Create Fargate service without public access (SQS and S3 only)
    const fargateService = new ecs.FargateService(this, "FcIngestionService", {
      cluster,
      taskDefinition,
      desiredCount: 2,
      serviceName: "fc-ingestion-service",
      assignPublicIp: false, // Private subnets only
      healthCheckGracePeriod: cdk.Duration.seconds(30),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

    // Configure auto scaling
    const scaling = fargateService.autoScaleTaskCount({
      maxCapacity: 4,
      minCapacity: 1,
    });

    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization("MemoryScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, "QueueUrl", {
      value: queue.queueUrl,
      description: "URL of the FC Ingestion SQS Queue",
    });

    new cdk.CfnOutput(this, "QueueArn", {
      value: queue.queueArn,
      description: "ARN of the FC Ingestion SQS Queue",
    });

    new cdk.CfnOutput(this, "S3BucketName", {
      value: dataBucket.bucketName,
      description: "Name of the FC Ingestion S3 Data Bucket",
    });

    new cdk.CfnOutput(this, "S3BucketArn", {
      value: dataBucket.bucketArn,
      description: "ARN of the FC Ingestion S3 Data Bucket",
    });

    new cdk.CfnOutput(this, "ServiceName", {
      value: fargateService.serviceName,
      description: "Name of the FC Ingestion ECS Service",
    });

    new cdk.CfnOutput(this, "ClusterName", {
      value: cluster.clusterName,
      description: "Name of the FC Ingestion ECS Cluster",
    });
  }
}
