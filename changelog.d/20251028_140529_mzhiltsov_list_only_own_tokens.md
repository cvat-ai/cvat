### Changed

- Admins will no longer see access tokens of other users on the token management page
  (<https://github.com/cvat-ai/cvat/pull/9950>)

### Removed

- \[Server API\] Only own access tokens will be returned in the `GET /api/auth/access_tokens`
  responses for everyone, including admins
  (<https://github.com/cvat-ai/cvat/pull/9950>)
- \[Server API\] The `owner` filters are removed from the `GET /api/auth/access_tokens` endpoint
  (<https://github.com/cvat-ai/cvat/pull/9950>)
