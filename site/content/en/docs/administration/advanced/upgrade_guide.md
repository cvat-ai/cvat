---
title: 'Upgrade guide'
linkTitle: 'Upgrade guide'
weight: 60
description: 'Instructions for upgrading CVAT deployed with docker compose'
---

<!--lint disable heading-style-->

## Upgrade guide

To upgrade CVAT, follow these steps:

- It is highly recommended backup all CVAT data before updating, follow the
  [backup guide](/docs/administration/advanced/backup_guide/) and backup all CVAT volumes.

- Go to the previously cloned CVAT directory and stop all CVAT containers with:
  ```shell
  docker-compose down
  ```
  If you have included [additional components](/docs/administration/basics/installation/#additional-components),
  include all compose configuration files that are used, e.g.:
  ```shell
  docker-compose -f docker-compose.yml -f components/analytics/docker-compose.analytics.yml down
  ```

- Update CVAT source code by any preferable way: clone with git or download zip file from GitHub.
  Note that you need to download the entire source code, not just the `docker-compose` configuration file.
  Check the
  [installation guide](/docs/administration/basics/installation/#how-to-get-cvat-source-code) for details.

- Verify settings:
  The installation process is changed/modified from version to version and
  you may need to export some environment variables, for example
  [CVAT_HOST](/docs/administration/basics/installation/#use-your-own-domain).

- Update local CVAT images.
  Pull or build new CVAT images, see
  [How to pull/build/update CVAT images section](/docs/administration/basics/installation/#how-to-pullbuildupdate-cvat-images)
  for details.

- Start CVAT with:
  ```shell
  docker-compose up -d
  ```
  When CVAT starts, it will upgrade its DB in accordance with the latest schema.
  It can take time especially if you have a lot of data.
  Please do not terminate the migration and wait till the process is complete.
  You can monitor the startup process with the following command:
  ```shell
  docker logs cvat_server -f
  ```

## How to udgrade CVAT from v1.7.0 to v2.1.0.

Step by step commands how to udgrade CVAT from v1.7.0 to v2.1.0.
Let's assume that you have CVAT v1.7.0 working.
```shell
cd cvat
docker-compose down
cd ..
mv cvat cvat_old
wget https://github.com/opencv/cvat/archive/refs/tags/v2.1.0.zip
unzip v2.1.0.zip && mv cvat-2.1.0 cvat
cd cvat
docker pull cvat/server:v2.1.0
docker tag cvat/server:v2.1.0 openvino/cvat_server:latest
docker pull cvat/ui:v2.1.0
docker tag cvat/ui:v2.1.0 openvino/cvat_ui:latest
docker-compose up -d
```
