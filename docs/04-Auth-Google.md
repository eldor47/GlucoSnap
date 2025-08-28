# Google Authentication

Option A (simple): App obtains Google ID Token and sends to backend as `Authorization: Bearer <id_token>`. Lambda Authorizer calls `https://oauth2.googleapis.com/tokeninfo` to verify. The backend now supports multiple Google OAuth Client IDs (comma‑separated).

Steps:
1. Create OAuth 2.0 Client ID in Google Cloud Console (type: Android, iOS, and/or Web for Expo dev)
2. Put the client ID(s) into:
   - Backend: `infra/cdk.json` → `googleClientIds` (comma‑separated for Web, Android, iOS). You can keep `googleClientId` for backward compatibility.
   - Mobile: `apps/glucosnap/app.json` → `extra.googleClientId` (use the Web client ID for Expo Go)
3. Redeploy backend and restart the app

Notes:
- For production scale, consider verifying ID tokens with JWKS and caching keys.
- Ensure the `aud` in the token matches exactly the configured client ID.
