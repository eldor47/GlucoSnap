// AWS Configuration for GlucoSnap
export const AWS_CONFIG = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_v4mfmQJ7v',
  userPoolWebClientId: '675o97emlkhpt14df3mcftktfa',
  identityPoolId: 'us-east-1:ca8a4427-d01d-4cf1-b954-fe04291a1c59',
  apiUrl: 'https://08o8wsyz88.execute-api.us-east-1.amazonaws.com/prod'
};

// Cognito configuration for AWS Amplify (if using)
export const amplifyConfig = {
  Auth: {
    region: AWS_CONFIG.region,
    userPoolId: AWS_CONFIG.userPoolId,
    userPoolWebClientId: AWS_CONFIG.userPoolWebClientId,
    identityPoolId: AWS_CONFIG.identityPoolId,
    authenticationFlowType: 'USER_SRP_AUTH',
  },
  API: {
    endpoints: [
      {
        name: 'GlucoSnapAPI',
        endpoint: AWS_CONFIG.apiUrl,
        region: AWS_CONFIG.region,
      },
    ],
  },
};

