import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";

export class FcIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC for ECS
    const vpc = new ec2.Vpc(this, "FcIngestionVpc", {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create SQS queue for data ingestion
    const queue = new sqs.Queue(this, "FcIngestionQueue", {
      visibilityTimeout: cdk.Duration.seconds(250),
      retentionPeriod: cdk.Duration.days(14),
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Enable long polling
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: new sqs.Queue(this, "FcIngestionDLQ", {
          retentionPeriod: cdk.Duration.days(14),
        }),
      },
    });

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, "FcIngestionCluster", {
      vpc,
      clusterName: "fc-ingestion-cluster",
    });

    // Create task definition with SQS permissions
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
        PORT: "3000",
        QUEUE_URL: queue.queueUrl,
        NODE_ENV: "production",
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Create Fargate service with Application Load Balancer
    const fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "FcIngestionService",
        {
          cluster,
          taskDefinition,
          desiredCount: 2,
          serviceName: "fc-ingestion-service",
          publicLoadBalancer: true,
          listenerPort: 80,
          healthCheckGracePeriod: cdk.Duration.seconds(60),
        }
      );

    // Configure auto scaling
    const scaling = fargateService.service.autoScaleTaskCount({
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

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: "DNS name of the Application Load Balancer",
    });

    new cdk.CfnOutput(this, "ServiceUrl", {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}`,
      description: "URL of the NestJS application",
    });
  }
}
