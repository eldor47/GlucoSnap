# Testing Plan

Backend:
- Unit test Lambdas locally with mock events (optional in MVP)
- Deploy to a dev stack and validate:
  - `/v1/uploads` returns presigned URL and key
  - Upload via curl and verify object appears in S3
  - `/v1/analyze` returns JSON with carbs

Mobile:
- Run on Android emulator or device
- Sign-in flow completes and token appears in headers (enable `__glucosnap_token` debug)
- Upload + analyze end-to-end with a sample meal image

Manual checks:
- Invalid token → 401/403 from API
- Expired upload URL → upload fails as expected

