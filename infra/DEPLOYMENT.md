# GlucoSnap Infrastructure Deployment Guide

This guide will walk you through deploying the complete GlucoSnap infrastructure using AWS CDK.

## Prerequisites

1. **AWS CLI** installed and configured with appropriate credentials
2. **Node.js** (version 18 or later)
3. **AWS CDK** CLI installed globally: `npm install -g aws-cdk`
4. **Docker** (for Lambda function builds)

## Architecture Overview

The infrastructure includes:
- **AWS Cognito User Pool** - Secure user authentication and management
- **DynamoDB Tables** - User profiles and meal logs storage
- **Lambda Functions** - Serverless API handlers
- **API Gateway** - RESTful API endpoints
- **IAM Roles** - Secure permissions

## Deployment Steps

### 1. Install Dependencies

```bash
cd infra
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Bootstrap CDK (First time only)

```bash
cdk bootstrap
```

### 4. Deploy the Stack

```bash
cdk deploy
```

During deployment, you'll be prompted to:
- Confirm the IAM role changes
- Approve the security group changes
- Confirm the deployment

### 5. Note the Outputs

After successful deployment, note the following outputs:
- **UserPoolId** - Cognito User Pool ID
- **UserPoolClientId** - Cognito User Pool Client ID
- **IdentityPoolId** - Cognito Identity Pool ID
- **ApiUrl** - API Gateway base URL
- **UserTableName** - DynamoDB user table name
- **MealLogsTableName** - DynamoDB meal logs table name

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login

### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile

### Meal Logs
- `GET /meals/logs` - Get user's meal logs
- `POST /meals/logs` - Create new meal log
- `PUT /meals/logs/{logId}` - Update meal log
- `DELETE /meals/logs/{logId}` - Delete meal log

## Security Features

### Cognito User Pool
- **Password Policy**: 8+ characters, uppercase, lowercase, numbers, symbols
- **MFA**: Optional (SMS and TOTP)
- **Email Verification**: Required
- **Account Recovery**: Email-based

### API Security
- **JWT Token Verification**: All protected endpoints require valid tokens
- **CORS**: Configured for cross-origin requests
- **IAM**: Least privilege access to AWS resources

## Testing the Deployment

### 1. Test User Registration

```bash
curl -X POST https://[API_ID].execute-api.[REGION].amazonaws.com/prod/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

### 2. Test User Login

```bash
curl -X POST https://[API_ID].execute-api.[REGION].amazonaws.com/prod/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### 3. Test Protected Endpoint

```bash
curl -X GET https://[API_ID].execute-api.[REGION].amazonaws.com/prod/user/profile \
  -H "Authorization: Bearer [ACCESS_TOKEN]"
```

## Updating the App Configuration

After deployment, update your app's configuration:

1. **Update `app.json`** with the new API URL
2. **Update environment variables** if needed
3. **Test authentication flow** in your app

## Monitoring and Troubleshooting

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/glucosnap-*`
- API Gateway logs: Available in CloudWatch

### Common Issues
1. **CORS errors**: Check API Gateway CORS configuration
2. **Authentication failures**: Verify Cognito configuration
3. **Permission errors**: Check IAM roles and policies

## Cleanup

To remove all resources:

```bash
cdk destroy
```

**Warning**: This will delete all data and resources. Make sure to backup any important data first.

## Cost Optimization

- **DynamoDB**: Pay-per-request billing (cost-effective for low to medium traffic)
- **Lambda**: Pay only for execution time
- **API Gateway**: Pay per API call
- **Cognito**: Free tier includes 50,000 MAUs

## Next Steps

1. **Set up monitoring** with CloudWatch alarms
2. **Configure backup** for DynamoDB tables
3. **Set up CI/CD** for automated deployments
4. **Add custom domain** for API Gateway
5. **Implement rate limiting** if needed

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review CDK deployment output
3. Verify AWS service quotas
4. Check IAM permissions
