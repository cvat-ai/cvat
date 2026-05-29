### Added

- Support for SSL/TLS connections to external Redis instances via `CVAT_REDIS_INMEM_SSL`
  and `CVAT_REDIS_ONDISK_SSL` environment variables. This enables CVAT to connect to
  managed Redis services like AWS ElastiCache with encryption in transit enabled.
  (<https://github.com/cvat-ai/cvat/pull/10242>)
