### Removed

- \[Server API\] The redundant `storage` parameter of the `POST /api/tasks/<id>/data`
  endpoint has been removed; the storage location is determined based on
  other parameters
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-x396-w86c-gf6w>)

### Security

- Fixed a vulnerability that let users write to the attached network share
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-x396-w86c-gf6w>)
