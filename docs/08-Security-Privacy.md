# Security & Privacy

- AuthN: Accept only Google ID tokens matching configured client ID; verify via Google tokeninfo.
- AuthZ: Per-user partition keys in DynamoDB; image keys include user scope for traceability.
- Data: S3 bucket is private; presigned URLs expire in 5 minutes; DynamoDB stores minimal result data.
- Secrets: OpenAI API key stored in SSM; never shipped to clients.
- PII: Email stored for convenience; consider hashing or removing for stricter privacy.
- Logging: Avoid logging tokens or payloads; log IDs and timestamps only.

