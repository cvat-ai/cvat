### Fixed

- Python tests now use a pytest-managed local runtime foundation with explicit
  `--infra` lifecycle commands, generated runtime state, per-run artifact
  directories, startup version checks, and preserved kube/minikube compatibility
  (<https://github.com/cvat-ai/cvat/pull/10498>)
