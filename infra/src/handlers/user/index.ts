import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { verifyToken } from '../../utils/auth';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;

interface UpdateProfileRequest {
  givenName?: string;
  familyName?: string;
}

interface UserProfile {
  userId: string;
  email: string;
  username: string;
  givenName?: string;
  familyName?: string;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, path } = event;
    
    if (httpMethod === 'GET' && path.endsWith('/profile')) {
      return await handleGetProfile(event);
    } else if (httpMethod === 'PUT' && path.endsWith('/profile')) {
      return await handleUpdateProfile(event);
    } else {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Endpoint not found' }),
      };
    }
  } catch (error: any) {
    console.error('User profile handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      }),
    };
  }
};

async function handleGetProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Verify JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Authorization token required' }),
      };
    }

    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid or expired token' }),
      };
    }

    const userId = decodedToken.sub || decodedToken['custom:userId'];

    // Get user profile from DynamoDB
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: USER_TABLE_NAME,
      Key: marshall({ userId }),
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User profile not found' }),
      };
    }

    const userProfile = unmarshall(result.Item) as UserProfile;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Profile retrieved successfully',
        user: {
          userId: userProfile.userId,
          email: userProfile.email,
          username: userProfile.username,
          givenName: userProfile.givenName,
          familyName: userProfile.familyName,
          createdAt: userProfile.createdAt,
          updatedAt: userProfile.updatedAt,
        },
      }),
    };
  } catch (error: any) {
    console.error('Get profile error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to retrieve profile',
        error: error.message 
      }),
    };
  }
}

async function handleUpdateProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Verify JWT token
    const token = event.headers.Authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Authorization token required' }),
      };
    }

    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid or expired token' }),
      };
    }

    const userId = decodedToken.sub || decodedToken['custom:userId'];
    const body: UpdateProfileRequest = JSON.parse(event.body || '{}');

    // Validate input
    if (!body.givenName && !body.familyName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'At least one field must be provided for update' }),
      };
    }

    const now = new Date().toISOString();
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (body.givenName !== undefined) {
      updateExpression.push('#givenName = :givenName');
      expressionAttributeNames['#givenName'] = 'givenName';
      expressionAttributeValues[':givenName'] = body.givenName;
    }

    if (body.familyName !== undefined) {
      updateExpression.push('#familyName = :familyName');
      expressionAttributeNames['#familyName'] = 'familyName';
      expressionAttributeValues[':familyName'] = body.familyName;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    // Update user profile in DynamoDB
    await dynamoClient.send(new UpdateItemCommand({
      TableName: USER_TABLE_NAME,
      Key: marshall({ userId }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ConditionExpression: 'attribute_exists(userId)',
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Profile updated successfully',
        updatedFields: {
          givenName: body.givenName,
          familyName: body.familyName,
          updatedAt: now,
        },
      }),
    };
  } catch (error: any) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User profile not found' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to update profile',
        error: error.message 
      }),
    };
  }
}
