import type { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoJwtVerifierSingleUserPool } from 'aws-jwt-verify/cognito-verifier';

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
  throw new Error('USER_POOL_ID and USER_POOL_CLIENT_ID environment variables are required');
}

// Create the Cognito JWT verifier
let verifier: CognitoJwtVerifierSingleUserPool<{ userPoolId: string; tokenUse: 'access'; clientId: string }> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID!,
      tokenUse: 'access',
      clientId: USER_POOL_CLIENT_ID!,
    });
  }
  return verifier;
}

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log('Cognito Authorizer invoked', { methodArn: event.methodArn });
    
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid Authorization header found');
      return deny('anonymous', event.methodArn);
    }
    
    const accessToken = authHeader.substring('Bearer '.length);
    
    try {
      // Verify the Cognito access token
      const payload = await getVerifier().verify(accessToken, { tokenUse: 'access' });
      
      console.log('Token verification successful', { 
        sub: payload.sub, 
        username: payload.username,
        email: payload.email,
        clientId: payload.client_id 
      });
      
      // Debug: Log all available fields in the JWT payload
      console.log('JWT payload fields:', Object.keys(payload));
      console.log('JWT payload values:', payload);
      
      const principalId = payload.sub || payload.username || 'unknown';
      
      return allow(principalId, event.methodArn, {
        userId: payload.sub || '',
        username: payload.username || '',
        email: String(payload.email || ''),
        clientId: payload.client_id || '',
        tokenUse: payload.token_use || '',
      });
    } catch (verifyError) {
      console.warn('Token verification failed', verifyError);
      return deny('invalid-token', event.methodArn);
    }
  } catch (err) {
    console.error('Authorizer error', err);
    return deny('error', event.methodArn);
  }
};

function policy(
  principalId: string, 
  effect: 'Allow' | 'Deny', 
  resource: string, 
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  } as APIGatewayAuthorizerResult;
}

function allow(principalId: string, resource: string, context?: Record<string, string>) {
  // Grant access to all API endpoints for authenticated users
  // Convert specific resource ARN to wildcard pattern
  // e.g., arn:aws:execute-api:us-east-1:123456789012:abcdefghij/prod/POST/uploads
  // becomes arn:aws:execute-api:us-east-1:123456789012:abcdefghij/prod/*/*
  const resourceParts = resource.split('/');
  const wildcardResource = resourceParts.slice(0, -2).join('/') + '/*/*';
  
  return policy(principalId, 'Allow', wildcardResource, context);
}

function deny(principalId: string, resource: string) {
  return policy(principalId, 'Deny', resource);
}

