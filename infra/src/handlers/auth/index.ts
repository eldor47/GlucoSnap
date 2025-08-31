import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, InitiateAuthCommand, RespondToAuthChallengeCommand, AdminGetUserCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;

interface SignUpRequest {
  email: string;
  username: string;
  password: string;
  givenName?: string;
  familyName?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
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
    
    if (httpMethod === 'POST' && path.endsWith('/signup')) {
      return await handleSignUp(event);
    } else if (httpMethod === 'POST' && path.endsWith('/signin')) {
      return await handleSignIn(event);
    } else if (httpMethod === 'POST' && path.endsWith('/refresh')) {
      return await handleRefreshToken(event);
    } else {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Endpoint not found' }),
      };
    }
  } catch (error: any) {
    console.error('Auth handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      }),
    };
  }
}

async function handleRefreshToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: RefreshTokenRequest = JSON.parse(event.body || '{}');

    if (!body.refreshToken) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Refresh token is required' }),
      };
    }

    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: body.refreshToken,
      },
    }));

    if (authResult.ChallengeName) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Authentication challenge required for refresh token',
          challengeName: authResult.ChallengeName,
          session: authResult.Session,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Token refreshed successfully',
        tokens: {
          accessToken: authResult.AuthenticationResult?.AccessToken,
          refreshToken: authResult.AuthenticationResult?.RefreshToken,
          idToken: authResult.AuthenticationResult?.IdToken,
        },
      }),
    };
  } catch (error: any) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid refresh token' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to refresh token',
        error: error.message 
      }),
    };
  }
};

async function handleSignUp(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: SignUpRequest = JSON.parse(event.body || '{}');
    
    // Validate input
    if (!body.email || !body.username || !body.password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Email, username, and password are required' }),
      };
    }

    // Check if username already exists
    const existingUser = await dynamoClient.send(new QueryCommand({
      TableName: USER_TABLE_NAME,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: marshall({ ':username': body.username }),
      Limit: 1,
    }));

    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Username already exists' }),
      };
    }

    // Check if email already exists
    const existingEmail = await dynamoClient.send(new QueryCommand({
      TableName: USER_TABLE_NAME,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: marshall({ ':email': body.email }),
      Limit: 1,
    }));

    if (existingEmail.Items && existingEmail.Items.length > 0) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Email already exists' }),
      };
    }

    const userId = uuidv4();
    const now = new Date().toISOString();
    let cognitoUserCreated = false;

    try {
      // Create user in Cognito
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: body.username,
        UserAttributes: [
          { Name: 'email', Value: body.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:userId', Value: userId },
          ...(body.givenName ? [{ Name: 'given_name', Value: body.givenName }] : []),
          ...(body.familyName ? [{ Name: 'family_name', Value: body.familyName }] : []),
        ],
        MessageAction: 'SUPPRESS', // Don't send welcome email
      }));
      cognitoUserCreated = true;

      // Set the password
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: body.username,
        Password: body.password,
        Permanent: true,
      }));

      // Store user profile in DynamoDB
      const userProfile: UserProfile = {
        userId,
        email: body.email,
        username: body.username,
        givenName: body.givenName,
        familyName: body.familyName,
        createdAt: now,
        updatedAt: now,
      };

      await dynamoClient.send(new PutItemCommand({
        TableName: USER_TABLE_NAME,
        Item: marshall(userProfile, { removeUndefinedValues: true }),
      }));

    } catch (error: any) {
      // If we created the Cognito user but something failed after, clean it up
      if (cognitoUserCreated) {
        try {
          console.log(`Cleaning up Cognito user ${body.username} due to error:`, error.message);
          await cognitoClient.send(new AdminDeleteUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: body.username,
          }));
          console.log(`Successfully deleted Cognito user ${body.username}`);
        } catch (cleanupError: any) {
          console.error(`Failed to cleanup Cognito user ${body.username}:`, cleanupError.message);
        }
      }

      // Handle specific error types
      if (error.name === 'UsernameExistsException') {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'An account with this username already exists. Please try signing in or use a different username.',
            code: 'USERNAME_EXISTS'
          }),
        };
      }

      // Re-throw other errors to be handled by the outer catch block
      throw error;
    }

    // Get the user from Cognito to return the JWT tokens
    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: body.username,
        PASSWORD: body.password,
      },
    }));

    if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      // Complete the challenge
      const challengeResponse = await cognitoClient.send(new RespondToAuthChallengeCommand({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: USER_POOL_CLIENT_ID,
        ChallengeResponses: {
          USERNAME: body.username,
          NEW_PASSWORD: body.password,
        },
        Session: authResult.Session,
      }));

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'User created successfully',
          user: {
            userId,
            email: body.email,
            username: body.username,
            givenName: body.givenName,
            familyName: body.familyName,
          },
          tokens: {
            accessToken: challengeResponse.AuthenticationResult?.AccessToken,
            refreshToken: challengeResponse.AuthenticationResult?.RefreshToken,
            idToken: challengeResponse.AuthenticationResult?.IdToken,
          },
        }),
      };
    }

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'User created successfully',
        user: {
          userId,
          email: body.email,
          username: body.username,
          givenName: body.givenName,
          familyName: body.familyName,
        },
        tokens: {
          accessToken: authResult.AuthenticationResult?.AccessToken,
          refreshToken: authResult.AuthenticationResult?.RefreshToken,
          idToken: authResult.AuthenticationResult?.IdToken,
        },
      }),
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    
    if (error.name === 'UsernameExistsException') {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Username already exists' }),
      };
    }
    
    if (error.name === 'InvalidPasswordException') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Password does not meet requirements' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Failed to create user',
        error: error.message 
      }),
    };
  }
}

async function handleSignIn(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: SignInRequest = JSON.parse(event.body || '{}');
    
    // Validate input
    if (!body.email || !body.password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Email and password are required' }),
      };
    }

    // Find user by email
    const userResult = await dynamoClient.send(new QueryCommand({
      TableName: USER_TABLE_NAME,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: marshall({ ':email': body.email }),
      Limit: 1,
    }));

    if (!userResult.Items || userResult.Items.length === 0) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    const user = unmarshall(userResult.Items[0]) as UserProfile;

    // Authenticate with Cognito
    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: user.username,
        PASSWORD: body.password,
      },
    }));

    if (authResult.ChallengeName) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Authentication challenge required',
          challengeName: authResult.ChallengeName,
          session: authResult.Session,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Sign in successful',
        user: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          givenName: user.givenName,
          familyName: user.familyName,
        },
        tokens: {
          accessToken: authResult.AuthenticationResult?.AccessToken,
          refreshToken: authResult.AuthenticationResult?.RefreshToken,
          idToken: authResult.AuthenticationResult?.IdToken,
        },
      }),
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }
    
    if (error.name === 'UserNotConfirmedException') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User not confirmed' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Sign in failed',
        error: error.message 
      }),
    };
  }
}
