### Fixed

- \[SDK, CLI\] Changed the default server URL from `http://localhost:8080` to
  `http://localhost`, fixed server URL construction when `--server-port` is used
  with the default server, and report a clear error if a server URL already
  contains a port
  (<https://github.com/cvat-ai/cvat/pull/10895>)
