#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { GitHubActionsOidcStack } from "../lib/github-actions-oidc-stack";

const app = new cdk.App();

new GitHubActionsOidcStack(app, "GitHubActionsOidcStack", {
  env: {
    account: "120099621477",
    region: "eu-west-1",
  },
});
