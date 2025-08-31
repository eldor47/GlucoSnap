import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const BUCKET_NAME = process.env.BUCKET_NAME;
const s3 = new S3Client({});

export const handler = async (event: any) => {
  try {
    // Extract user info from authorizer context
    const userId = event.requestContext.authorizer?.principalId || 'unknown';
    const username = event.requestContext.authorizer?.username || '';
    
    // Since email is not available in JWT token, use username as primary identifier
    let userEmail = username || 'unknown';
    
    // If username doesn't look like an email, construct one
    if (userEmail && !userEmail.includes('@')) {
      userEmail = `${userEmail}@user`;
    }
    
    // Fallback: if no username, use userId
    if (!userEmail || userEmail === 'unknown') {
      if (userId && userId !== 'unknown') {
        userEmail = `${userId}@user`;
      } else {
        userEmail = 'unknown@user'; // Last resort
      }
    }
    
    console.log('getUploadUrl invoked', {
      userId,
      email: userEmail,
      username,
      resource: event.requestContext.resourcePath,
      path: event.path,
      stage: event.requestContext.stage,
    });
    
    // Debug: Log the entire authorizer context to see what's available
    console.log('Authorizer context:', {
      authorizer: event.requestContext.authorizer,
      principalId: event.requestContext.authorizer?.principalId,
      email: event.requestContext.authorizer?.email,
      userId: event.requestContext.authorizer?.userId,
      username: event.requestContext.authorizer?.username,
    });

    const body = event.body ? JSON.parse(event.body) : {};
    const contentType = body.contentType || 'image/jpeg';
    
    const now = new Date();
    const key = `${sanitize(userEmail)}/${now.toISOString().slice(0, 10)}/${randomUUID()}${extFromContentType(contentType)}`;
    
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

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

function extFromContentType(ct: string): string {
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('heic')) return '.heic';
  return '.jpg';
}
