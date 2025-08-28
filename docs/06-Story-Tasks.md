# Story-Level Tasks

Epic: GlucoSnap MVP (Android)

- Auth: Google Sign-In
  - Configure Google OAuth client IDs (Android + web for dev)
  - Implement Expo AuthSession Google flow and store ID token
  - Send token to backend on API calls

- Image intake
  - Allow camera capture and gallery pick
  - Request presigned S3 upload URL
  - Upload image via PUT

- Analysis
  - Call `/v1/analyze` with S3 key
  - Prompt OpenAI with presigned GET URL
  - Parse JSON result and extract carbs
  - Persist to DynamoDB

- Backend infra
  - CDK stack: API Gateway, Lambda Authorizer, S3, DynamoDB, Lambdas
  - Store OpenAI key in SSM Parameter Store
  - Outputs and environment wiring

- UI/UX
  - Home screen with capture/pick buttons
  - Result card with estimated carbs and details
  - Basic error/loading states

- Hardening (post-MVP)
  - Input size limits and image compression
  - Caching authorizer verification
  - Observability: CloudWatch logs and metrics
  - Privacy: data retention and delete flow

