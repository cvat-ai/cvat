### Added

- The `POST /api/lambda/requests` endpoint now has a `conv_mask_to_poly`
  parameter with the same semantics as the old `convMaskToPoly` parameter
  (<https://github.com/cvat-ai/cvat/pull/8743>)

### Deprecated

- The `convMaskToPoly` parameter of the `POST /api/lambda/requests` endpoint
  is deprecated; use `conv_mask_to_poly` instead
  (<https://github.com/cvat-ai/cvat/pull/8743>)
