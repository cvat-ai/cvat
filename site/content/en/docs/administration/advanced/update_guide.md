---
title: 'Update guide'
linkTitle: 'Update guide'
weight: 11
description: 'Instructions for updating CVAT deployed with docker compose'
---

<!--lint disable heading-style-->

## About CVAT data volumes

Docker volumes are used to store all CVAT data:

- It is highly recommended backup all CVAT data before updating, follow the
  [backup guide](/docs/administration/advanced/backup_guide/) and backup all CVAT volumes.

- Update CVAT source code by any preferable way: clone with git or download zip file from GitHub.
  Note that you need to download the entire source code, not just the `docker-compose` configuration file.
  - With git:
    Run the following commands inside CVAT folder
    ```shell
    git checkout develop
    git pull
    ```
    Optionally checkout to specific version:
    ```shell
    git checkout v2.1.0
    ```
  - With wget:
    ```shell
    wget https://github.com/opencv/cvat/archive/refs/heads/develop.zip
    unzip develop.zip -d cvat && mv cvat/cvat-develop/* cvat && rm -r cvat/cvat-develop
    ```
  Check the [installation guide](/docs/administration/basics/installation/) for details.

- Update settings:
  If `docker-compose.override.yml` configuration file is present in your installation, check it and adjust the settings if necessary.
  From time to time the installation process changes a little and you may need to export some environment variables, for example.
  Follow the [installation guide](/docs/administration/basics/installation/).

- Update local CVAT images. Two option here:
  1. Pull prebuilt images from DockerHub: use `CVAT_VERSION` environment variable
     to specify the version of CVAT you want to install (e.g `v2.1.0`, `dev`):
    ```shell
    CVAT_VERSION=dev docker-compose pull
    ```

  2. Alternative: if you want to build the images locally with local changes
    run the following command. It will take some time to build CVAT images.

    ```shell
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
    ```

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
