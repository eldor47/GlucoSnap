# Backend Setup (AWS CDK, TypeScript)

Prereqs:
- Node.js 18+ and npm
- AWS CLI configured (`aws configure`)
- CDK v2: `npm i -g aws-cdk` (or use npx)

Config values (update `infra/cdk.json` or pass via `-c`):
- `googleClientIds`: comma‑separated OAuth Client IDs (Web for Expo Go, Android, iOS)
- `openaiApiKeyParamName`: SSM parameter name that holds the OpenAI API key (SecureString)

Create SSM parameter:
- `aws ssm put-parameter --name /glucosnap/openai/apiKey --type SecureString --value YOUR_OPENAI_KEY --overwrite`

Deploy:
- `cd infra`
- `npm install`
- `npm run deploy` (or `npx cdk deploy`)

Outputs:
- `ApiUrl` – base URL for the API Gateway (e.g., https://xxxx.execute-api.us-east-1.amazonaws.com/prod)
- `BucketName` – S3 bucket for uploads
- `TableName` – DynamoDB table for results

Environment mapping for the app:
- Set `extra.apiBaseUrl` in `apps/glucosnap/app.json` to the `ApiUrl` value
- Set `extra.googleClientId` to your Web Client ID (for Expo Go)

Notes:
- Authorizer uses Google `tokeninfo` endpoint for verification (simple and reliable). For high‑TPS, consider JWKS verification with caching.
- Lambdas target Node 20.x and bundle via `NodejsFunction`.
