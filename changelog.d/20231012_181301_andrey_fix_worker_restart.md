### Changed

- Helm: set memory request for keydb
- Supervisord:
  - added `autorestart=true` option for all workers
  - unified program names to use dashes as delimiter instead of mixed '_' and '-'
  - minor improvements to supervisor configurations
  (<https://github.com/opencv/cvat/pull/6945>)
