# FC Ingestion Monorepo

A monorepo containing infrastructure and applications for FC data ingestion pipeline.

## 🏗️ Project Structure

```
fc-ingestion/
├── infrastructure/           # AWS CDK Infrastructure as Code
│   ├── bin/                 # CDK App entry point
│   ├── lib/                 # CDK Stack definitions
│   ├── test/                # Infrastructure tests
│   └── package.json         # Infrastructure dependencies
├── applications/            # Application code
│   └── nestjs-app/         # NestJS API application
│       ├── src/            # Application source code
│       └── package.json    # Application dependencies
├── shared/                  # Shared utilities and types
│   ├── src/                # Shared source code
│   └── package.json        # Shared dependencies
└── package.json            # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- AWS CLI configured

### Installation

```bash
# Install all dependencies
npm install

# Build all packages
npm run build
```

### Development

#### Infrastructure

```bash
# Deploy infrastructure
npm run deploy

# View infrastructure changes
npm run diff

# Synthesize CloudFormation
npm run synth
```

#### NestJS Application

```bash
# Start development server
cd applications/nestjs-app
npm run start:dev
```

#### Shared Package

```bash
# Build shared types
cd shared
npm run build
```

## 📦 Workspaces

### Infrastructure (`@fc-ingestion/infrastructure`)

- AWS CDK stacks for data ingestion pipeline
- SQS queues, Lambda functions, and other AWS resources
- Infrastructure testing with Jest

### NestJS App (`@fc-ingestion/nestjs-app`)

- REST API for data ingestion
- Built with NestJS framework
- Handles data processing and queue management

### Shared (`@fc-ingestion/shared`)

- Common types and utilities
- Shared across all applications
- TypeScript definitions for data models

## 🔧 Available Scripts

- `npm run build` - Build all packages
- `npm run test` - Run tests across all packages
- `npm run clean` - Clean build artifacts
- `npm run deploy` - Deploy infrastructure
- `npm run diff` - Show infrastructure changes
- `npm run synth` - Synthesize CloudFormation

## 🚀 CI/CD with GitHub Actions

This project includes GitHub Actions for automated deployments using OIDC for secure AWS authentication with **least-privilege permissions**.

### Quick Setup

1. **Deploy OIDC Infrastructure**:

   ```bash
   ./scripts/setup-github-actions.sh
   ```

2. **Configure GitHub Secrets**:

   - Go to repository Settings > Secrets and variables > Actions
   - Add `AWS_ROLE_ARN` and `AWS_ACCOUNT_ID` from the setup script

3. **Update Repository Name**:

   - Edit `.github/workflows/deploy.yml`
   - Replace `your-username/fc-ingestion` with your actual repository name

4. **Push to Deploy**:
   ```bash
   git push origin main
   ```

For detailed setup instructions, see [GitHub Actions Setup Guide](docs/github-actions-setup.md).

## 🏛️ Architecture

The monorepo follows a clean architecture approach:

1. **Infrastructure Layer**: AWS CDK defines all cloud resources
2. **Application Layer**: NestJS API handles business logic
3. **Shared Layer**: Common types and utilities

## 📝 Development Guidelines

1. Use workspace dependencies for cross-package references
2. Keep shared types in the `shared` package
3. Test infrastructure changes before deployment
4. Follow TypeScript strict mode guidelines
