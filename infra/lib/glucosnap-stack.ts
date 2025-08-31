import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from 'constructs';

export class GlucoSnapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool for secure authentication
    const userPool = new cognito.UserPool(this, 'GlucoSnapUserPool', {
      userPoolName: 'glucosnap-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },

        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        userId: new cognito.StringAttribute({ mutable: false }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Client for the app
    const userPoolClient = new cognito.UserPoolClient(this, 'GlucoSnapUserPoolClient', {
      userPool,
      userPoolClientName: 'glucosnap-app-client',
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        custom: false,
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30), // 30-day refresh token duration
      accessTokenValidity: cdk.Duration.hours(1),  // 1-hour access token 
      idTokenValidity: cdk.Duration.hours(1),      // 1-hour ID token
    });

    // Identity Pool for temporary AWS credentials
    const identityPool = new cognito.CfnIdentityPool(this, 'GlucoSnapIdentityPool', {
      identityPoolName: 'glucosnap-identity-pool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // DynamoDB table for user profiles and meal logs
    const userTable = new dynamodb.Table(this, 'GlucoSnapUserTable', {
      tableName: 'glucosnap-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // Add GSI for email lookups
    userTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add GSI for username lookups
    userTable.addGlobalSecondaryIndex({
      indexName: 'username-index',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB table for meal logs
    const mealLogsTable = new dynamodb.Table(this, 'GlucoSnapMealLogsTable', {
      tableName: 'glucosnap-meal-logs',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // DynamoDB table for analysis results
    const resultsTable = new dynamodb.Table(this, 'GlucoSnapResultsTable', {
      tableName: `glucosnap-analysis-results-${this.account}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // DynamoDB table for user feedback
    const feedbackTable = new dynamodb.Table(this, 'GlucoSnapFeedbackTable', {
      tableName: `glucosnap-feedback-${this.account}`,
      partitionKey: { name: 'feedbackId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // Add GSI for user feedback lookups
    feedbackTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB table for user subscriptions and usage tracking
    const subscriptionsTable = new dynamodb.Table(this, 'GlucoSnapSubscriptionsTable', {
      tableName: `glucosnap-subscriptions-${this.account}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // Add GSI for subscription lookups
    subscriptionsTable.addGlobalSecondaryIndex({
      indexName: 'subscriptionId-index',
      partitionKey: { name: 'subscriptionId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB table for usage tracking
    const usageTable = new dynamodb.Table(this, 'GlucoSnapUsageTable', {
      tableName: `glucosnap-usage-${this.account}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // S3 bucket for image uploads
    const imagesBucket = new s3.Bucket(this, 'GlucoSnapImagesBucket', {
      bucketName: `glucosnap-images-${this.account}`,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'delete-old-images',
          enabled: true,
          expiration: cdk.Duration.days(90), // Delete images after 90 days
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Lambda function for user registration
    const signUpFunction = new lambda.Function(this, 'GlucoSnapSignUpFunction', {
      functionName: 'glucosnap-signup',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/auth'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_TABLE_NAME: userTable.tableName,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-auth',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapSignUpLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-signup',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Lambda function for user sign in
    const signInFunction = new lambda.Function(this, 'GlucoSnapSignInFunction', {
      functionName: 'glucosnap-signin',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/auth'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        USER_TABLE_NAME: userTable.tableName,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-auth',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapSignInLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-signin',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Lambda function for user profile management
    const userProfileFunction = new lambda.Function(this, 'GlucoSnapUserProfileFunction', {
      functionName: 'glucosnap-user-profile',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/user'),
      environment: {
        USER_TABLE_NAME: userTable.tableName,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-user',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapUserProfileLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-user-profile',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Lambda function for meal logs
    const mealLogsFunction = new lambda.Function(this, 'GlucoSnapMealLogsFunction', {
      functionName: 'glucosnap-meal-logs-v2',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/meals'),
      environment: {
        MEAL_LOGS_TABLE_NAME: mealLogsTable.tableName,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-meals',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapMealLogsLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-meal-logs',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Grant permissions to Lambda functions
    userTable.grantReadWriteData(signUpFunction);
    userTable.grantReadWriteData(signInFunction);
    userTable.grantReadWriteData(userProfileFunction);
    mealLogsTable.grantReadWriteData(mealLogsFunction);

    // SSM Parameter for OpenAI API Key
    const openAIKeyParam = new ssm.StringParameter(this, 'GlucoSnapOpenAIKey', {
      parameterName: '/glucosnap/openai-api-key',
      stringValue: 'PLACEHOLDER_CHANGE_ME', // You need to update this manually in AWS Console
      description: 'OpenAI API key for GlucoSnap image analysis',
    });

    // Lambda function for Cognito authorization
    const cognitoAuthorizerFunction = new lambda.Function(this, 'GlucoSnapCognitoAuthorizerFunction', {
      functionName: 'glucosnap-cognito-authorizer',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'cognitoAuthorizer.handler',
      code: lambda.Code.fromAsset('dist/src/authorizer'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-authorizer',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapCognitoAuthorizerLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-cognito-authorizer',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Grant Cognito permissions
    signUpFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [userPool.userPoolArn],
    }));

    signInFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:InitiateAuth',
        'cognito-idp:RespondToAuthChallenge',
        'cognito-idp:AdminGetUser',
      ],
      resources: [userPool.userPoolArn],
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'GlucoSnapApi', {
      restApiName: 'GlucoSnap API',
      description: 'API for GlucoSnap application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // Create API Gateway authorizer using the Cognito authorizer Lambda
    const cognitoAuthorizer = new apigateway.RequestAuthorizer(this, 'GlucoSnapCognitoAuthorizer', {
      handler: cognitoAuthorizerFunction,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
      resultsCacheTtl: cdk.Duration.seconds(0), // Disable caching temporarily for testing
      authorizerName: 'GlucoSnapCognitoAuthorizer',
    });

    // Auth resource group
    const auth = api.root.addResource('auth');
    
    // Sign up endpoint
    const signUp = auth.addResource('signup');
    signUp.addMethod('POST', new apigateway.LambdaIntegration(signUpFunction));

    // Sign in endpoint
    const signIn = auth.addResource('signin');
    signIn.addMethod('POST', new apigateway.LambdaIntegration(signInFunction));

    // Refresh token endpoint
    const refresh = auth.addResource('refresh');
    refresh.addMethod('POST', new apigateway.LambdaIntegration(signInFunction));

    // User resource group
    const user = api.root.addResource('user');
    
    // User profile endpoints (protected with Cognito authorizer)
    const profile = user.addResource('profile');
    profile.addMethod('GET', new apigateway.LambdaIntegration(userProfileFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    profile.addMethod('PUT', new apigateway.LambdaIntegration(userProfileFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Meals resource group
    const meals = api.root.addResource('meals');
    
    // Meal logs endpoints (protected with Cognito authorizer)
    const mealLogs = meals.addResource('logs');
    mealLogs.addMethod('GET', new apigateway.LambdaIntegration(mealLogsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    mealLogs.addMethod('POST', new apigateway.LambdaIntegration(mealLogsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    
    const mealLog = mealLogs.addResource('{logId}');
    mealLog.addMethod('PUT', new apigateway.LambdaIntegration(mealLogsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    mealLog.addMethod('DELETE', new apigateway.LambdaIntegration(mealLogsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Lambda function for getting S3 upload URLs
    const getUploadUrlFunction = new lambda.Function(this, 'GlucoSnapGetUploadUrlFunction', {
      functionName: 'glucosnap-get-upload-url',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/upload'),
      environment: {
        BUCKET_NAME: `glucosnap-images-${this.account}`,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-uploads',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapGetUploadUrlLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-get-upload-url',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Lambda function for analyzing images
    const analyzeFunction = new lambda.Function(this, 'GlucoSnapAnalyzeFunction', {
      functionName: 'glucosnap-analyze',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/analyze'),
      environment: {
        BUCKET_NAME: `glucosnap-images-${this.account}`,
        RESULTS_TABLE: `glucosnap-analysis-results-${this.account}`,
        OPENAI_API_KEY_SSM_PARAM: '/glucosnap/openai-api-key',
        POWERTOOLS_SERVICE_NAME: 'glucosnap-analyze',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      logGroup: new logs.LogGroup(this, 'GlucoSnapAnalyzeLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-analyze',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Lambda function for handling feedback
    const feedbackFunction = new lambda.Function(this, 'GlucoSnapFeedbackFunction', {
      functionName: 'glucosnap-feedback',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/feedback'),
      environment: {
        FEEDBACK_TABLE_NAME: `glucosnap-feedback-${this.account}`,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-feedback',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapFeedbackLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-feedback',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Lambda function for handling subscriptions and usage tracking
    const subscriptionsFunction = new lambda.Function(this, 'GlucoSnapSubscriptionsFunction', {
      functionName: 'glucosnap-subscriptions',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/src/handlers/subscriptions'),
      environment: {
        SUBSCRIPTIONS_TABLE_NAME: `glucosnap-subscriptions-${this.account}`,
        USAGE_TABLE_NAME: `glucosnap-usage-${this.account}`,
        POWERTOOLS_SERVICE_NAME: 'glucosnap-subscriptions',
        LOG_LEVEL: 'INFO',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'GlucoSnapSubscriptionsLogGroup', {
        logGroupName: '/aws/lambda/glucosnap-subscriptions',
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Grant S3 permissions to upload function
    imagesBucket.grantReadWrite(getUploadUrlFunction);
    
    // Grant S3 and DynamoDB permissions to analyze function
    imagesBucket.grantRead(analyzeFunction);
    resultsTable.grantReadWriteData(analyzeFunction);
    
    // Grant DynamoDB permissions to feedback function
    feedbackTable.grantReadWriteData(feedbackFunction);
    
    // Grant DynamoDB permissions to subscriptions function
    subscriptionsTable.grantReadWriteData(subscriptionsFunction);
    usageTable.grantReadWriteData(subscriptionsFunction);
    
    // Grant SSM permissions to analyze function for OpenAI API key
    analyzeFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameter'],
      resources: [openAIKeyParam.parameterArn],
    }));

    // Uploads endpoint (protected with Cognito authorizer)
    const uploads = api.root.addResource('uploads');
    uploads.addMethod('POST', new apigateway.LambdaIntegration(getUploadUrlFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Analyze endpoint (protected with Cognito authorizer) 
    const analyze = api.root.addResource('analyze');
    analyze.addMethod('POST', new apigateway.LambdaIntegration(analyzeFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Feedback endpoint (protected with Cognito authorizer)
    const feedback = api.root.addResource('feedback');
    feedback.addMethod('POST', new apigateway.LambdaIntegration(feedbackFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Subscriptions resource group
    const subscriptions = api.root.addResource('subscriptions');
    
    // Subscription status endpoint
    const status = subscriptions.addResource('status');
    status.addMethod('GET', new apigateway.LambdaIntegration(subscriptionsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    
    // Upgrade to premium endpoint
    const upgrade = subscriptions.addResource('upgrade');
    upgrade.addMethod('POST', new apigateway.LambdaIntegration(subscriptionsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    
    // Usage tracking endpoint
    const usage = subscriptions.addResource('usage');
    usage.addMethod('POST', new apigateway.LambdaIntegration(subscriptionsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });
    usage.addMethod('GET', new apigateway.LambdaIntegration(subscriptionsFunction), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserTableName', {
      value: userTable.tableName,
      description: 'DynamoDB User Table Name',
    });

    new cdk.CfnOutput(this, 'MealLogsTableName', {
      value: mealLogsTable.tableName,
      description: 'DynamoDB Meal Logs Table Name',
    });

    new cdk.CfnOutput(this, 'ResultsTableName', {
      value: resultsTable.tableName,
      description: 'DynamoDB Analysis Results Table Name',
    });

    new cdk.CfnOutput(this, 'FeedbackTableName', {
      value: feedbackTable.tableName,
      description: 'DynamoDB Feedback Table Name',
    });

    new cdk.CfnOutput(this, 'SubscriptionsTableName', {
      value: subscriptionsTable.tableName,
      description: 'DynamoDB Subscriptions Table Name',
    });

    new cdk.CfnOutput(this, 'UsageTableName', {
      value: usageTable.tableName,
      description: 'DynamoDB Usage Table Name',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      description: 'S3 Images Bucket Name',
    });
  }
}
