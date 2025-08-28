# GlucoSnap Architecture

- Mobile app: Expo React Native (Android first; iOS supported).
- Auth: Google Sign-In on device; ID token sent to backend as `Authorization: Bearer <id_token>`.
- API: Amazon API Gateway with Lambda request authorizer validating Google ID token via Google `tokeninfo` endpoint.
- Storage: S3 for input images; DynamoDB for analysis results.
- Compute: Lambda functions for presigned upload URL and analysis.
- AI: OpenAI Responses API (model: gpt-4o-mini) to estimate carbs from an S3 presigned GET image URL.

Flow:
1. User signs in with Google in app, gets ID token.
2. App requests `/v1/uploads` → backend returns S3 presigned PUT URL + object key.
3. App uploads image to S3 via presigned URL.
4. App calls `/v1/analyze` with the S3 key.
5. Lambda generates a presigned GET, prompts OpenAI with the image and instructions.
6. Lambda stores result in DynamoDB and returns summary to app.

Security notes:
- Backend accepts only Google ID tokens matching configured `GOOGLE_CLIENT_ID`.
- S3 buckets are private; only presigned URLs for short durations are issued.
- OpenAI API key retrieved from SSM Parameter Store with decryption; not baked into code.

