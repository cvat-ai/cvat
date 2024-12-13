### Added

- \[CLI\] Added new commands: `project create`, `project delete`, `project ls`
  (<https://github.com/cvat-ai/cvat/pull/8787>)

- \[SDK\] You can now use `client.projects.remove_by_ids` to remove multiple
  projects
  (<https://github.com/cvat-ai/cvat/pull/8787>)

### Changed

- \[CLI\] Switched to a new subcommand hierarchy; now CLI subcommands
  have the form `cvat-cli <resource> <action>`
  (<https://github.com/cvat-ai/cvat/pull/8787>)

### Deprecated

- \[CLI\] All existing CLI commands of the form `cvat-cli <action>`
  are now deprecated. Use `cvat-cli task <action>` instead
  (<https://github.com/cvat-ai/cvat/pull/8787>)
