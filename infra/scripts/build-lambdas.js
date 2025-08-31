#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Build script for Lambda functions
 * 
 * This script:
 * 1. Compiles TypeScript to JavaScript
 * 2. Installs dependencies for each Lambda handler
 * 3. Copies compiled JS + node_modules to dist directories
 * 4. Ensures Lambda deployment packages are ready
 */

const LAMBDA_HANDLERS = [
  {
    name: 'auth',
    srcPath: 'src/handlers/auth',
    distPath: 'dist/src/handlers/auth'
  },
  {
    name: 'user',
    srcPath: 'src/handlers/user', 
    distPath: 'dist/src/handlers/user'
  },
  {
    name: 'meals',
    srcPath: 'src/handlers/meals',
    distPath: 'dist/src/handlers/meals'
  },
  {
    name: 'upload',
    srcPath: 'src/handlers/upload',
    distPath: 'dist/src/handlers/upload'
  },
  {
    name: 'analyze',
    srcPath: 'src/handlers/analyze',
    distPath: 'dist/src/handlers/analyze'
  },
  {
    name: 'feedback',
    srcPath: 'src/handlers/feedback',
    distPath: 'dist/src/handlers/feedback'
  },
  {
    name: 'subscriptions',
    srcPath: 'src/handlers/subscriptions',
    distPath: 'dist/src/handlers/subscriptions'
  },
  {
    name: 'authorizer',
    srcPath: 'src/authorizer',
    distPath: 'dist/src/authorizer'
  }
];

function log(message) {
  console.log(`🔧 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function runCommand(command, cwd = process.cwd()) {
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    return true;
  } catch (err) {
    error(`Command failed: ${command}`);
    error(err.message);
    return false;
  }
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    error(`Source directory doesn't exist: ${src}`);
    return false;
  }
  
  ensureDirectoryExists(dest);
  
  // Use platform-appropriate copy command
  const isWindows = process.platform === 'win32';
  const copyCmd = isWindows 
    ? `xcopy "${src}" "${dest}" /E /I /Y /Q`
    : `cp -r "${src}/." "${dest}/"`;
    
  return runCommand(copyCmd);
}

function buildLambdas() {
  log('Starting Lambda build process...');
  
  // Step 1: Compile TypeScript
  log('Compiling TypeScript...');
  if (!runCommand('npx tsc')) {
    error('TypeScript compilation failed');
    process.exit(1);
  }
  success('TypeScript compilation completed');
  
  // Step 2: Process each Lambda handler
  for (const handler of LAMBDA_HANDLERS) {
    log(`Processing ${handler.name} handler...`);
    
    // Install dependencies in source directory
    log(`Installing dependencies for ${handler.name}...`);
    if (!runCommand('npm install', handler.srcPath)) {
      error(`Failed to install dependencies for ${handler.name}`);
      continue;
    }
    
    // Ensure dist directory exists
    ensureDirectoryExists(handler.distPath);
    
    // Copy compiled JS files (already exists from tsc)
    log(`Copying compiled files for ${handler.name}...`);
    
    // Copy node_modules to dist directory
    log(`Copying node_modules for ${handler.name}...`);
    const srcNodeModules = path.join(handler.srcPath, 'node_modules');
    const destNodeModules = path.join(handler.distPath, 'node_modules');
    
    if (!copyDirectory(srcNodeModules, destNodeModules)) {
      error(`Failed to copy node_modules for ${handler.name}`);
      continue;
    }
    
    // Copy package.json if it exists
    const srcPackageJson = path.join(handler.srcPath, 'package.json');
    const destPackageJson = path.join(handler.distPath, 'package.json');
    
    if (fs.existsSync(srcPackageJson)) {
      try {
        fs.copyFileSync(srcPackageJson, destPackageJson);
        log(`Copied package.json for ${handler.name}`);
      } catch (err) {
        error(`Failed to copy package.json for ${handler.name}: ${err.message}`);
      }
    }
    
    success(`${handler.name} handler ready for deployment`);
  }
  
  success('All Lambda functions built successfully!');
  log('Ready to deploy with: npx cdk deploy');
}

function clean() {
  log('Cleaning previous build artifacts...');
  
  // Remove dist directory
  if (fs.existsSync('dist')) {
    const isWindows = process.platform === 'win32';
    const rmCmd = isWindows ? 'rmdir /s /q dist' : 'rm -rf dist';
    runCommand(rmCmd);
  }
  
  // Remove node_modules from source directories
  for (const handler of LAMBDA_HANDLERS) {
    const nodeModulesPath = path.join(handler.srcPath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      const isWindows = process.platform === 'win32';
      const rmCmd = isWindows 
        ? `rmdir /s /q "${nodeModulesPath}"`
        : `rm -rf "${nodeModulesPath}"`;
      runCommand(rmCmd);
    }
  }
  
  success('Clean completed');
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'build';

switch (command) {
  case 'build':
    buildLambdas();
    break;
  case 'clean':
    clean();
    break;
  case 'rebuild':
    clean();
    buildLambdas();
    break;
  default:
    console.log('Usage: node build-lambdas.js [build|clean|rebuild]');
    console.log('  build   - Build all Lambda functions (default)');
    console.log('  clean   - Remove build artifacts and node_modules');
    console.log('  rebuild - Clean then build');
    process.exit(1);
}

