### Security

- Fixed multiple path traversal vulnerabilities
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-6f87-4g86-p9gw>)

### Changed

- \[Server API\] Made the requirements for inputs representing paths in
  cloud storage or attached file share more strict in several endpoints;
  empty, `..` and `.` components are no longer accepted and neither are
  leading slashes
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-6f87-4g86-p9gw>)
