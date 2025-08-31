import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtVerifierSingleUserPool } from 'aws-jwt-verify/cognito-verifier';

let verifier: CognitoJwtVerifierSingleUserPool<{ userPoolId: string; tokenUse: 'access'; clientId: string }> | null = null;

export async function verifyToken(token: string): Promise<any> {
  try {
    if (!verifier) {
      const userPoolId = process.env.USER_POOL_ID;
      const userPoolClientId = process.env.USER_POOL_CLIENT_ID;
      
      if (!userPoolId || !userPoolClientId) {
        throw new Error('Missing Cognito configuration');
      }

      verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'access',
        clientId: userPoolClientId,
      });
    }

    const payload = await verifier.verify(token, { tokenUse: 'access' });
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function getUserIdFromToken(token: string): string | null {
  try {
    // For access tokens, we can decode without verification for basic info
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    return payload.sub || payload['custom:userId'] || null;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}
