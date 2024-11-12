### Added

- \[SDK, CLI\] Added a `threshold` parameter to `cvat_sdk.auto_annotation.annotate_task`,
  which is passed as-is to the AA function object via the context. The CLI
  equivalent is `auto-annotate --threshold`. This makes it easier to write
  and use AA functions that support object filtering based on confidence
  levels. Updated the builtin functions in `cvat_sdk.auto_annotation.functions`
  to support filtering via this parameter
  (<https://github.com/cvat-ai/cvat/pull/8688>)
