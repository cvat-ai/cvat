### Fixed

- Client error thrown
  when listing lambda functions failed (e.g. network
  error or timeout) (<https://github.com/cvat-ai/cvat/pull/10857>)
- Error boundary crashe with
  "Cannot read properties of null (reading 'version')" when an error
  occurs before the server version is loaded
  (<https://github.com/cvat-ai/cvat/pull/10857>)
