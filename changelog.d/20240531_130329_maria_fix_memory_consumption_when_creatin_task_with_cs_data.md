### Fixed

- Optimized memory usage by not keeping all downloaded images/part of images in memory while creating a manifest file
  (<https://github.com/cvat-ai/cvat/pull/7969>)
- Optimized the number of requests to CS providers by downloading only images from a specified range
  (`use_cache==False`) (<https://github.com/cvat-ai/cvat/pull/7969>)
- Task creation with random sorting and cloud data
  (<https://github.com/cvat-ai/cvat/pull/7969>)