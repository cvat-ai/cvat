### Security

- Fixed overly lax authorization rules for lambda function requests;
  viewing a request now requires access to its target task or job,
  while cancelling a request requires being the user who initiated it
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-m7p7-6w4m-886p>)

- Prevented users from blocking automatic annotation for inaccessible tasks
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-7xhx-3q27-xvcx>)
