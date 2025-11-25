### Fixed

- Fixed cloud storage status endpoint to properly handle connection failures. Added exception handling for S3 and Azure connection errors. Unavailable storages now return NOT_FOUND status instead of 400 Bad Request
  (https://github.com/cvat-ai/cvat/pull/10011)
