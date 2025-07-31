#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FcIngestionStack } from "../lib/fc-ingestion-stack";
import { GitHubActionsOidcStack } from "../lib/github-actions-oidc-stack";

const app = new cdk.App();

// Get MongoDB URI from environment variable
const mongodbUri = process.env.MONGODB_URI;
if (!mongodbUri) {
  throw new Error("MONGODB_URI environment variable is required");
}

// Deploy OIDC stack first (if needed)
// if (true) {
//   new GitHubActionsOidcStack(app, "GitHubActionsOidcStack", {
//     env: {
//       account: "120099621477",
//       region: "eu-west-1",
//     },
//   });
// }

// Main application stack
new FcIngestionStack(app, "FcIngestionStack", {
  env: {
    account: "120099621477",
    region: "eu-west-1",
  },
  mongodbUri,
});
