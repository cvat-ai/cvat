### Fixed

- Spurious `RuntimeError: Response content shorter than Content-Length` errors
  logged on every file download when running the server under ASGI with an
  offloading sendfile backend (nginx `X-Accel-Redirect`)
  (<https://github.com/cvat-ai/cvat/pull/XXXX>)
