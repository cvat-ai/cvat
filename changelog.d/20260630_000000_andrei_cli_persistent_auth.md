### Added

- \[CLI\] New `--profile NAME` option for all commands that talk to the server,
  selecting an already-saved server + credential profile
  instead of passing `--server-host`/`--server-port`/`--auth`
  (<https://github.com/cvat-ai/cvat/pull/10845>)

- \[CLI\] New `cvat-cli config default-server` command to print, set, or
  clear the default server URL used when no `--server-host` or `--profile`
  is supplied
  (<https://github.com/cvat-ai/cvat/pull/10845>)

### Changed

- \[CLI\] `--auth` no longer defaults to the current OS user; when neither
  `--auth`, `--profile`, nor `CVAT_ACCESS_TOKEN` is provided, the CLI now
  uses the active profile's credentials (if any) and otherwise prompts.
  `--server-host` likewise falls back to the active profile or the
  configured default server before `http://localhost`
  (<https://github.com/cvat-ai/cvat/pull/10845>)
