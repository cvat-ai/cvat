### Changed

- Update the Nuclio version and related packages/libraries
  (<https://github.com/cvat-ai/cvat/pull/7787>)

### Removed

- The `mask_rcnn` function has been removed because it was using python3.6.
  In new version of Nuclio python3.6 is no longer supported. Nuclio officially recommends using python3.9.
  Running `mask_rcnn` on python3.9 causes errors within the function and package conflicts. (<https://github.com/cvat-ai/cvat/pull/7787>)
