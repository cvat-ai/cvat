### Fixed

- Optimized memory usage by not keeping all downloaded images/part of images in memory while creating a manifest file
  (<https://github.com/cvat-ai/cvat/pull/7903>)
- Optimized the number of requests to CS providers by downloading only images from a specified range
  (use_cache in True/False) (<https://github.com/cvat-ai/cvat/pull/7903>)
