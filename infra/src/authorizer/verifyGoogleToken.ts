import type { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

const idsEnv = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '').trim();
const ALLOWED_AUDS = new Set(
  idsEnv
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean),
);

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    console.log('Authorizer invoked', { methodArn: event.methodArn });
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return deny('anonymous', event.methodArn);
    }
    const idToken = authHeader.substring('Bearer '.length);

    const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!info.ok) {
      return deny('invalid', event.methodArn);
    }
    const data = await info.json() as any;

    // Basic checks
    const aud: string | undefined = data?.aud;
    const azp: string | undefined = data?.azp;
    const allowedCheck = ALLOWED_AUDS.size === 0 || (!!aud && ALLOWED_AUDS.has(aud)) || (!!azp && ALLOWED_AUDS.has(azp));
    if (!data || !allowedCheck) {
      console.warn('Authorizer aud/azp mismatch', { aud, azp, allowed: Array.from(ALLOWED_AUDS) });
      return deny('aud-mismatch', event.methodArn);
    }
    const sub = data.sub as string | undefined;
    const email = data.email as string | undefined;
    const principalId = sub || email || 'unknown';
    console.log('Authorizer success', { principalId, aud, azp });

    return allow(principalId, event.methodArn, {
      email: email || '',
      name: data.name || '',
      picture: data.picture || '',
    });
  } catch (err) {
    console.error('Authorizer error', err);
    return deny('error', event.methodArn);
  }
};

function policy(principalId: string, effect: 'Allow' | 'Deny', resource: string, context?: Record<string, string>): APIGatewayAuthorizerResult {
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
  return policy(principalId, 'Allow', resource, context);
}
function deny(principalId: string, resource: string) {
  return policy(principalId, 'Deny', resource);
}
