---
title: 'Backup guide'
linkTitle: 'Backup guide'
weight: 50
description: 'Instructions on how to backup CVAT data with Docker.'
---

<!--lint disable heading-style-->

## About CVAT data volumes

Docker volumes are used to store all CVAT data:

- `cvat_db`: PostgreSQL database files, used to store information about users, tasks, projects, annotations, etc.
  Mounted into `cvat_db` container by `/var/lib/postgresql/data` path.

- `cvat_data`: used to store uploaded and prepared media data.
  Mounted into `cvat` container by `/home/django/data` path.

- `cvat_keys`: used to store the [Django secret key](https://docs.djangoproject.com/en/4.2/ref/settings/#std-setting-SECRET_KEY).
  Mounted into `cvat` container by `/home/django/keys` path.

- `cvat_logs`: used to store logs of CVAT backend processes managed by supevisord.
  Mounted into `cvat` container by `/home/django/logs` path.

- `cvat_events`: this is an optional volume that is used only when
  {{< ilink "/docs/administration/advanced/analytics" "Analytics component" >}}
  is enabled and is used to store Elasticsearch database files.
  Mounted into `cvat_elasticsearch` container by `/usr/share/elasticsearch/data` path.

## How to backup all CVAT data

All CVAT containers should be stopped before backup:

```shell
docker compose stop
```

Please don't forget to include all the compose config files that were used in the `docker compose` command
using the `-f` parameter.

Backup data:

```shell
mkdir backup
docker run --rm --name temp_backup --volumes-from cvat_db -v $(pwd)/backup:/backup ubuntu tar -czvf /backup/cvat_db.tar.gz /var/lib/postgresql/data
docker run --rm --name temp_backup --volumes-from cvat_server -v $(pwd)/backup:/backup ubuntu tar -czvf /backup/cvat_data.tar.gz /home/django/data
# [optional]
docker run --rm --name temp_backup --volumes-from cvat_elasticsearch -v $(pwd)/backup:/backup ubuntu tar -czvf /backup/cvat_events.tar.gz /usr/share/elasticsearch/data
```

Make sure the backup archives have been created, the output of `ls backup` command should look like this:

```shell
ls backup
cvat_data.tar.gz  cvat_db.tar.gz  cvat_events.tar.gz
```

## How to restore CVAT from backup

**Warning: use exactly the same CVAT version to restore DB. Otherwise
it will not work because between CVAT releases the layout of DB can be
changed. You always can upgrade CVAT later. It will take care to migrate
your data properly internally.**

Note: CVAT containers must exist (if no, please follow the
{{< ilink "/docs/administration/basics/installation#quick-installation-guide" "installation guide" >}}).
Stop all CVAT containers:

```shell
docker compose stop
```

Restore data:

```shell
cd <path_to_backup_folder>
docker run --rm --name temp_backup --volumes-from cvat_db -v $(pwd):/backup ubuntu bash -c "cd /var/lib/postgresql/data && tar -xvf /backup/cvat_db.tar.gz --strip 4"
docker run --rm --name temp_backup --volumes-from cvat_server -v $(pwd):/backup ubuntu bash -c "cd /home/django/data && tar -xvf /backup/cvat_data.tar.gz --strip 3"
# [optional]
docker run --rm --name temp_backup --volumes-from cvat_elasticsearch -v $(pwd):/backup ubuntu bash -c "cd /usr/share/elasticsearch/data && tar -xvf /backup/cvat_events.tar.gz --strip 4"
```

After that run CVAT as usual:

```shell
docker compose up -d
```

## Additional resources

[Docker guide about volume backups](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)
