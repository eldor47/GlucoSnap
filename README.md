GlucoSnap

Cross‑platform React Native app (Android first) that estimates carbohydrate content from a meal photo using the ChatGPT API, with Google Sign‑In and an AWS CDK (TypeScript) backend.

Key pieces:
- apps/glucosnap – Expo React Native app (Android/iOS)
- infra/ – AWS CDK TypeScript stack (API Gateway, Lambda, S3, DynamoDB, Lambda Authorizer)
- docs/ – Architecture, setup guides, and story‑level task breakdowns

Quick start (high level):
- Backend: See docs/02-Backend-Setup.md to deploy CDK.
- Mobile: See docs/03-Mobile-App-Setup.md to run Expo on Android (WSL).

Env/config placeholders are provided. Replace TODO values before running.

