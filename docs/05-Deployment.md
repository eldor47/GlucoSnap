# Deployment

Backend (CDK):
- `cd infra && npm install && npm run deploy`
- Update `apps/glucosnap/app.json` with `ApiUrl` output

Mobile (Android):
- Dev: `cd apps/glucosnap && npm install && npm start`
- Build: consider EAS (`eas build -p android`)

Secrets:
- OpenAI API key lives in SSM Parameter Store (SecureString)
- Google client IDs live in config files and should not be committed for production; use env substitution in a CI/CD pipeline

