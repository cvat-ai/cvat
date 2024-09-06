### Changed

- Lambda function endpoints now return 500 instead of 404
  if a function's metadata is invalid
  (<https://github.com/cvat-ai/cvat/pull/8406>)

- An unknown lambda function type is now treated as invalid metadata
  and the function is no longer included in the list endpoint output
  (<https://github.com/cvat-ai/cvat/pull/8406>)

### Fixed

- One lambda function with invalid metadata will no longer
  break function listing
  (<https://github.com/cvat-ai/cvat/pull/8406>)
