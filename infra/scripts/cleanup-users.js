#!/usr/bin/env node

/**
 * Utility script to clean up orphaned users
 * 
 * This script helps with development/testing by:
 * 1. Listing users in Cognito User Pool
 * 2. Optionally deleting specific users
 * 3. Cleaning up test data
 * 
 * Usage:
 *   node scripts/cleanup-users.js list
 *   node scripts/cleanup-users.js delete <username>
 *   node scripts/cleanup-users.js deleteAll
 */

const { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

// Configuration - update these with your actual values
const USER_POOL_ID = 'us-east-1_v4mfmQJ7v'; // From deployment outputs
const USER_TABLE_NAME = 'glucosnap-users';
const AWS_REGION = 'us-east-1';

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });

async function listCognitoUsers() {
  try {
    console.log('📋 Listing Cognito users...');
    
    const response = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    }));
    
    if (!response.Users || response.Users.length === 0) {
      console.log('✅ No users found in Cognito User Pool');
      return [];
    }
    
    console.log(`Found ${response.Users.length} users:`);
    response.Users.forEach((user, index) => {
      const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value || 'No email';
      const status = user.UserStatus || 'Unknown';
      console.log(`  ${index + 1}. ${user.Username} (${email}) - ${status}`);
    });
    
    return response.Users;
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    return [];
  }
}

async function deleteUser(username) {
  try {
    console.log(`🗑️  Deleting user: ${username}`);
    
    // Delete from Cognito
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));
    console.log('✅ Deleted from Cognito');
    
    // Try to delete from DynamoDB (may not exist)
    try {
      await dynamoClient.send(new DeleteItemCommand({
        TableName: USER_TABLE_NAME,
        Key: marshall({ username })
      }));
      console.log('✅ Deleted from DynamoDB');
    } catch (dynamoError) {
      console.log('ℹ️  User not found in DynamoDB (this is OK)');
    }
    
    console.log(`✅ User ${username} cleaned up successfully`);
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.log(`ℹ️  User ${username} not found in Cognito`);
    } else {
      console.error(`❌ Error deleting user ${username}:`, error.message);
    }
  }
}

async function deleteAllUsers() {
  console.log('⚠️  WARNING: This will delete ALL users from Cognito and DynamoDB!');
  console.log('This action cannot be undone.');
  
  // In a real script, you'd want to add a confirmation prompt here
  // For now, we'll just list what would be deleted
  
  const users = await listCognitoUsers();
  if (users.length === 0) {
    console.log('✅ No users to delete');
    return;
  }
  
  console.log('\\n⚠️  To actually delete these users, uncomment the deletion code in the script.');
  console.log('For safety, automatic deletion is disabled. Delete users individually if needed.');
  
  // Uncomment below to enable mass deletion (USE WITH CAUTION!)
  /*
  for (const user of users) {
    await deleteUser(user.Username);
  }
  */
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Usage: node scripts/cleanup-users.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list                - List all users in Cognito');
    console.log('  delete <username>   - Delete specific user');
    console.log('  deleteAll          - Delete all users (disabled by default)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/cleanup-users.js list');
    console.log('  node scripts/cleanup-users.js delete testuser123');
    return;
  }
  
  switch (command) {
    case 'list':
      await listCognitoUsers();
      break;
      
    case 'delete':
      const username = args[1];
      if (!username) {
        console.error('❌ Please provide a username to delete');
        console.log('Usage: node scripts/cleanup-users.js delete <username>');
        return;
      }
      await deleteUser(username);
      break;
      
    case 'deleteAll':
      await deleteAllUsers();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "list", "delete <username>", or "deleteAll"');
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});







