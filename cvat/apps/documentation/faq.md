# Frequently asked questions
- [How to update CVAT](#how-to-update-cvat)
- [Kibana app works, but no logs are displayed](#kibana-app-works-but-no-logs-are-displayed)
- [How to change default CVAT hostname or port](#how-to-change-default-cvat-hostname-or-port)
- [How to configure connected share folder on Windows](#how-to-configure-connected-share-folder-on-windows)
- [How to make unassigned tasks not visible to all users](#how-to-make-unassigned-tasks-not-visible-to-all-users)
- [Can Nvidia GPU be used to run inference with my own model](#can-nvidia-gpu-be-used-to-run-inference-with-my-own-model)

## How to update CVAT
Before upgrading, please follow the official docker
[manual](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes) and backup all CVAT volumes.

To update CVAT, you should clone or download the new version of CVAT and rebuild the CVAT docker images as usual.
```sh
docker-compose build
```
and run containers:
```sh
docker-compose up -d
```

Sometimes the update process takes a lot of time due to changes in the database schema and data.
You can check the current status with `docker logs cvat`.
Please do not terminate the migration and wait till the process is complete.

## Kibana app works, but no logs are displayed
Make sure there aren't error messages from Elasticsearch:
```sh
docker logs cvat_elasticsearch
```
If you see errors like this:
```sh
lood stage disk watermark [95%] exceeded on [uMg9WI30QIOJxxJNDiIPgQ][uMg9WI3][/usr/share/elasticsearch/data/nodes/0] free: 116.5gb[4%], all indices on this node will be marked read-only
```
You should free up disk space or change the threshold, to do so check: [Elasticsearch documentation](https://www.elastic.co/guide/en/elasticsearch/reference/6.8/disk-allocator.html).

## How to change default CVAT hostname or port
The best way to do that is to create docker-compose.override.yml and override the host and port settings here.

version: "2.3"
```yaml
services:
  cvat_proxy:
    environment:
      CVAT_HOST: example.com
    ports:
      - "80:80"
```

Please don't forget to include this file in docker-compose commands
using the `-f` option (in some cases it can be omitted).

## How to configure connected share folder on Windows
Follow the Docker manual and configure the directory that you want to use as a shared directory:
- [Docker toolbox manual](https://docs.docker.com/toolbox/toolbox_install_windows/#optional-add-shared-directories)
- [Docker for windows (see FILE SHARING section)](https://docs.docker.com/docker-for-windows/#resources)

After that, it should be possible to use this directory as a CVAT share:
```yaml
version: "2.3"

services:
  cvat:
    volumes:
      - cvat_share:/home/django/share:ro

volumes:
  cvat_share:
    driver_opts:
      type: none
      device: /d/my_cvat_share
      o: bind
```

## How to make unassigned tasks not visible to all users
Set [reduce_task_visibility](../../settings/base.py#L424) variable to `True`.

## Can Nvidia GPU be used to run inference with my own model
Nvidia GPU can be used to accelerate inference of [tf_annotation](../../../components/tf_annotation/README.md) and [auto_segmentation](../../../components/auto_segmentation/README.md) models.

OpenVino doesn't support Nvidia cards, so you can run your own models only on CPU.
