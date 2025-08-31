# Lambda Build Scripts

This directory contains automation scripts for managing Lambda functions in the GlucoSnap project.

## Available Scripts

### 🔧 `build-lambdas.js`

Automates the entire Lambda build process:
- Compiles TypeScript to JavaScript
- Installs npm dependencies for each handler
- Copies compiled files + node_modules to dist directories
- Prepares Lambda deployment packages

**Usage:**
```bash
# Build all Lambda functions
npm run build:lambdas
# or
node scripts/build-lambdas.js build

# Clean build artifacts
npm run clean:lambdas
# or  
node scripts/build-lambdas.js clean

# Clean + rebuild everything
npm run rebuild:lambdas
# or
node scripts/build-lambdas.js rebuild
```

### 🆕 `create-lambda.js`

Creates a new Lambda function with boilerplate code:
- Creates directory structure
- Generates package.json with dependencies
- Creates TypeScript handler template
- Updates build script configuration

**Usage:**
```bash
# Create a new handler
node scripts/create-lambda.js <handler-name> [handler-type]

# Examples:
node scripts/create-lambda.js notifications
node scripts/create-lambda.js imageProcessor handlers
node scripts/create-lambda.js customAuth authorizer
```

## Integration with NPM Scripts

The build process is integrated into the main package.json scripts:

```bash
# Deploy with automatic Lambda building
npm run deploy

# Force deploy with Lambda building  
npm run deploy:force

# Just build Lambdas without deploying
npm run build:lambdas

# Clean Lambda artifacts
npm run clean:lambdas

# Rebuild everything
npm run rebuild:lambdas
```

## Current Lambda Handlers

The build script automatically handles these Lambda functions:

- **auth** (`src/handlers/auth`) - User authentication (signup/signin)
- **user** (`src/handlers/user`) - User profile management  
- **meals** (`src/handlers/meals`) - Meal logging functionality
- **authorizer** (`src/authorizer`) - Cognito JWT authorization

## Adding New Lambda Functions

### Method 1: Use the creation script
```bash
node scripts/create-lambda.js myNewFunction
```

### Method 2: Manual creation
1. Create directory: `src/handlers/myNewFunction/`
2. Add `package.json` with dependencies
3. Create `index.ts` with handler logic
4. Add handler to `LAMBDA_HANDLERS` array in `build-lambdas.js`
5. Add Lambda function to CDK stack in `lib/glucosnap-stack.ts`

## Build Process Details

The build script performs these steps for each Lambda:

1. **TypeScript Compilation**: `npx tsc` compiles all `.ts` files to `dist/`
2. **Dependency Installation**: `npm install` in each handler's source directory
3. **Asset Copying**: Copies `node_modules` from source to dist directory
4. **Package Preparation**: Ensures Lambda deployment package includes:
   - Compiled JavaScript files (`.js`)
   - All npm dependencies (`node_modules/`)
   - Package metadata (`package.json`)

## CDK Integration

The CDK stack uses the prepared dist directories:

```typescript
const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist/src/handlers/myHandler'), // 👈 Uses dist/
  // ...
});
```

## Troubleshooting

### "Cannot find module" errors
- Ensure you ran `npm run build:lambdas` before deploying
- Check that `node_modules` exists in the dist directory
- Verify all dependencies are listed in the handler's `package.json`

### Build script fails
- Check that all handler directories have valid `package.json` files
- Ensure TypeScript compiles without errors (`npm run build`)
- Verify Node.js and npm are properly installed

### New handler not building
- Add the handler to `LAMBDA_HANDLERS` array in `build-lambdas.js`
- Ensure the source directory structure matches expectations
- Run `npm run rebuild:lambdas` to clean and rebuild everything






