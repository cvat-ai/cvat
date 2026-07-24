### Changed

- Document organization filtering on list endpoints (`org` / `org_id` /
  `X-Organization`): omitted means unfiltered, empty means sandbox, and allow
  blank values in the OpenAPI schema so Swagger UI can request the sandbox
  (<https://github.com/cvat-ai/cvat/issues/10776>)
