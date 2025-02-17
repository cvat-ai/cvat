---
title: 'Upgrade guide'
linkTitle: 'Upgrade guide'
weight: 60
description: 'Instructions for upgrading CVAT deployed with docker compose'
---

<!--lint disable heading-style-->

## Upgrade guide

Note: updating CVAT from version 2.2.0 to version 2.3.0 requires additional manual actions with database data due to
upgrading PostgreSQL base image major version. See details [here](#how-to-upgrade-postgresql-database-base-image)

To upgrade CVAT, follow these steps:

- It is highly recommended backup all CVAT data before updating, follow the
  {{< ilink "/docs/administration/advanced/backup_guide" "backup guide" >}} and backup all CVAT volumes.

- Go to the previously cloned CVAT directory and stop all CVAT containers with:
  ```shell
  docker compose down
  ```
  If you have included
  {{< ilink "/docs/administration/basics/installation#additional-components" "additional components" >}},
  include all compose configuration files that are used, e.g.:
  ```shell
  docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml down
  ```

- Update CVAT source code by any preferable way: clone with git or download zip file from GitHub.
  Note that you need to download the entire source code, not just the Docker Compose configuration file.
  Check the
  {{< ilink "/docs/administration/basics/installation#how-to-get-cvat-source-code" "installation guide" >}} for details.

- Verify settings:
  The installation process is changed/modified from version to version and
  you may need to export some environment variables, for example
  {{< ilink "/docs/administration/basics/installation#use-your-own-domain" "CVAT_HOST" >}}.

- Update local CVAT images.
  Pull or build new CVAT images, see
  {{< ilink "/docs/administration/basics/installation#how-to-pullbuildupdate-cvat-images"
    "How to pull/build/update CVAT images section" >}}
  for details.

- Start CVAT with:
  ```shell
  docker compose up -d
  ```
  When CVAT starts, it will upgrade its DB in accordance with the latest schema.
  It can take time especially if you have a lot of data.
  Please do not terminate the migration and wait till the process is complete.
  You can monitor the startup process with the following command:
  ```shell
  docker logs cvat_server -f
  ```

## Upgrade CVAT after v2.26.0

In version 2.26.0, CVAT changed the location where the export cache is stored.
To clean up the outdated cache, run the command depending on how CVAT is deployed:

<!--lint disable no-undefined-references-->

{{< tabpane lang="shell" >}}
  {{< tab header="Docker" >}}
  docker exec -it cvat_server python manage.py cleanuplegacyexportcache
  {{< /tab >}}
  {{< tab header="Kubernetes" >}}
  cvat_backend_pod=$(kubectl get pods -l component=server -o 'jsonpath={.items[0].metadata.name}')
  kubectl exec -it ${cvat_backend_pod} -- python manage.py cleanuplegacyexportcache
  {{< /tab >}}
  {{< tab header="Development" >}}
  python manage.py cleanuplegacyexportcache
  {{< /tab >}}
{{< /tabpane >}}

<!--lint enable no-undefined-references-->

## How to upgrade CVAT from v2.2.0 to v2.3.0.

Step by step commands how to upgrade CVAT from v2.2.0 to v2.3.0.
Let's assume that you have CVAT v2.2.0 working.
```shell
docker exec -it cvat_db pg_dumpall > cvat.db.dump
cd cvat
docker compose down
docker volume rm cvat_cvat_db
export CVAT_VERSION="v2.3.0"
cd ..
mv cvat cvat_220
wget https://github.com/cvat-ai/cvat/archive/refs/tags/${CVAT_VERSION}.zip
unzip ${CVAT_VERSION}.zip && mv cvat-${CVAT_VERSION:1} cvat
unset CVAT_VERSION
cd cvat
export CVAT_HOST=cvat.example.com
export ACME_EMAIL=example@example.com
docker compose pull
docker compose up -d cvat_db
docker exec -i cvat_db psql -q -d postgres < ../cvat.db.dump
docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.https.yml up -d
```

## How to upgrade CVAT from v1.7.0 to v2.2.0.

Step by step commands how to upgrade CVAT from v1.7.0 to v2.2.0.
Let's assume that you have CVAT v1.7.0 working.
```shell
export CVAT_VERSION="v2.2.0"
cd cvat
docker compose down
cd ..
mv cvat cvat_170
wget https://github.com/cvat-ai/cvat/archive/refs/tags/${CVAT_VERSION}.zip
unzip ${CVAT_VERSION}.zip && mv cvat-${CVAT_VERSION:1} cvat
cd cvat
docker pull cvat/server:${CVAT_VERSION}
docker tag cvat/server:${CVAT_VERSION} openvino/cvat_server:latest
docker pull cvat/ui:${CVAT_VERSION}
docker tag cvat/ui:${CVAT_VERSION} openvino/cvat_ui:latest
docker compose up -d
```

## How to upgrade PostgreSQL database base image

1. It is highly recommended backup all CVAT data before updating, follow the
   {{< ilink "/docs/administration/advanced/backup_guide" "backup guide" >}} and backup CVAT database volume.

1. Run previously used CVAT version as usual

1. Backup current database with `pg_dumpall` tool:
   ```shell
   docker exec -it cvat_db pg_dumpall > cvat.db.dump
   ```

1. Stop CVAT:
   ```shell
   docker compose down
   ```

1. Delete current PostgreSQL’s volume, that's why it's important to have a backup:
   ```shell
   docker volume rm cvat_cvat_db
   ```

1. Update CVAT source code by any preferable way: clone with git or download zip file from GitHub.
   Check the
   {{< ilink "/docs/administration/basics/installation#how-to-get-cvat-source-code" "installation guide" >}}
   for details.

1. Start database container only:
   ```shell
   docker compose up -d cvat_db
   ```

1. Import PostgreSQL dump into new DB container:
   ```shell
   docker exec -i cvat_db psql -q -d postgres < cvat.db.dump
   ```

1. Start CVAT:
   ```shell
   docker compose up -d
   ```
