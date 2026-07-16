### Added

- \[CLI\] New `--profile NAME` option selects an already-saved server + credential profile
  instead of passing `--server-host`/`--server-port`/`--auth`
  (<https://github.com/cvat-ai/cvat/pull/10845>)

- \[CLI\] New `cvat-cli config default-server` command prints, sets, or clears the default server URL used
  when no `--server-host` or `--profile` is supplied
  (<https://github.com/cvat-ai/cvat/pull/10845>)

### Changed

- \[CLI\] `--auth` no longer defaults to the OS user; absent `--auth`, `--profile`, and `CVAT_ACCESS_TOKEN`,
  CLI uses active-profile credentials or prompts. `--server-host` falls back to the active profile, configured default, then `http://localhost`
  (<https://github.com/cvat-ai/cvat/pull/10845>)
