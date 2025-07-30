# GitHub Actions Setup with OIDC

This guide explains how to set up GitHub Actions for secure AWS deployments using OpenID Connect (OIDC) instead of long-lived credentials.

## 🔐 Why OIDC?

- **Security**: No long-lived AWS credentials stored in GitHub
- **Principle of Least Privilege**: Temporary credentials with specific permissions
- **Audit Trail**: All actions are logged with session information
- **Automatic Rotation**: Credentials are automatically rotated for each workflow run

## 🚀 Quick Setup

### 1. Deploy OIDC Infrastructure

Run the setup script to create the necessary AWS resources:

```bash
./scripts/setup-github-actions.sh
```

This script will:

- Create an OIDC Identity Provider for GitHub
- Create an IAM Role for GitHub Actions
- Output the role ARN and account ID

### 2. Configure GitHub Repository Secrets

Go to your GitHub repository:

1. Navigate to **Settings** > **Secrets and variables** > **Actions**
2. Add the following repository secrets:

| Secret Name      | Value                                                         | Description                    |
| ---------------- | ------------------------------------------------------------- | ------------------------------ |
| `AWS_ROLE_ARN`   | `arn:aws:iam::123456789012:role/GitHubActionsFcIngestionRole` | IAM Role ARN from setup script |
| `AWS_ACCOUNT_ID` | `123456789012`                                                | Your AWS Account ID            |

### 3. Update Repository Name

Edit `.github/workflows/deploy.yml` and replace:

```yaml
"token.actions.githubusercontent.com:sub": `repo:your-username/fc-ingestion:*`
```

With your actual repository name:

```yaml
"token.actions.githubusercontent.com:sub": `repo:sebastianspecht/fc-ingestion:*`
```

### 4. Push and Deploy

Commit and push your changes to trigger the first deployment:

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

## 🔧 Workflow Details

### Jobs

1. **Test Job**: Runs on all pushes and PRs

   - Installs dependencies
   - Builds all packages
   - Runs tests

2. **Build and Deploy Job**: Runs only on main branch
   - Assumes AWS role using OIDC
   - Deploys infrastructure using CDK
   - Verifies deployment

### Security Features

- **OIDC Authentication**: Uses GitHub's OIDC provider
- **Role Assumption**: Temporary credentials with specific permissions
- **Branch Protection**: Only deploys from main branch
- **Verification**: Tests deployment after completion

## 🛡️ Security Best Practices

### IAM Role Permissions

The setup creates a role with **least-privilege permissions** specifically for CDK deployment. The policy includes only the necessary permissions for:

- **CloudFormation**: Stack management
- **ECR**: Docker image management
- **ECS**: Container orchestration
- **EC2**: VPC, security groups, networking
- **IAM**: Service role creation and management
- **CloudWatch Logs**: Log group management
- **SQS**: Queue management
- **Application Load Balancer**: Load balancer management
- **Auto Scaling**: Scaling policy management
- **STS**: Role assumption
- **Tagging**: Resource tagging

This follows the principle of least privilege and provides better security than using `AdministratorAccess`.

### Repository Security

1. **Branch Protection**: Enable branch protection on main
2. **Required Reviews**: Require PR reviews before merging
3. **Status Checks**: Require status checks to pass before merging

### Workflow Security

- **Minimal Permissions**: Only `id-token: write` and `contents: read`
- **No Secrets in Logs**: Sensitive data is masked automatically
- **Temporary Credentials**: Credentials expire after 1 hour

## 🔍 Troubleshooting

### Common Issues

1. **Role Assumption Fails**

   - Check repository name in OIDC stack
   - Verify role ARN in GitHub secrets
   - Ensure branch name matches condition

2. **Permission Denied**

   - Check IAM role permissions
   - Verify OIDC provider configuration
   - Check CloudFormation stack status

3. **Deployment Fails**
   - Check CDK logs in GitHub Actions
   - Verify AWS region configuration
   - Check ECS service status

### Debug Commands

```bash
# Check OIDC provider
aws iam list-open-id-connect-providers

# Check role trust policy
aws iam get-role --role-name GitHubActionsFcIngestionRole

# Check CloudFormation stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
```

## 📚 Additional Resources

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS OIDC Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html)
- [CDK GitHub Actions Example](https://github.com/aws-samples/aws-cdk-examples/tree/main/typescript/github-actions-oidc)

## 🔄 Manual Setup (Alternative)

If you prefer to set up OIDC manually:

1. **Create OIDC Provider**:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. **Create IAM Role** with trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-username/fc-ingestion:*"
        }
      }
    }
  ]
}
```

3. **Attach Policies** to the role for CDK deployment permissions:

```bash
# For production, use a custom policy with least-privilege permissions
# The CDK stack automatically creates this policy with specific permissions
# for CloudFormation, ECR, ECS, EC2, IAM, CloudWatch Logs, SQS, ALB, and Auto Scaling

# If you need to create a custom policy manually, you can reference the
# permissions defined in infrastructure/lib/github-actions-oidc-stack.ts
```
