import { test } from "@jest/globals";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as FcIngestion from "../lib/fc-ingestion-stack";

test("SQS Queue Created", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new FcIngestion.FcIngestionStack(app, "MyTestStack", {
    mongodbUri: "mongodb://test:27017/test",
  });
  // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::SQS::Queue", {
    VisibilityTimeout: 250,
  });
});
