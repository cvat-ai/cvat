### Changed

- \[Helm\] Minimum compatible Kubernetes version is 1.19.0.
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] The CVAT hostname can be configured with `ingress.hostname` option.
  (<https://github.com/opencv/cvat/pull/7132>)

### Removed
  \[Helm\] `ingress.hosts` has been removed, use `ingress.hostname` instead.
  (<https://github.com/opencv/cvat/pull/7132>)

  \[Helm\] removed unsupported `ingress.tls` option.
  (<https://github.com/opencv/cvat/pull/7132>)

