import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export class GitHubActionsOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use existing OIDC Identity Provider for GitHub
    const githubOidcProvider =
      iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        this,
        "GitHubOidcProvider",
        "arn:aws:iam::120099621477:oidc-provider/token.actions.githubusercontent.com"
      );

    // Create IAM Role for GitHub Actions
    const githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      roleName: "GitHubActionsFcIngestionRole",
      assumedBy: new iam.FederatedPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:peareasy/fc-ingestion:*`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description: "Role for GitHub Actions to deploy FC Ingestion",
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Create a restrictive policy with only necessary permissions for CDK deployment
    const cdkDeploymentPolicy = new iam.Policy(this, "CdkDeploymentPolicy", {
      statements: [
        // CloudFormation permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "cloudformation:CreateStack",
            "cloudformation:UpdateStack",
            "cloudformation:DeleteStack",
            "cloudformation:DescribeStacks",
            "cloudformation:DescribeStackEvents",
            "cloudformation:DescribeStackResources",
            "cloudformation:ListStacks",
            "cloudformation:ValidateTemplate",
            "cloudformation:GetTemplateSummary",
          ],
          resources: ["*"],
        }),

        // ECR permissions for Docker image management
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "ecr:InitiateLayerUpload",
            "ecr:UploadLayerPart",
            "ecr:CompleteLayerUpload",
            "ecr:PutImage",
            "ecr:CreateRepository",
            "ecr:DescribeRepositories",
            "ecr:DeleteRepository",
          ],
          resources: ["*"],
        }),

        // ECS permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecs:CreateCluster",
            "ecs:DeleteCluster",
            "ecs:DescribeClusters",
            "ecs:CreateService",
            "ecs:UpdateService",
            "ecs:DeleteService",
            "ecs:DescribeServices",
            "ecs:RegisterTaskDefinition",
            "ecs:DeregisterTaskDefinition",
            "ecs:DescribeTaskDefinition",
            "ecs:ListTaskDefinitions",
          ],
          resources: ["*"],
        }),

        // EC2 permissions for VPC, security groups, etc.
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ec2:CreateVpc",
            "ec2:DeleteVpc",
            "ec2:DescribeVpcs",
            "ec2:CreateSubnet",
            "ec2:DeleteSubnet",
            "ec2:DescribeSubnets",
            "ec2:CreateSecurityGroup",
            "ec2:DeleteSecurityGroup",
            "ec2:DescribeSecurityGroups",
            "ec2:AuthorizeSecurityGroupIngress",
            "ec2:RevokeSecurityGroupIngress",
            "ec2:AuthorizeSecurityGroupEgress",
            "ec2:RevokeSecurityGroupEgress",
            "ec2:CreateInternetGateway",
            "ec2:DeleteInternetGateway",
            "ec2:DescribeInternetGateways",
            "ec2:AttachInternetGateway",
            "ec2:DetachInternetGateway",
            "ec2:CreateRouteTable",
            "ec2:DeleteRouteTable",
            "ec2:DescribeRouteTables",
            "ec2:CreateRoute",
            "ec2:DeleteRoute",
            "ec2:AssociateRouteTable",
            "ec2:DisassociateRouteTable",
            "ec2:CreateNatGateway",
            "ec2:DeleteNatGateway",
            "ec2:DescribeNatGateways",
            "ec2:AllocateAddress",
            "ec2:ReleaseAddress",
            "ec2:DescribeAddresses",
          ],
          resources: ["*"],
        }),

        // IAM permissions for service roles
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "iam:CreateRole",
            "iam:DeleteRole",
            "iam:GetRole",
            "iam:PutRolePolicy",
            "iam:DeleteRolePolicy",
            "iam:AttachRolePolicy",
            "iam:DetachRolePolicy",
            "iam:PassRole",
            "iam:CreatePolicy",
            "iam:DeletePolicy",
            "iam:GetPolicy",
            "iam:CreatePolicyVersion",
            "iam:DeletePolicyVersion",
            "iam:GetPolicyVersion",
            "iam:ListPolicyVersions",
            "iam:TagRole",
            "iam:UntagRole",
          ],
          resources: ["*"],
        }),

        // CloudWatch Logs permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "logs:CreateLogGroup",
            "logs:DeleteLogGroup",
            "logs:DescribeLogGroups",
            "logs:PutRetentionPolicy",
            "logs:DeleteRetentionPolicy",
          ],
          resources: ["*"],
        }),

        // SQS permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "sqs:CreateQueue",
            "sqs:DeleteQueue",
            "sqs:GetQueueUrl",
            "sqs:GetQueueAttributes",
            "sqs:SetQueueAttributes",
            "sqs:ListQueues",
            "sqs:TagQueue",
            "sqs:UntagQueue",
          ],
          resources: ["*"],
        }),

        // Application Load Balancer permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "elasticloadbalancing:CreateLoadBalancer",
            "elasticloadbalancing:DeleteLoadBalancer",
            "elasticloadbalancing:DescribeLoadBalancers",
            "elasticloadbalancing:CreateTargetGroup",
            "elasticloadbalancing:DeleteTargetGroup",
            "elasticloadbalancing:DescribeTargetGroups",
            "elasticloadbalancing:CreateListener",
            "elasticloadbalancing:DeleteListener",
            "elasticloadbalancing:DescribeListeners",
            "elasticloadbalancing:RegisterTargets",
            "elasticloadbalancing:DeregisterTargets",
            "elasticloadbalancing:DescribeTargetHealth",
            "elasticloadbalancing:ModifyLoadBalancerAttributes",
            "elasticloadbalancing:DescribeLoadBalancerAttributes",
          ],
          resources: ["*"],
        }),

        // Auto Scaling permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "application-autoscaling:RegisterScalableTarget",
            "application-autoscaling:DeregisterScalableTarget",
            "application-autoscaling:DescribeScalableTargets",
            "application-autoscaling:PutScalingPolicy",
            "application-autoscaling:DeleteScalingPolicy",
            "application-autoscaling:DescribeScalingPolicies",
            "application-autoscaling:DescribeScalingActivities",
          ],
          resources: ["*"],
        }),

        // STS permissions for role assumption
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: ["*"],
        }),

        // Tagging permissions
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "tag:GetResources",
            "tag:TagResources",
            "tag:UntagResources",
          ],
          resources: ["*"],
        }),
      ],
    });

    // Attach the restrictive policy instead of AdministratorAccess
    githubActionsRole.attachInlinePolicy(cdkDeploymentPolicy);

    // Output the role ARN
    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
      description: "ARN of the GitHub Actions IAM Role",
      exportName: "GitHubActionsRoleArn",
    });

    new cdk.CfnOutput(this, "GitHubRepository", {
      value: "peareasy/fc-ingestion",
      description: "GitHub repository for OIDC configuration",
    });
  }
}
