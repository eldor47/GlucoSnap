import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const FEEDBACK_TABLE_NAME = process.env.FEEDBACK_TABLE_NAME || 'glucosnap-feedback';

interface FeedbackRequest {
  type: 'positive' | 'negative';
  text?: string;
  imageUri: string;
  result: any;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user info from authorizer context
    const userId = event.requestContext.authorizer?.principalId || 'unknown';
    const email = event.requestContext.authorizer?.email || '';
    
    console.log('Feedback handler invoked', {
      userId,
      email,
      resource: event.requestContext.resourcePath,
      path: event.path,
      stage: event.requestContext.stage,
    });

    const body: FeedbackRequest = JSON.parse(event.body || '{}');
    
    // Validate input
    if (!body.type || !body.imageUri || !body.result) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Type, imageUri, and result are required' }),
      };
    }

    if (!['positive', 'negative'].includes(body.type)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Type must be positive or negative' }),
      };
    }

    const feedbackId = uuidv4();
    const now = new Date().toISOString();

    const feedbackItem = {
      feedbackId,
      userId,
      type: body.type,
      text: body.text || '',
      imageUri: body.imageUri,
      result: body.result,
      createdAt: now,
    };

    await dynamoClient.send(new PutItemCommand({
      TableName: FEEDBACK_TABLE_NAME,
      Item: marshall(feedbackItem),
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Feedback submitted successfully',
        feedbackId,
      }),
    };
  } catch (error: any) {
    console.error('Feedback handler error:', error);
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
