import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE_NAME || 'glucosnap-subscriptions';
const USAGE_TABLE = process.env.USAGE_TABLE_NAME || 'glucosnap-usage';

interface Subscription {
  userId: string;
  subscriptionId: string;
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

interface UsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD format
  scansUsed: number;
  scansLimit: number;
  adsWatched: number;
  lastScanAt?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, path } = event;
    
    if (httpMethod === 'GET' && path.endsWith('/status')) {
      return await handleGetSubscriptionStatus(event);
    } else if (httpMethod === 'POST' && path.endsWith('/upgrade')) {
      return await handleUpgradeToPremium(event);
    } else if (httpMethod === 'POST' && path.endsWith('/usage')) {
      return await handleTrackUsage(event);
    } else if (httpMethod === 'GET' && path.endsWith('/usage')) {
      return await handleGetUsage(event);
    } else {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Endpoint not found' }),
      };
    }
  } catch (error: any) {
    console.error('Subscriptions handler error:', error);
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

async function handleGetSubscriptionStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer?.principalId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    // Get subscription status
    const subscriptionResult = await dynamoClient.send(new GetItemCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: marshall({ userId }),
    }));

    // Get today's usage
    const today = new Date().toISOString().slice(0, 10);
    const usageResult = await dynamoClient.send(new GetItemCommand({
      TableName: USAGE_TABLE,
      Key: marshall({ userId, date: today }),
    }));

    const subscription = subscriptionResult.Item ? unmarshall(subscriptionResult.Item) as Subscription : null;
    const usage = usageResult.Item ? unmarshall(usageResult.Item) as UsageRecord : null;

    // Default to free plan if no subscription exists
    const plan = subscription?.plan || 'free';
    const scansUsed = usage?.scansUsed || 0;
    const scansLimit = plan === 'premium' ? 999999 : 10; // Premium: unlimited, Free: 10/day
    const remainingScans = Math.max(0, scansLimit - scansUsed);
    const canScan = plan === 'premium' || remainingScans > 0;
    const requiresAd = plan === 'free' && remainingScans > 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan,
        status: subscription?.status || 'active',
        scansUsed,
        scansLimit,
        remainingScans,
        canScan,
        requiresAd,
        subscriptionId: subscription?.subscriptionId,
        currentPeriodEnd: subscription?.currentPeriodEnd,
      }),
    };
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to get subscription status',
        error: error.message 
      }),
    };
  }
}

async function handleUpgradeToPremium(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer?.principalId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { subscriptionId, plan = 'premium' } = body;

    if (!subscriptionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Subscription ID is required' }),
      };
    }

    const now = new Date().toISOString();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

    const subscription: Subscription = {
      userId,
      subscriptionId,
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    await dynamoClient.send(new PutItemCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: marshall(subscription),
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Successfully upgraded to premium',
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      }),
    };
  } catch (error: any) {
    console.error('Upgrade to premium error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to upgrade to premium',
        error: error.message 
      }),
    };
  }
}

async function handleTrackUsage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer?.principalId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, adWatched = false } = body;

    if (!action || !['scan', 'ad_watched'].includes(action)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Valid action is required (scan or ad_watched)' }),
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    // Get current usage
    const usageResult = await dynamoClient.send(new GetItemCommand({
      TableName: USAGE_TABLE,
      Key: marshall({ userId, date: today }),
    }));

    let usage: UsageRecord;
    if (usageResult.Item) {
      usage = unmarshall(usageResult.Item) as UsageRecord;
      
      // Update existing usage
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      
      if (action === 'scan') {
        updateExpressions.push('scansUsed = scansUsed + :inc');
        expressionAttributeValues[':inc'] = 1;
        updateExpressions.push('lastScanAt = :now');
        expressionAttributeValues[':now'] = now;
      }
      
      if (action === 'ad_watched' || adWatched) {
        updateExpressions.push('adsWatched = adsWatched + :inc');
        expressionAttributeValues[':inc'] = 1;
      }
      
      updateExpressions.push('updatedAt = :now');
      expressionAttributeValues[':now'] = now;
      
      await dynamoClient.send(new UpdateItemCommand({
        TableName: USAGE_TABLE,
        Key: marshall({ userId, date: today }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
      }));
    } else {
      // Create new usage record
      usage = {
        userId,
        date: today,
        scansUsed: action === 'scan' ? 1 : 0,
        scansLimit: 10, // Default to free plan limit
        adsWatched: action === 'ad_watched' || adWatched ? 1 : 0,
        lastScanAt: action === 'scan' ? now : undefined,
      };
      
      await dynamoClient.send(new PutItemCommand({
        TableName: USAGE_TABLE,
        Item: marshall(usage),
      }));
    }

    // Get updated subscription status
    const subscriptionResult = await dynamoClient.send(new GetItemCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: marshall({ userId }),
    }));

    const subscription = subscriptionResult.Item ? unmarshall(subscriptionResult.Item) as Subscription : null;
    const plan = subscription?.plan || 'free';
    const scansLimit = plan === 'premium' ? 999999 : 10;
    const remainingScans = Math.max(0, scansLimit - (usage.scansUsed + (action === 'scan' ? 1 : 0)));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Usage tracked successfully',
        usage: {
          scansUsed: usage.scansUsed + (action === 'scan' ? 1 : 0),
          scansLimit,
          remainingScans,
          adsWatched: usage.adsWatched + (action === 'ad_watched' || adWatched ? 1 : 0),
        },
        canContinue: plan === 'premium' || remainingScans > 0,
      }),
    };
  } catch (error: any) {
    console.error('Track usage error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to track usage',
        error: error.message 
      }),
    };
  }
}

async function handleGetUsage(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.requestContext.authorizer?.principalId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    // Get last 30 days of usage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const usageResult = await dynamoClient.send(new QueryCommand({
      TableName: USAGE_TABLE,
      KeyConditionExpression: 'userId = :userId AND #date >= :startDate',
      ExpressionAttributeNames: {
        '#date': 'date',
      },
      ExpressionAttributeValues: marshall({
        ':userId': userId,
        ':startDate': startDate,
      }),
    }));

    const usageRecords = usageResult.Items?.map(item => unmarshall(item)) as UsageRecord[] || [];
    
    // Calculate totals
    const totalScans = usageRecords.reduce((sum, record) => sum + record.scansUsed, 0);
    const totalAds = usageRecords.reduce((sum, record) => sum + record.adsWatched, 0);
    const averageScansPerDay = usageRecords.length > 0 ? totalScans / usageRecords.length : 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Usage retrieved successfully',
        summary: {
          totalScans,
          totalAds,
          averageScansPerDay: Math.round(averageScansPerDay * 100) / 100,
          daysTracked: usageRecords.length,
        },
        dailyUsage: usageRecords.map(record => ({
          date: record.date,
          scansUsed: record.scansUsed,
          adsWatched: record.adsWatched,
        })),
      }),
    };
  } catch (error: any) {
    console.error('Get usage error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to get usage',
        error: error.message 
      }),
    };
  }
}
