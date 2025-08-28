#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GlucoSnapStack } from '../lib/glucosnap-stack';

const app = new cdk.App();

const stackName = app.node.tryGetContext('stackName') || 'GlucoSnap';

new GlucoSnapStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
