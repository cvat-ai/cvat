### Added

- \[SDK\] Persistent authentication support with saved profiles:
  `make_client_from_profile`, `make_client_from_cli`,
  `resolve_server_host`, and `add_cli_parser_args` helpers let SDK users save
  server + credential profiles to disk and instantiate a `Client` from a profile
  name without re-entering credentials
  (<https://github.com/cvat-ai/cvat/pull/10824>)
