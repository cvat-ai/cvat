---
title: 'Upgrade guide'
linkTitle: 'Upgrade guide'
weight: 60
description: 'Instructions for upgrading CVAT deployed with docker compose'
aliases:
- /docs/administration/advanced/upgrade_guide/
products:
  - community
---

## Upgrade guide

Note: updating CVAT from version 2.2.0 to version 2.3.0 requires additional manual actions with database data due to
upgrading PostgreSQL base image major version. See details [here](#how-to-upgrade-postgresql-database-base-image)

To upgrade CVAT, follow these steps:

- It is highly recommended backup all CVAT data before updating, follow the
  {{< ilink "/docs/administration/community/advanced/backup_guide" "backup guide" >}} and backup all CVAT volumes.

- Go to the previously cloned CVAT directory and stop all CVAT containers with:
  ```shell
  docker compose down
  ```
  If you have included
  {{< ilink "/docs/administration/community/basics/installation#additional-components" "additional components" >}},
  include all compose configuration files that are used, e.g.:
  ```shell
  docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml down
  ```

- Update CVAT source code by any preferable way: clone with git or download zip file from GitHub.
  Note that you need to download the entire source code, not just the Docker Compose configuration file.
  Check the
  {{< ilink "/docs/administration/community/basics/installation#how-to-get-cvat-source-code" "installation guide" >}}
  for details.

- Verify settings:
  The installation process is changed/modified from version to version and
  you may need to export some environment variables, for example
  {{< ilink "/docs/administration/community/basics/installation#use-your-own-domain" "CVAT_HOST" >}}.

- Update local CVAT images.
  Pull or build new CVAT images, see
  {{< ilink "/docs/administration/community/basics/installation#how-to-pullbuildupdate-cvat-images"
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

## Upgrade to v2.72.0 or later

Version 2.72.0 moves CVAT application source files from `/home/django` to
`/opt/cvat`. If your deployment bind-mounts files into the application source
tree, update their container paths before starting the new version. For example,
mount a custom settings module at
`/opt/cvat/cvat_enterprise/settings/custom_settings.py` and a replacement logo
at `/opt/cvat/cvat/apps/engine/static/logo.svg`.

The CVAT data directories and `auth_config.yml` are not application source
files: they remain under `/home/django` (for example,
`/home/django/auth_config.yml`).

## How to upgrade CVAT from v2.46.0 to v2.47.0.

In version 2.47.0, CVAT upgraded the FFmpeg library it uses to split videos into frames from 4.3.1 to 8.0.
There is a small chance that some video files may not be processed differently by the new FFmpeg version.

If one of your tasks is affected, follow the guide in ./utils/ffmpeg_compatibility/README.md

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
   {{< ilink "/docs/administration/community/advanced/backup_guide" "backup guide" >}} and backup CVAT database volume.

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
   {{< ilink "/docs/administration/community/basics/installation#how-to-get-cvat-source-code" "installation guide" >}}
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

# Migrate Redis from Bitnami to CloudPirates

This procedure applies to CVAT installations deployed with the Helm chart. It
migrates a standalone Redis instance from the Bitnami chart to the
CloudPirates chart.

The migration requires downtime. Do not start it while imports, exports,
backups, or other background jobs are running.

There are two ways to transfer the Redis data:

- Reuse the existing persistent volume claim (PVC). Use this method when the
  old and new Redis instances run in the same Kubernetes cluster and the
  existing volume can be attached to the new pod.
- Export and restore an RDB file. Use this method when a new PVC is required or
  when the storage cannot be reused directly.


## Before you begin

1. Confirm that the current Redis deployment uses the `standalone`
   architecture. This procedure does not cover Redis replication, Sentinel, or
   Redis Cluster.
1. Keep the Redis server version unchanged during the chart migration. Upgrade
   Redis itself in a separate maintenance operation after the chart migration
   has been completed and data migration is verified.
1. Check that the node or volume has enough free space for an RDB snapshot. (If you have chosen RDB dump method)

### This guide uses the following environment variables:

```shell
export CVAT_NAMESPACE="cvat"
export CVAT_RELEASE="cvat"
export REDIS_POD_NAME="cvat-redis-master-0"
```

## Put CVAT into maintenance mode

Scale the CVAT backend and frontend deployments to zero before upgrading the
Helm release. At this point the release must still use Bitnami Redis.

So we have added values-maintenance.yaml file to the chart that will scale down CVAT writers.
Please be sure that it is added last in a chain values files.
```shell
helm -n $CVAT_NAMESPACE upgrade $CVAT_RELEASE path_to_chart -f your_values_file -f values-maintenance.yaml
```

ex: `helm -n cvat upgrade cvat . -f myvalues.yaml -f values-maintenance.yaml`

The Bitnami Redis pod must remain running.

```shell
kubectl get pods --namespace "$CVAT_NAMESPACE"
```

```shell
kubectl exec --namespace "$CVAT_NAMESPACE" -it $REDIS_POD_NAME -- /bin/bash
```

ex. kubectl -n cvat exec -it cvat-redis-master-0 -- /bin/bash

Login to the Redis cli with your Redis password (you can find Redis password in your Redis secret)
```shell
redis-cli -a your_password_for_redis
```

Record the database size and keyspace information. `DBSIZE` reports the number
of keys in the currently selected database; `INFO keyspace` reports all
non-empty databases.

```shell
DBSIZE
INFO keyspace
```

Create the final RDB snapshot, just run this command in the Redis cli:

```shell
SAVE
exit
exit
```

The command must return `OK`. Do not continue if it fails.

Copy dump locally, even if you will be using PVC method, just in case.
```shell
kubectl cp \
  "$CVAT_NAMESPACE/$REDIS_POD_NAME:/data/dump.rdb" \
  ./cvat-redis-dump.rdb
```

## Method 1: Reuse the existing PVC

Find the PVC mounted as the Bitnami Redis data volume:

```shell
OLD_REDIS_PVC=$(kubectl get pod \
  --namespace "$CVAT_NAMESPACE" \
  $REDIS_POD_NAME \
  -o jsonpath='{.spec.volumes[?(@.name=="redis-data")].persistentVolumeClaim.claimName}')

echo "$OLD_REDIS_PVC"
```

Do not continue if the command returns an empty value.

Find the persistent volume and check its reclaim policy:

```shell
REDIS_PV=$(kubectl get pvc \
  --namespace "$CVAT_NAMESPACE" \
  "$OLD_REDIS_PVC" \
  -o jsonpath='{.spec.volumeName}')

kubectl get pv "$REDIS_PV" \
  -o jsonpath='{.spec.persistentVolumeReclaimPolicy}{"\n"}'
```

If the policy is `Delete`, change it to `Retain` before replacing the
StatefulSet:

```shell
kubectl patch pv "$REDIS_PV" \
  --type merge \
  -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

Add the existing claim to your Helm chart values file.

```yaml
redis:
  persistence:
    existingClaim: "<existing-redis-pvc>"
```

The `existingClaim` setting must remain in the values file after the migration.
Removing it causes the CloudPirates StatefulSet to use a different PVC.

If you want to update file permissions on the PVC, because Bitnami and CloudPirates
use different user IDs, enable the CloudPirates volume-permissions init
container, provided that the cluster security policy permits it:

```yaml
redis:
  volumePermissions:
    enabled: true
```

Continue with [Prepare and install the new chart](#prepare-and-install-the-new-chart).

## Method 2: Transfer an RDB dump

Connect to the Redis pod:

```shell
kubectl exec --namespace "$CVAT_NAMESPACE" -it $REDIS_POD_NAME -- /bin/bash
```

Login to the Redis cli with your Redis password (you can find Redis password in your Redis secret)
```shell
redis-cli -a your_password_for_redis
```

Confirm the source data directory:

```shell
CONFIG GET dir
exit
exit
```

The standard Bitnami configuration returns `/data`.

Copy the snapshot to a machine with enough free disk space:

```shell
kubectl cp \
  "$CVAT_NAMESPACE/$REDIS_POD_NAME:/data/dump.rdb" \
  ./cvat-redis-dump.rdb
```

Keep this file until the migration and the CVAT upgrade have been verified,
then continue with the next section.

## Prepare and install the new chart

Ensure that redis service name override is empty. This setting was added to ensure Bitnami Redis
compatibility, however for CloudPirates Redis the name of the service is generated by Helm helper function,
so no override is needed.

```yaml
cvat:
  backend:
    redisInmemHostOverride: ""
```

In the target CVAT version, `Chart.yaml` must refer to the CloudPirates chart:

```yaml
- name: redis
  version: "0.32.4"
  repository: https://cloudpirates-io.github.io/helm-charts
  condition: redis.enabled
```

Update the chart dependencies and check the result:

```shell
cd your_helm_chart_directory
helm dependency update
helm dependency list
```

The dependency list must contain one `redis` entry with the CloudPirates
repository and an `ok` status. An `incorrect version` status means that
`Chart.lock` or the Redis archive in the `charts` directory does not match
`Chart.yaml`.

Use the same Redis password secret and secret key that were used by the
Bitnami deployment. For the standard CVAT chart, the relevant settings are:

```yaml
redis:
  auth:
    existingSecret: "{{ .Release.Name }}-redis-secret"
    existingSecretPasswordKey: password
```

Install the new chart while keeping CVAT in maintenance mode. Include every
values file used by the existing release, in the same order, followed by the
`values-maintenance.yaml`:

```shell
cd your_cvat_helm_chart_directory

helm upgrade \
  --namespace "$CVAT_NAMESPACE" \
  "$CVAT_RELEASE" \
   . \
  -f "your-cvat-values.yaml" \
  -f "values-maintenance.yaml"
```

Wait for the CloudPirates Redis pod to become ready.

For the PVC method, continue with
[Verify the migrated data](#verify-the-migrated-data).

For the RDB method, restore the dump before verification.

## Restore the RDB dump

This section applies only to the RDB method.

Connect to the new Redis pod and check its persistence settings:

```shell
NEW_REDIS_POD="$CVAT_RELEASE-redis-0"

kubectl exec --namespace "$CVAT_NAMESPACE" "$NEW_REDIS_POD" -it -- /bin/bash

redis-cli -a your_password_for_redis

CONFIG GET dir

CONFIG GET appendonly
exit
exit
```

Continue only if the data directory is `/data` and `appendonly` is `no`. When
AOF is enabled, Redis does not restore its state from the RDB file in this
procedure. (By default CloudPirates Redis does not use AOF)

Copy the saved snapshot into the new pod:

```shell
kubectl cp \
  ./cvat-redis-dump.rdb \
  "$CVAT_NAMESPACE/$NEW_REDIS_POD:/data/dump.rdb"
```

Restart Redis without saving the empty database that is currently in memory:

```shell
kubectl exec --namespace "$CVAT_NAMESPACE" "$NEW_REDIS_POD" -- \
  env REDISCLI_AUTH="your_redis_password" redis-cli SHUTDOWN NOSAVE
```

The connection closes when Redis stops. Kubernetes restarts the container, and
Redis loads `/data/dump.rdb` during startup.

Redis might overwrite your backup when it receives SIGTERM signal from Kubernetes,
so we need to force it not to save its state during
shutdown. This is done by using `SHUTDOWN NOSAVE` command.

Wait for the pod to become ready again.

## Verify the migrated data

Check the database size and keyspace information in the new Redis instance:

```shell
NEW_REDIS_POD="$CVAT_RELEASE-redis-0"

kubectl exec --namespace "$CVAT_NAMESPACE" "$NEW_REDIS_POD" -it -- /bin/bash

redis-cli -a your_password_for_redis

DBSIZE

INFO keyspace
```

Compare the output with the values recorded before the migration. Expiring
keys can make the counts slightly lower. Investigate large differences before
bringing CVAT back online.

Use `SCAN` for an optional key check:

```shell
SCAN 0 MATCH "rq:*" COUNT 100
```

## Bring CVAT back online

Change `redisInmemHostOverride` to the empty value in the values.yaml file.
Otherwise, the backend will not be able to connect to the new Redis instance.
Please remember that last values file in the chain has the highest priority.

```yaml
cvat:
  backend:
    redisInmemHostOverride: ""
```

Run the upgrade again without `values-maintenance.yaml`. Keep the migration
values file in the command:

```shell
cd your_cvat_helm_chart_directory

helm upgrade \
  --namespace "$CVAT_NAMESPACE" \
  "$CVAT_RELEASE" \
   . \
  -f your_cvat_helm_chart_values.yaml
```

Wait for the backend and frontend deployments to become ready. Check the
backend logs for Redis connection or authentication errors, then verify login
and run a small background operation such as an export.

Do not delete the local RDB dump until these checks have passed
and the normal backup policy has produced a new verified backup.
Old PVC is now used by the new Redis pod if you have chosen the PVC method. If not, you can delete it
after data was validated.

## Things to notice

1. Bitnami Redis uses a different user ID than CloudPirates Redis.
   It might cause issues and can be fixed with `volumePermissions.enabled: true`.
2. Bitnami Redis uses AOF, while CloudPirates Redis does not.
   AOF can be enabled using Helm values after the migration is complete.
3. Do not delete backups immediately after migration.
