### Added

- \[CLI\] New `--profile NAME` option selects a saved server/credential profile.
  Replaces `--server-host`/`--server-port`/`--auth` (<https://github.com/cvat-ai/cvat/pull/10845>)

- \[CLI\] New `cvat-cli config default-server` command prints, sets, or clears the default server URL.
  (<https://github.com/cvat-ai/cvat/pull/10845>)

### Changed

- \[CLI\] `--auth` no longer defaults to the OS user; absent auth/profile/token, it uses profile credentials or prompts.
  `--server-host` falls back to profile/default server/`http://localhost` (<https://github.com/cvat-ai/cvat/pull/10845>)
