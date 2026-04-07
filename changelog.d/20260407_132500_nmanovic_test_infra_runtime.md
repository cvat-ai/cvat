### Changed

- Python tests now use a pytest-managed infrastructure runtime for local Docker Compose and Kubernetes runs, which makes the lifecycle explicit and improves speed and stability. This includes:
  - profile-based environments (`simple`, `standard`, `full`)
  - faster restore/reuse and better local parallel execution
  - dedicated Kubernetes test dependencies, including MinIO and webhook receiver support
  - runtime URL normalization for DB-backed webhook and MinIO objects and more reliable Minikube cleanup
  (<https://github.com/cvat-ai/cvat/pull/10452>)
