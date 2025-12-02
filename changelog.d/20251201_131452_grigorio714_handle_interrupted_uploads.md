### Fixed

- Fixed TUS upload handling to support interrupted uploads by reading request data in chunks
  instead of loading entire body into memory
  (<https://github.com/cvat-ai/cvat/issues/5261>)
