### Changed

- \[Helm\] Minimum compatible Kubernetes version is 1.19.0.
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] The CVAT hostname can be configured with `ingress.hostname` option.
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] `ingress.tls` configuration has been reworked.
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] Traefik subchart updated to 25.0.0 (appVersion v2.10.5)
  (<https://github.com/opencv/cvat/pull/7132>)

### Removed
  \[Helm\] `ingress.hosts` has been removed, use `ingress.hostname` instead.
  (<https://github.com/opencv/cvat/pull/7132>)
