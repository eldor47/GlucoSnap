import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.BUCKET_NAME!;
const s3 = new S3Client({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userEmail = (event.requestContext.authorizer as any)?.email || 'unknown@user';
    console.log('getUploadUrl invoked', {
      principalId: (event.requestContext.authorizer as any)?.principalId,
      email: userEmail,
      resource: event.requestContext.resourcePath,
      path: event.rawPath,
      stage: event.requestContext.stage,
    });
    const body = event.body ? JSON.parse(event.body) : {};
    const contentType = body.contentType || 'image/jpeg';
    const now = new Date();
    const key = `${sanitize(userEmail)}/${now.toISOString().slice(0,10)}/${randomUUID()}` + extFromContentType(contentType);

    const putCmd = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 });

    const response = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, uploadUrl }),
    };
    console.log('getUploadUrl success', { key });
    return response;
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Failed to create upload URL' };
  }
};

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9@._-]/g, '_');
}
function extFromContentType(ct: string) {
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('heic')) return '.heic';
  return '.jpg';
}
