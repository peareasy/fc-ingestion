# MongoDB URI GitHub Secret Setup

This document explains how to configure the MongoDB URI as a GitHub secret for secure deployment.

## Overview

The MongoDB URI is now managed through GitHub Secrets instead of being hardcoded in the infrastructure code. This provides better security and flexibility for different environments.

## Setup Instructions

### 1. Add MongoDB URI to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set the following values:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster.mongodb.net/database`)

### 2. MongoDB URI Format Examples

#### MongoDB Atlas (Recommended for Production)

```
mongodb+srv://username:password@cluster.mongodb.net/fc-ingestion?retryWrites=true&w=majority
```

#### Local MongoDB (Development)

```
mongodb://localhost:27017/fc-ingestion
```

#### MongoDB with Authentication

```
mongodb://username:password@host:port/database
```

### 3. Security Considerations

- **Never commit the MongoDB URI to version control**
- Use strong passwords for MongoDB users
- Consider using MongoDB Atlas for production environments
- Ensure your MongoDB instance is properly secured with network access controls

### 4. Environment-Specific Configuration

You can use different MongoDB URIs for different environments by:

1. Creating environment-specific secrets (e.g., `MONGODB_URI_PROD`, `MONGODB_URI_STAGING`)
2. Updating the GitHub Actions workflow to use the appropriate secret based on the deployment environment

### 5. Verification

After setting up the secret:

1. The deployment will automatically use the MongoDB URI from the secret
2. The NestJS application will connect to the specified MongoDB instance
3. You can verify the connection by checking the application logs

## Troubleshooting

### Common Issues

1. **Secret not found**: Ensure the secret name is exactly `MONGODB_URI`
2. **Connection failed**: Verify the MongoDB URI format and network access
3. **Authentication failed**: Check username/password in the connection string

### Testing Locally

For local development, you can set the environment variable:

```bash
export MONGODB_URI="your-mongodb-connection-string"
npm run deploy
```

## Related Files

- `infrastructure/lib/fc-ingestion-stack.ts` - Updated to accept MongoDB URI as parameter
- `infrastructure/bin/fc-ingestion.ts` - Reads MongoDB URI from environment variable
- `.github/workflows/deploy.yml` - Passes MongoDB URI secret to deployment
- `applications/nestjs-app/src/app.module.ts` - Uses MongoDB URI from environment variable
