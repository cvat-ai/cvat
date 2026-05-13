### Changed

- \[Server API\] Annotations now use `0` as the default value for groups instead of `null`.
  It worked this way already, but wasn't reflected in the server API. No behavior or logic changes.
  (<https://github.com/cvat-ai/cvat/pull/10522>)

### Deprecated

- \[Server API\] The use of `null` for the `group` field in annotations. Use 0 instead.
  (<https://github.com/cvat-ai/cvat/pull/10522>)
