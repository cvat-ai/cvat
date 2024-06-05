---
title: 'Frequently asked questions'
linkTitle: 'FAQ'
weight: 3
description: 'Answers to frequently asked questions'
---

<!--lint disable heading-style-->

## How to migrate data from CVAT.org to CVAT.ai

Please follow the {{< ilink "/docs/manual/advanced/backup#backup" "export tasks and projects guide" >}} to
download an archive with data which corresponds to your task or project. The backup for a
project will have all tasks which are inside the project. Thus you don't need to export
them separately.

Please follow the {{< ilink "/docs/manual/advanced/backup#create-from-backup" "import tasks and projects guide" >}}
to upload your backup with a task or project to a CVAT instance.

See a quick demo below. It is really a simple process. If your data is huge, it may take some time.
Please be patient.

![Export and import backup demo](
  https://user-images.githubusercontent.com/40690625/180879954-44afcd95-1e94-451a-9a60-2f3bd6482cbf.gif)


## How to upgrade CVAT

Before upgrading, please follow the {{< ilink "/docs/administration/advanced/backup_guide" "backup guide" >}}
and backup all CVAT volumes.

Follow the {{< ilink "/docs/administration/advanced/upgrade_guide" "upgrade guide" >}}.

## How to change default CVAT hostname or port

To change the hostname, simply set the `CVAT_HOST` environment variable

```bash
export CVAT_HOST=<YOUR_HOSTNAME_OR_IP>
```
NOTE, if you're using `docker compose` with `sudo` to run CVAT, then please add the `-E` (or `--preserve-env`)
flag to preserve the user environment variable which set above to take effect in your docker containers:

```bash
sudo -E docker compose up -d
```

If you want to change the default web application port, change the `ports` part of `traefik` service configuration
in `docker-compose.yml`

```yml
services:
  traefik:
    ...
    ...
    ports:
      - <YOUR_WEB_PORTAL_PORT>:8080
      - 8090:8090
```

Note that changing the port does not make sense if you are using HTTPS - port 443 is conventionally
used for HTTPS connections, and is needed for Let's Encrypt [TLS challenge](https://doc.traefik.io/traefik/https/acme/#tlschallenge).

## How to configure connected share folder on Windows

Follow the Docker manual and configure the directory that you want to use as a shared directory:

- [Docker toolbox manual](https://docs.docker.com/toolbox/toolbox_install_windows/#optional-add-shared-directories)
- [Docker for windows (see FILE SHARING section)](https://docs.docker.com/docker-for-windows/#resources)

After that, it should be possible to use this directory as a CVAT share:

```yaml
services:
  cvat_server:
    volumes:
      - cvat_share:/home/django/share:ro
  cvat_worker_import:
    volumes:
      - cvat_share:/home/django/share:ro
  cvat_worker_export:
    volumes:
      - cvat_share:/home/django/share:ro
  cvat_worker_annotation:
    volumes:
      - cvat_share:/home/django/share:ro

volumes:
  cvat_share:
    driver_opts:
      type: none
      device: /d/my_cvat_share
      o: bind
```

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


## How to install CVAT on Windows 10 Home

Follow this {{< ilink "/docs/administration/basics/installation#windows-10" "guide" >}}.

## I do not have the Analytics tab on the header section. How can I add analytics

You should build CVAT images with ['Analytics' component](https://github.com/cvat-ai/cvat/tree/develop/components/analytics).

## How to upload annotations to an entire task from UI when there are multiple jobs in the task

You can upload annotation for a multi-job task from the Dasboard view or the Task view.
Uploading of annotation from the Annotation view only affects the current job.

## How to specify multiple hostnames

To do this, you will need to edit `traefik.http.<router>.cvat.rule` docker label for both the
`cvat` and `cvat_ui` services, like so
(see [the documentation](https://doc.traefik.io/traefik/routing/routers/#rule) on Traefik rules for more details):

```yaml
  cvat_server:
    labels:
      - traefik.http.routers.cvat.rule=(Host(`example1.com`) || Host(`example2.com`)) &&
          PathPrefix(`/api/`, `/analytics/`, `/static/`, `/admin`, `/documentation/`, `/django-rq`)

  cvat_ui:
    labels:
      - traefik.http.routers.cvat-ui.rule=Host(`example1.com`) || Host(`example2.com`)
```

## How to create a task with multiple jobs

Set the segment size when you create a new task, this option is available in the
{{< ilink "/docs/manual/basics/create_an_annotation_task#advanced-configuration" "Advanced configuration" >}}
section.

## How to transfer CVAT to another machine

Follow the
{{< ilink "/docs/administration/advanced/backup_guide#how-to-backup-all-cvat-data" "backup/restore guide" >}}.

## How to load your own DL model into CVAT

See the information here in the
{{< ilink "/docs/manual/advanced/serverless-tutorial#adding-your-own-dl-models" "Serverless tutorial" >}}.

## My server uses a custom SSL certificate and I don't want to check it.

You can call control SSL certificate check with the `--insecure` CLI argument.
For SDK, you can specify `ssl_verify = True/False` in the `cvat_sdk.core.client.Config` object.

