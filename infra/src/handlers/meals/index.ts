import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { verifyToken } from '../../utils/auth';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const MEAL_LOGS_TABLE_NAME = process.env.MEAL_LOGS_TABLE_NAME!;

interface CreateMealLogRequest {
  imageUri: string;
  carbs: number | null;
  text: string;
  createdAt?: string;
}

interface UpdateMealLogRequest {
  carbs?: number | null;
  text?: string;
}

interface MealLog {
  logId: string;
  userId: string;
  imageUri: string;
  carbs: number | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, path } = event;
    
    if (httpMethod === 'GET' && path.endsWith('/logs')) {
      return await handleGetLogs(event);
    } else if (httpMethod === 'POST' && path.endsWith('/logs')) {
      return await handleCreateLog(event);
    } else if (httpMethod === 'PUT' && path.includes('/logs/')) {
      return await handleUpdateLog(event);
    } else if (httpMethod === 'DELETE' && path.includes('/logs/')) {
      return await handleDeleteLog(event);
    } else {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Endpoint not found' }),
      };
    }
  } catch (error: any) {
    console.error('Meal logs handler error:', error);
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

async function handleGetLogs(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

    // Get meal logs from DynamoDB
    const result = await dynamoClient.send(new QueryCommand({
      TableName: MEAL_LOGS_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({ ':userId': userId }),
      ScanIndexForward: false, // Sort by createdAt descending (newest first)
    }));

    const logs = result.Items?.map(item => unmarshall(item)) as MealLog[] || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Logs retrieved successfully',
        logs,
        count: logs.length,
      }),
    };
  } catch (error: any) {
    console.error('Get logs error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to retrieve logs',
        error: error.message 
      }),
    };
  }
}

async function handleCreateLog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
    const body: CreateMealLogRequest = JSON.parse(event.body || '{}');

    // Validate input
    if (!body.imageUri || body.text === undefined) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Image URI and text are required' }),
      };
    }

    const logId = uuidv4();
    const now = new Date().toISOString();
    const createdAt = body.createdAt || now;

    const mealLog: MealLog = {
      logId,
      userId,
      imageUri: body.imageUri,
      carbs: body.carbs,
      text: body.text,
      createdAt,
      updatedAt: now,
    };

    // Store meal log in DynamoDB
    await dynamoClient.send(new PutItemCommand({
      TableName: MEAL_LOGS_TABLE_NAME,
      Item: marshall(mealLog),
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Meal log created successfully',
        log: mealLog,
      }),
    };
  } catch (error: any) {
    console.error('Create log error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to create meal log',
        error: error.message 
      }),
    };
  }
}

async function handleUpdateLog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
    const logId = event.pathParameters?.logId;
    const body: UpdateMealLogRequest = JSON.parse(event.body || '{}');

    if (!logId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Log ID is required' }),
      };
    }

    // Validate input
    if (body.carbs === undefined && body.text === undefined) {
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

    if (body.carbs !== undefined) {
      updateExpression.push('#carbs = :carbs');
      expressionAttributeNames['#carbs'] = 'carbs';
      expressionAttributeValues[':carbs'] = body.carbs;
    }

    if (body.text !== undefined) {
      updateExpression.push('#text = :text');
      expressionAttributeNames['#text'] = 'text';
      expressionAttributeValues[':text'] = body.text;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    // Update meal log in DynamoDB
    await dynamoClient.send(new UpdateItemCommand({
      TableName: MEAL_LOGS_TABLE_NAME,
      Key: marshall({ userId, createdAt: logId }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(createdAt)',
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Meal log updated successfully',
        updatedFields: {
          carbs: body.carbs,
          text: body.text,
          updatedAt: now,
        },
      }),
    };
  } catch (error: any) {
    console.error('Update log error:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Meal log not found' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to update meal log',
        error: error.message 
      }),
    };
  }
}

async function handleDeleteLog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
    const logId = event.pathParameters?.logId;

    if (!logId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Log ID is required' }),
      };
    }

    // Delete meal log from DynamoDB
    await dynamoClient.send(new DeleteItemCommand({
      TableName: MEAL_LOGS_TABLE_NAME,
      Key: marshall({ userId, createdAt: logId }),
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(createdAt)',
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Meal log deleted successfully',
      }),
    };
  } catch (error: any) {
    console.error('Delete log error:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Meal log not found' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to delete meal log',
        error: error.message 
      }),
    };
  }
}
