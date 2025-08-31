#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to create a new Lambda function with all the boilerplate
 * Usage: node scripts/create-lambda.js <handler-name> <handler-type>
 * 
 * Example: node scripts/create-lambda.js notifications handlers
 * This creates: src/handlers/notifications/
 */

function createLambdaHandler(handlerName, handlerType = 'handlers') {
  const handlerDir = path.join('src', handlerType, handlerName);
  
  // Create directory
  if (fs.existsSync(handlerDir)) {
    console.error(`❌ Handler directory already exists: ${handlerDir}`);
    process.exit(1);
  }
  
  fs.mkdirSync(handlerDir, { recursive: true });
  console.log(`✅ Created directory: ${handlerDir}`);
  
  // Create package.json
  const packageJson = {
    name: `glucosnap-${handlerName}-handler`,
    version: "1.0.0",
    description: `${handlerName} handler for GlucoSnap`,
    main: "index.js",
    scripts: {
      build: "tsc",
      test: "echo \"Error: no test specified\" && exit 1"
    },
    dependencies: {
      "@aws-sdk/client-dynamodb": "^3.0.0",
      "@aws-sdk/util-dynamodb": "^3.0.0"
    },
    devDependencies: {
      "@types/aws-lambda": "^8.10.0",
      typescript: "^5.0.0"
    }
  };
  
  fs.writeFileSync(
    path.join(handlerDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log(`✅ Created package.json`);
  
  // Create TypeScript handler template
  const handlerTemplate = `import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('${handlerName} handler invoked', { 
    httpMethod: event.httpMethod, 
    path: event.path 
  });

  try {
    const { httpMethod } = event;
    
    switch (httpMethod) {
      case 'GET':
        return await handle${handlerName}Get(event);
      case 'POST':
        return await handle${handlerName}Post(event);
      case 'PUT':
        return await handle${handlerName}Put(event);
      case 'DELETE':
        return await handle${handlerName}Delete(event);
      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }
  } catch (error: any) {
    console.error('${handlerName} handler error:', error);
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

async function handle${handlerName}Get(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement GET logic
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '${handlerName} GET endpoint' }),
  };
}

async function handle${handlerName}Post(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement POST logic
  const body = JSON.parse(event.body || '{}');
  
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: '${handlerName} created successfully',
      data: body 
    }),
  };
}

async function handle${handlerName}Put(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement PUT logic
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '${handlerName} updated successfully' }),
  };
}

async function handle${handlerName}Delete(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // TODO: Implement DELETE logic
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '${handlerName} deleted successfully' }),
  };
}
`;

  fs.writeFileSync(
    path.join(handlerDir, 'index.ts'),
    handlerTemplate
  );
  console.log(`✅ Created handler template: index.ts`);
  
  // Update build-lambdas.js to include the new handler
  const buildScriptPath = path.join('scripts', 'build-lambdas.js');
  let buildScript = fs.readFileSync(buildScriptPath, 'utf8');
  
  const newHandler = `  {
    name: '${handlerName}',
    srcPath: 'src/${handlerType}/${handlerName}',
    distPath: 'dist/src/${handlerType}/${handlerName}'
  },`;
  
  const lambdaHandlersRegex = /(const LAMBDA_HANDLERS = \[)([\s\S]*?)(\];)/;
  const match = buildScript.match(lambdaHandlersRegex);
  
  if (match) {
    const updatedHandlers = match[1] + match[2] + newHandler + '\\n' + match[3];
    buildScript = buildScript.replace(lambdaHandlersRegex, updatedHandlers);
    
    fs.writeFileSync(buildScriptPath, buildScript);
    console.log(`✅ Updated build-lambdas.js to include ${handlerName}`);
  } else {
    console.log(`⚠️  Could not automatically update build-lambdas.js. Please add manually:`);
    console.log(newHandler);
  }
  
  console.log(`\\n🎉 Lambda handler '${handlerName}' created successfully!`);
  console.log(`\\nNext steps:`);
  console.log(`1. Add the Lambda function to your CDK stack (lib/glucosnap-stack.ts)`);
  console.log(`2. Run: npm run build:lambdas`);
  console.log(`3. Deploy: npm run deploy`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const handlerName = args[0];
const handlerType = args[1] || 'handlers';

if (!handlerName) {
  console.log('Usage: node scripts/create-lambda.js <handler-name> [handler-type]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/create-lambda.js notifications');
  console.log('  node scripts/create-lambda.js imageProcessor handlers');
  console.log('  node scripts/create-lambda.js customAuth authorizer');
  process.exit(1);
}

// Capitalize first letter for class names
const capitalizedName = handlerName.charAt(0).toUpperCase() + handlerName.slice(1);

createLambdaHandler(capitalizedName, handlerType);







