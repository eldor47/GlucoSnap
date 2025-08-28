import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { LambdaIntegration, RestApi, RequestAuthorizer, IdentitySource, AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';

export class GlucoSnapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const openaiApiKeyParamName = this.node.tryGetContext('openaiApiKeyParamName') || '/glucosnap/openai/apiKey';
    const googleClientIdsCtx =
      this.node.tryGetContext('googleClientIds') ||
      this.node.tryGetContext('googleClientId') ||
      '673538605636-8k93n960rop48g5v4kpvlq8jcgi295ab.apps.googleusercontent.com';

    const imagesBucket = new Bucket(this, 'ImagesBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: false,
    });

    const resultsTable = new Table(this, 'ResultsTable', {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'analysisId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const authorizerFn = new NodejsFunction(this, 'GoogleAuthorizerFn', {
      entry: path.join(__dirname, '..', 'src', 'authorizer', 'verifyGoogleToken.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      logRetention: RetentionDays.ONE_WEEK,
      timeout: Duration.seconds(10),
      environment: {
        GOOGLE_CLIENT_IDS: String(googleClientIdsCtx),
      },
    });

    const api = new RestApi(this, 'Api', {
      restApiName: 'GlucoSnapApi',
      deployOptions: {
        stageName: 'prod',
      },
    });

    const requestAuthorizer = new RequestAuthorizer(this, 'RequestAuthorizer', {
      handler: authorizerFn,
      identitySources: [IdentitySource.header('Authorization')],
      resultsCacheTtl: Duration.seconds(60),
    });

    const getUploadUrlFn = new NodejsFunction(this, 'GetUploadUrlFn', {
      entry: path.join(__dirname, '..', 'src', 'handlers', 'getUploadUrl.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      logRetention: RetentionDays.ONE_WEEK,
      timeout: Duration.seconds(10),
      environment: {
        BUCKET_NAME: imagesBucket.bucketName,
      },
    });
    imagesBucket.grantPut(getUploadUrlFn);

    const analyzeFn = new NodejsFunction(this, 'AnalyzeFn', {
      entry: path.join(__dirname, '..', 'src', 'handlers', 'analyze.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      logRetention: RetentionDays.ONE_WEEK,
      timeout: Duration.seconds(25),
      environment: {
        BUCKET_NAME: imagesBucket.bucketName,
        RESULTS_TABLE: resultsTable.tableName,
        OPENAI_API_KEY_SSM_PARAM: openaiApiKeyParamName,
      },
    });
    imagesBucket.grantRead(analyzeFn);
    resultsTable.grantWriteData(analyzeFn);
    analyzeFn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: ['*'],
      }),
    );

    const v1 = api.root.addResource('v1');
    const uploads = v1.addResource('uploads');
    uploads.addMethod('POST', new LambdaIntegration(getUploadUrlFn), {
      authorizer: requestAuthorizer,
      authorizationType: AuthorizationType.CUSTOM,
      apiKeyRequired: false,
    });

    const analyze = v1.addResource('analyze');
    analyze.addMethod('POST', new LambdaIntegration(analyzeFn), {
      authorizer: requestAuthorizer,
      authorizationType: AuthorizationType.CUSTOM,
      apiKeyRequired: false,
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url ?? '' });
    new cdk.CfnOutput(this, 'BucketName', { value: imagesBucket.bucketName });
    new cdk.CfnOutput(this, 'TableName', { value: resultsTable.tableName });
  }
}
