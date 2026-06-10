### Fixed

- \[SDK\] Generated type annotations for optional fields and return values no
  longer use the `none_type` alias, which prevented static type checkers
  (Pyright/Pylance) from resolving the annotated types
  (<https://github.com/cvat-ai/cvat/pull/10638>)
