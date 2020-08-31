# Frequently asked questions
- [How to update CVAT](#how-to-update-cvat)
- [Kibana app works, but no logs are displayed](#kibana-app-works-but-no-logs-are-displayed)
- [How to change default CVAT hostname or port](#how-to-change-default-cvat-hostname-or-port)
- [How to configure connected share folder on Windows](#how-to-configure-connected-share-folder-on-windows)
- [How to make unassigned tasks not visible to all users](#how-to-make-unassigned-tasks-not-visible-to-all-users)
- [Where are uploaded images/videos stored](#where-are-uploaded-imagesvideos-stored)
- [Where are annotations stored](#where-are-annotations-stored)
- [How to mark job/task as completed](#how-to-mark-jobtask-as-completed)
- [How to install CVAT on Windows 10 Home](#how-to-install-cvat-on-windows-10-home)
- [I do not have the Analytics tab on the header section. How can I add analytics](#i-do-not-have-the-analytics-tab-on-the-header-section-how-can-i-add-analytics)
- [How to upload annotations to an entire task from UI when there are multiple jobs in the task](#how-to-upload-annotations-to-an-entire-task-from-ui-when-there-are-multiple-jobs-in-the-task)

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

## Where are uploaded images/videos stored
The uploaded data is stored in the `cvat_data` docker volume:
```yml
volumes:
  - cvat_data:/home/django/data
```

## Where are annotations stored
Annotations are stored in the PostgreSQL database. The database files are stored in the `cvat_db` docker volume:
```yml
volumes:
  - cvat_db:/var/lib/postgresql/data
```

## How to mark job/task as completed
The status is set by the user in the [Info window](user_guide.md#info) of the job annotation view.
There are three types of status: annotation, validation or completed.
The status of the job changes the progress bar of the task.

## How to install CVAT on Windows 10 Home
Follow this [guide](installation.md#windows-10).

## I do not have the Analytics tab on the header section. How can I add analytics
You should build CVAT images with ['Analytics' component](../../../components/analytics).

## How to upload annotations to an entire task from UI when there are multiple jobs in the task
You can upload annotation for a multi-job task from the Dasboard view or the Task view.
Uploading of annotation from the Annotation view only affects the current job.
