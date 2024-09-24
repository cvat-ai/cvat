job "{###JOB_UUID###}" {
  datacenters = ["ifca-ai4eosc"]
  namespace = "ai4eosc"
  type = "service"

  meta {
    force_pull_img_cvat_server         = false
    force_pull_img_cvat_ui             = false
    cvat_version                       = "v2.7.3"
    cvat_version_custom                = "-AI4OS"
    #
    cvat_hostname                      = "ifca-deployments.cloud.ai4eosc.eu"
    #
    # CVAT instance name so that '${META_job_uuid}.${META_cvat_hostname}' is unique.
    job_uuid                           = "{###JOB_UUID###}"
    #
    grafana_clickhouse_plugin_version  = "3.3.0"
    smokescreen_opts                   = ""
    clickhouse_image                   = "clickhouse/clickhouse-server:22.3-alpine"
    db_image                           = "postgres:16.4-alpine"
    grafana_image                      = "grafana/grafana-oss:9.3.6"
    redis_image                        = "eqalpha/keydb:x86_64_v6.3.2"
    ui_image                           = "registry.services.ai4os.eu/ai4os/ai4-cvat-ui"
    opa_image                          = "openpolicyagent/opa:0.45.0-rootless"
    vector_image                       = "timberio/vector:0.26.0-alpine"
    server_image                       = "registry.services.ai4os.eu/ai4os/ai4-cvat-server"
    su_username                        = "admin"
    su_password                        = "{###CVAT_SU_PASSWORD###}"
    su_email                           = "{###CVAT_SU_EMAIL###}"
    #
    # rclone
    RCLONE_CONFIG                      = "/srv/.rclone/rclone.conf"
    RCLONE_CONFIG_RSHARE_TYPE          = "webdav"
    RCLONE_CONFIG_RSHARE_URL           = "https://share.services.ai4os.eu/remote.php/dav/files/{###CVAT_NEXTCLOUD_USER###}"
    RCLONE_CONFIG_RSHARE_VENDOR        = "nextcloud"
    RCLONE_CONFIG_RSHARE_USER          = "{###CVAT_NEXTCLOUD_USER###}"
    RCLONE_CONFIG_RSHARE_PASS          = "{###CVAT_NEXTCLOUD_PASSWORD###}"
    #
    # remote path common for CVAT instances, without trailing /
    RCLONE_REMOTE_PATH                 = "/ai4os-storage/tools/cvat"
  }

  group "cvat" {

    # Only launch in compute nodes (to avoid clashing with system jobs, eg. Traefik)
    constraint {
      attribute = "${meta.compute}"
      operator  = "="
      value     = "true"
    }

    # Avoid rescheduling the job on **other** nodes during a network cut
    # Command not working due to https://github.com/hashicorp/nomad/issues/16515
    reschedule {
      attempts  = 0
      unlimited = false
    }

    ephemeral_disk {
      size = 4096
    }

    network {
      port "ui" {
        to = 80
      }
      port "server" {
        to = 8080
      }
      port "utils" {
        to = 8080
      }
      port "worker-import" {
        to = 8080
      }
      port "worker-export" {
        to = 8080
      }
      port "worker-annotation" {
        to = 8080
      }
      port "worker-webhooks" {
        to = 8080
      }
      port "worker-quality-reports" {
        to = 8080
      }
      port "worker-analytics-reports" {
        to = 8080
      }
      port "opa" {
        to = 8181
      }
      port "grafana" {
        to = 3000
      }
      port "db" {
        to = 5432
      }
      port "redis" {
        to = 6379
      }
      port "clickhouse_native" {
        to = 9000
      }
      port "clickhouse_http" {
        to = 8123
      }
      port "clickhouse_inter_server" {
        to = 9009
      }
      port "vector" {
        to = 80
      }
    }

    service {
      name = "${BASE}-ui"
      port = "ui"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.${NOMAD_META_job_uuid}-ui.tls=true",
        "traefik.http.routers.${NOMAD_META_job_uuid}-ui.entrypoints=websecure",
        "traefik.http.routers.${NOMAD_META_job_uuid}-ui.rule=Host(`${NOMAD_META_job_uuid}.${NOMAD_META_cvat_hostname}`)"
      ]
    }

    service {
      name = "${BASE}-server"
      port = "server"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.${NOMAD_META_job_uuid}-server.tls=true",
        "traefik.http.routers.${NOMAD_META_job_uuid}-server.entrypoints=websecure",
        "traefik.http.routers.${NOMAD_META_job_uuid}-server.rule=Host(`${NOMAD_META_job_uuid}.${NOMAD_META_cvat_hostname}`) && PathPrefix(`/api/`, `/static/`, `/admin`, `/documentation/`, `/django-rq`)"
      ]
    }

    service {
      name = "${BASE}-grafana"
      port = "grafana"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.${NOMAD_META_job_uuid}-grafana.tls=true",
        "traefik.http.routers.${NOMAD_META_job_uuid}-grafana.entrypoints=websecure",
        "traefik.http.routers.${NOMAD_META_job_uuid}-grafana.rule=Host(`${NOMAD_META_job_uuid}.${NOMAD_META_cvat_hostname}`) && PathPrefix(`/analytics`)",
        "traefik.http.middlewares.${NOMAD_META_job_uuid}-grafana-analytics-auth.forwardauth.address=http://${NOMAD_HOST_ADDR_server}/analytics",
        "traefik.http.middlewares.${NOMAD_META_job_uuid}-grafana-analytics-auth.forwardauth.authRequestHeaders=Cookie,Authorization",
        "traefik.http.middlewares.${NOMAD_META_job_uuid}-grafana-analytics-strip-prefix.stripprefix.prefixes=/analytics",
        "traefik.http.routers.${NOMAD_META_job_uuid}-grafana.middlewares=${NOMAD_META_job_uuid}-grafana-analytics-auth@consulcatalog,${NOMAD_META_job_uuid}-grafana-analytics-strip-prefix@consulcatalog",
        "traefik.services.${NOMAD_META_job_uuid}-grafana.loadbalancer.servers.url=${NOMAD_HOST_ADDR_grafana}",
        "traefik.services.${NOMAD_META_job_uuid}-grafana.loadbalancer.passHostHeader=false"
      ]
    }

    task "share" {
      lifecycle {
        hook = "prestart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      env {
        RCLONE_CONFIG               = "${NOMAD_META_RCLONE_CONFIG}"
        RCLONE_CONFIG_RSHARE_TYPE   = "webdav"
        RCLONE_CONFIG_RSHARE_URL    = "${NOMAD_META_RCLONE_CONFIG_RSHARE_URL}"
        RCLONE_CONFIG_RSHARE_VENDOR = "${NOMAD_META_RCLONE_CONFIG_RSHARE_VENDOR}"
        RCLONE_CONFIG_RSHARE_USER   = "${NOMAD_META_RCLONE_CONFIG_RSHARE_USER}"
        RCLONE_CONFIG_RSHARE_PASS   = "${NOMAD_META_RCLONE_CONFIG_RSHARE_PASS}"
        REMOTE_PATH                 = "rshare:${NOMAD_META_RCLONE_REMOTE_PATH}"
        LOCAL_PATH                  = "/alloc/data"
      }
      config {
        force_pull = true
        image   = "registry.services.ai4os.eu/ai4os/docker-storage:latest"
        privileged = true
        mount {
          type = "bind"
          target = "/srv/.rclone/rclone.conf"
          source = "local/rclone.conf"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/entrypoint.sh"
          source = "local/entrypoint.sh"
          readonly = false
        }
        entrypoint = [
          "/bin/bash",
          "-c",
          "chmod +x /entrypoint.sh; /entrypoint.sh"
        ]
      }
      template {
        data = <<-EOF
        [ai4eosc-share]
        type = webdav
        url = https://share.services.ai4os.eu/remote.php/dav
        vendor = nextcloud
        user = ${NOMAD_META_RCLONE_CONFIG_RSHARE_USER}
        pass = ${NOMAD_META_RCLONE_CONFIG_RSHARE_PASS}
        EOF
        destination = "local/rclone.conf"
      }
      template {
        data = <<-EOF
        export RCLONE_CONFIG_RSHARE_PASS=$(rclone obscure $RCLONE_CONFIG_RSHARE_PASS)
        rm -rf $LOCAL_PATH/share
        mkdir -p $LOCAL_PATH/share
        rclone mkdir $REMOTE_PATH/share
        rclone mount $REMOTE_PATH/share $LOCAL_PATH/share \
          --uid 1000 \
          --gid 1000 \
          --dir-perms 0750 \
          --allow-non-empty \
          --allow-other \
          --vfs-cache-mode full
        EOF
        destination = "local/entrypoint.sh"
      }
      resources {
        cpu    = 50        # minimum number of CPU MHz is 2
        memory = 2000
      }
    }

    task "synclocal" {
      lifecycle {
        hook = "prestart"
        sidecar = "false"
      }
      driver = "docker"
      kill_timeout = "30s"
      env {
        RCLONE_CONFIG               = "${NOMAD_META_RCLONE_CONFIG}"
        RCLONE_CONFIG_RSHARE_TYPE   = "webdav"
        RCLONE_CONFIG_RSHARE_URL    = "${NOMAD_META_RCLONE_CONFIG_RSHARE_URL}"
        RCLONE_CONFIG_RSHARE_VENDOR = "${NOMAD_META_RCLONE_CONFIG_RSHARE_VENDOR}"
        RCLONE_CONFIG_RSHARE_USER   = "${NOMAD_META_RCLONE_CONFIG_RSHARE_USER}"
        RCLONE_CONFIG_RSHARE_PASS   = "${NOMAD_META_RCLONE_CONFIG_RSHARE_PASS}"
        REMOTE_PATH                 = "rshare:${NOMAD_META_RCLONE_REMOTE_PATH}"
        LOCAL_PATH                  = "/alloc/data"
      }
      config {
        force_pull = true
        image   = "registry.services.ai4os.eu/ai4os/docker-storage:latest"
        mount {
          type = "bind"
          target = "/srv/.rclone/rclone.conf"
          source = "local/rclone.conf"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/sync_local.sh"
          source = "local/sync_local.sh"
          readonly = false
        }
        entrypoint = [
          "/bin/bash",
          "-c",
          "chmod +x /sync_local.sh; /sync_local.sh"
        ]
      }
      template {
        data = <<-EOF
        [ai4eosc-share]
        type = webdav
        url = https://share.services.ai4os.eu/remote.php/dav
        vendor = nextcloud
        user = ${NOMAD_META_RCLONE_CONFIG_RSHARE_USER}
        pass = ${NOMAD_META_RCLONE_CONFIG_RSHARE_PASS}
        EOF
        destination = "local/rclone.conf"
      }
      template {
        data = <<-EOF
        #!/usr/bin/env bash
        tarbals='db data events redis'
        export RCLONE_CONFIG_RSHARE_PASS=$(rclone obscure $RCLONE_CONFIG_RSHARE_PASS)
        for tarbal in $tarbals; do
            rm -rf $LOCAL_PATH/$tarbal
            mkdir -p $LOCAL_PATH/$tarbal
            if [[ $tarbal == "data" ]]; then
              chown -R 1000 $LOCAL_PATH/data
              chgrp -R 1000 $LOCAL_PATH/data
              chmod -R 750 $LOCAL_PATH/data
            fi
        done
        if [[ $(rclone lsd $REMOTE_PATH/backup; echo $?) == 0 ]]; then
          echo "found a CVAT backup, syncing ..."
          rm -rf $LOCAL_PATH/backup
          mkdir -p $LOCAL_PATH/backup
          rclone sync $REMOTE_PATH/backup $LOCAL_PATH/backup --progress
          for tarbal in $tarbals; do
            if [ -f $LOCAL_PATH/backup/$tarbal.tar.gz ]; then
              echo "restoring $tarbal ..."
              cd $LOCAL_PATH/$tarbal && tar -xvf $LOCAL_PATH/backup/$tarbal.tar.gz --strip 1
            else
              echo "file not found: $LOCAL_PATH/backup/$tarbal.tar.gz"
            fi
          done
        else
          echo "CVAT backup not found"
        fi
        EOF
        destination = "local/sync_local.sh"
      }
      resources {
        cpu    = 50        # minimum number of CPU MHz is 2
        memory = 2000
      }
    }

    task "syncremote" {
      lifecycle {
        hook = "poststop"
        sidecar = "false"
      }
      driver = "docker"
      kill_timeout = "30s"
      env {
        RCLONE_CONFIG               = "${NOMAD_META_RCLONE_CONFIG}"
        RCLONE_CONFIG_RSHARE_TYPE   = "webdav"
        RCLONE_CONFIG_RSHARE_URL    = "${NOMAD_META_RCLONE_CONFIG_RSHARE_URL}"
        RCLONE_CONFIG_RSHARE_VENDOR = "${NOMAD_META_RCLONE_CONFIG_RSHARE_VENDOR}"
        RCLONE_CONFIG_RSHARE_USER   = "${NOMAD_META_RCLONE_CONFIG_RSHARE_USER}"
        RCLONE_CONFIG_RSHARE_PASS   = "${NOMAD_META_RCLONE_CONFIG_RSHARE_PASS}"
        REMOTE_PATH                 = "rshare:${NOMAD_META_RCLONE_REMOTE_PATH}"
        LOCAL_PATH                  = "/alloc/data"
      }
      config {
        force_pull = true
        image   = "registry.services.ai4os.eu/ai4os/docker-storage:latest"
        mount {
          type = "bind"
          target = "/srv/.rclone/rclone.conf"
          source = "local/rclone.conf"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/sync_remote.sh"
          source = "local/sync_remote.sh"
          readonly = false
        }
        entrypoint = [
          "/bin/bash",
          "-c",
          "chmod +x /sync_remote.sh; /sync_remote.sh"
        ]
      }
      template {
        data = <<-EOF
        [ai4eosc-share]
        type = webdav
        url = https://share.services.ai4os.eu/remote.php/dav
        vendor = nextcloud
        user = ${NOMAD_META_RCLONE_CONFIG_RSHARE_USER}
        pass = ${NOMAD_META_RCLONE_CONFIG_RSHARE_PASS}
        EOF
        destination = "local/rclone.conf"
      }
      template {
        data = <<-EOF
        #!/usr/bin/env bash
        tarbals='db data events redis'
        export RCLONE_CONFIG_RSHARE_PASS=$(rclone obscure $RCLONE_CONFIG_RSHARE_PASS)
        echo "creating a CVAT backup ..."
        rm -rf $LOCAL_PATH/backup
        mkdir -p $LOCAL_PATH/backup
        cd $LOCAL_PATH
        for tarbal in $tarbals; do
          echo "creating $tarbal ..."
          tar -czvf $LOCAL_PATH/backup/$tarbal.tar.gz $tarbal
        done
        rclone mkdir $REMOTE_PATH/backup
        rclone sync $LOCAL_PATH/backup $REMOTE_PATH/backup --progress
        EOF
        destination = "local/sync_remote.sh"
      }
      resources {
        cpu    = 50        # minimum number of CPU MHz is 2
        memory = 2000
      }
    }

    task "clickhouse" {
      driver = "docker"
      kill_timeout = "30s"
      resources {
        memory = 2048
      }
      env {
        CLICKHOUSE_DB = "cvat"
        CLICKHOUSE_USER = "user"
        CLICKHOUSE_PASSWORD = "user"
      }
      config {
        image = "${NOMAD_META_clickhouse_image}"
        ports = ["clickhouse_native", "clickhouse_http", "clickhouse_inter_server"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/events:/var/lib/clickhouse"
        ]
        mount {
          type = "bind"
          target = "/docker-entrypoint-initdb.d/init.sh"
          source = "local/docker-entrypoint-initdb.d/init.sh"
          readonly = false
        }
      }
      template {
        data = <<-EOF
          #!/bin/bash
          CLICKHOUSE_DB="$${CLICKHOUSE_DB:-cvat}";
          clickhouse-client --query "CREATE DATABASE IF NOT EXISTS $${CLICKHOUSE_DB};"
          echo "
          CREATE TABLE IF NOT EXISTS $${CLICKHOUSE_DB}.events
          (
              \`scope\` String NOT NULL,
              \`obj_name\` String NULL,
              \`obj_id\` UInt64 NULL,
              \`obj_val\` String NULL,
              \`source\` String NOT NULL,
              \`timestamp\` DateTime64(3, 'Etc/UTC') NOT NULL,
              \`count\` UInt16 NULL,
              \`duration\` UInt32 DEFAULT toUInt32(0),
              \`project_id\` UInt64 NULL,
              \`task_id\` UInt64 NULL,
              \`job_id\` UInt64 NULL,
              \`user_id\` UInt64 NULL,
              \`user_name\` String NULL,
              \`user_email\` String NULL,
              \`org_id\` UInt64 NULL,
              \`org_slug\` String NULL,
              \`payload\` String NULL
          )
          ENGINE = MergeTree
          PARTITION BY toYYYYMM(timestamp)
          ORDER BY (timestamp)
          SETTINGS index_granularity = 8192
          ;" | clickhouse-client
        EOF
        destination = "local/docker-entrypoint-initdb.d/init.sh"
      }
    }

    task "grafana" {
      driver = "docker"
      kill_timeout = "30s"
      env {
        GF_PATHS_PROVISIONING = "/etc/grafana/provisioning"
        GF_AUTH_BASIC_ENABLED = false
        GF_AUTH_ANONYMOUS_ENABLED = true
        GF_AUTH_ANONYMOUS_ORG_ROLE = "Admin"
        GF_AUTH_DISABLE_LOGIN_FORM = true
        GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS = "grafana-clickhouse-datasource"
        GF_SERVER_ROOT_URL = "http://${NOMAD_META_job_uuid}.${NOMAD_META_cvat_hostname}/analytics"
        GF_INSTALL_PLUGINS = "https://github.com/grafana/clickhouse-datasource/releases/download/v${NOMAD_META_grafana_clickhouse_plugin_version}/grafana-clickhouse-datasource-${NOMAD_META_grafana_clickhouse_plugin_version}.linux_amd64.zip;grafana-clickhouse-datasource"
        GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH = "/var/lib/grafana/dashboards/all_events.json"
      }
      config {
        image = "${NOMAD_META_grafana_image}"
        ports = ["grafana"]
        mount {
          type = "bind"
          target = "/var/lib/grafana/dashboards/all_events.json"
          source = "local/var/lib/grafana/dashboards/all_events.json"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/var/lib/grafana/dashboards/management.json"
          source = "local/var/lib/grafana/dashboards/management.json"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/var/lib/grafana/dashboards/monitoring.json"
          source = "local/var/lib/grafana/dashboards/monitoring.json"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/etc/grafana/provisioning/dashboards/dashboard.yaml"
          source = "local/etc/grafana/provisioning/dashboards/dashboard.yaml"
          readonly = false
        }
        mount {
          type = "bind"
          target = "/etc/grafana/provisioning/datasources/ds.yaml"
          source = "local/etc/grafana/provisioning/datasources/ds.yaml"
          readonly = false
        }
        command = "exec"
        args = [
          "/run.sh"
        ]
      }
      artifact {
        source = "https://github.com/ai4os/ai4-cvat/raw/${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}/components/analytics/grafana/dashboards/all_events.json"
        destination = "local/var/lib/grafana/dashboards/"
      }
      artifact {
        source = "https://github.com/ai4os/ai4-cvat/raw/${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}/components/analytics/grafana/dashboards/management.json"
        destination = "local/var/lib/grafana/dashboards/"
      }
      artifact {
        source = "https://github.com/ai4os/ai4-cvat/raw/${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}/components/analytics/grafana/dashboards/monitoring.json"
        destination = "local/var/lib/grafana/dashboards/"
      }
      template {
        data = <<-EOF
        apiVersion: 1
        providers:
          - name: cvat-logs
            type: file
            updateIntervalSeconds: 30
            options:
              path: /var/lib/grafana/dashboards
              foldersFromFilesStructure: true
        EOF
        destination = "local/etc/grafana/provisioning/dashboards/dashboard.yaml"
      }
      template {
        data = <<-EOF
        apiVersion: 1
        datasources:
          - name: ClickHouse
            type: grafana-clickhouse-datasource
            isDefault: true
            jsonData:
              defaultDatabase: cvat
              port: ${NOMAD_HOST_PORT_clickhouse_native}
              server: ${NOMAD_HOST_IP_clickhouse_native}
              username: user
              tlsSkipVerify: false
            secureJsonData:
              password: user
            editable: true
        EOF
        destination = "local/etc/grafana/provisioning/datasources/ds.yaml"
      }
    }

    task "db" {
      driver = "docker"
      kill_timeout = "30s"
      env {
        POSTGRES_USER = "root"
        POSTGRES_DB = "cvat"
        POSTGRES_HOST_AUTH_METHOD = "trust"
        PGDATA = "/var/lib/postgresql/data/pgdata"
      }
      config {
        image = "${NOMAD_META_db_image}"
        privileged = true
        force_pull = "false"
        ports = ["db"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/db:/var/lib/postgresql/data"
        ]
      }
    }

    task "redis" {
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 5120
      }
      config {
        image = "${NOMAD_META_redis_image}"
        ports = ["redis"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/redis:/data"
        ]
        command = "keydb-server"
        args = [
          "/etc/keydb/keydb.conf",
          "--storage-provider", "flash", "/data/flash",
          "--maxmemory", "5G",
          "--maxmemory-policy", "allkeys-lfu"
        ]
      }
    }

    task "vector" {
      driver = "docker"
      kill_timeout = "30s"
      resources {
        memory = 1024
      }
      env {
        CLICKHOUSE_DB = "cvat"
        CLICKHOUSE_USER = "user"
        CLICKHOUSE_PASSWORD = "user"
        CLICKHOUSE_HOST = "${NOMAD_HOST_IP_clickhouse_http}"
        CLICKHOUSE_PORT = "${NOMAD_HOST_PORT_clickhouse_http}"
      }
      config {
        image = "${NOMAD_META_vector_image}"
        ports = ["vector"]
        mount {
          type = "bind"
          target = "/etc/vector/vector.toml"
          source = "local/etc/vector/vector.toml"
          readonly = false
        }
      }
      artifact {
        source = "https://github.com/ai4os/ai4-cvat/raw/${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}/components/analytics/vector/vector.toml"
        destination = "local/etc/vector/"
      }
    }

    task "server" {
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 4096
      }
      env {
        DJANGO_MODWSGI_EXTRA_ARGS = ""
        ALLOWED_HOSTS = "*"
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        ADAPTIVE_AUTO_ANNOTATION = "false"
        IAM_OPA_ADDR = "${NOMAD_HOST_ADDR_opa}"
        IAM_OPA_HOST = "${NOMAD_HOST_IP_opa}"
        IAM_OPA_PORT = "${NOMAD_HOST_PORT_opa}"
        IAM_OPA_BUNDLE = "1"
        NUMPROCS = "2"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        DJANGO_SUPERUSER_USERNAME = "${NOMAD_META_su_username}"
        DJANGO_SUPERUSER_PASSWORD = "${NOMAD_META_su_password}"
        DJANGO_SUPERUSER_EMAIL = "${NOMAD_META_su_email}"
        CLICKHOUSE_HOST = "${NOMAD_HOST_IP_clickhouse_http}"
        CLICKHOUSE_PORT = "${NOMAD_HOST_PORT_clickhouse_http}"
        CVAT_ANALYTICS = "1"
        CVAT_BASE_URL = ""
        CVAT_HOST = "${NOMAD_META_job_uuid}.${NOMAD_META_cvat_hostname}"
        SMOKESCREEN_OPTS = "${NOMAD_META_smokescreen_opts}"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["server"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
          "..${NOMAD_ALLOC_DIR}/data/share:/home/django/share"
        ]
        command = "init"
        args = [
          "ensuresuperuser",
          "run",
          "server"
        ]
      }
    }

    task "utils" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 1024
      }
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        CLICKHOUSE_HOST = "${NOMAD_HOST_IP_clickhouse_http}"
        CLICKHOUSE_PORT = "${NOMAD_HOST_PORT_clickhouse_http}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "1"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["utils"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
          "..${NOMAD_ALLOC_DIR}/data/share:/home/django/share",
        ]
        command = "run"
        args = [
          "utils"
        ]
      }
    }

    task "worker-import" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 1024
      }
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "2"
        SMOKESCREEN_OPTS = "${NOMAD_META_smokescreen_opts}"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["worker-import"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
          "..${NOMAD_ALLOC_DIR}/data/share:/home/django/share",
        ]
        command = "run"
        args = [
          "worker.import"
        ]
      }
    }

    task "worker-export" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 1024
      }
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "2"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["worker-export"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
          "..${NOMAD_ALLOC_DIR}/data/share:/home/django/share",
        ]
        command = "run"
        args = [
          "worker.export"
        ]
      }
    }

    task "worker-annotation" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 1024
      }
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "1"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["worker-annotation"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
          "..${NOMAD_ALLOC_DIR}/data/share:/home/django/share",
        ]
        command = "run"
        args = [
          "worker.annotation"
        ]
      }
    }

    task "worker-webhooks" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "1"
        SMOKESCREEN_OPTS = "${NOMAD_META_smokescreen_opts}"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["worker-webhooks"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
        ]
        command = "run"
        args = [
          "worker.webhooks"
        ]
      }
    }

    task "worker-quality-reports" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "1"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["worker-quality-reports"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
        ]
        command = "run"
        args = [
          "worker.quality_reports"
        ]
      }
    }

    task "worker-analytics-reports" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      resources {
        cores = 1
        memory = 1024
      }
      env {
        CVAT_REDIS_HOST = "${NOMAD_HOST_IP_redis}"
        CVAT_REDIS_PORT = "${NOMAD_HOST_PORT_redis}"
        CVAT_REDIS_PASSWORD = ""
        CVAT_POSTGRES_HOST = "${NOMAD_HOST_IP_db}"
        CVAT_POSTGRES_PORT = "${NOMAD_HOST_PORT_db}"
        DJANGO_LOG_SERVER_HOST = "${NOMAD_HOST_IP_vector}"
        DJANGO_LOG_SERVER_PORT = "${NOMAD_HOST_PORT_vector}"
        NUMPROCS = "2"
      }
      config {
        image = "${NOMAD_META_server_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_server}"
        ports = ["worker-analytics-reports"]
        volumes = [
          "..${NOMAD_ALLOC_DIR}/data/data:/home/django/data",
        ]
        command = "run"
        args = [
          "worker.analytics_reports"
        ]
      }
    }

    task "opa" {
      driver = "docker"
      kill_timeout = "30s"
      config {
        image = "${NOMAD_META_opa_image}"
        ports = ["opa"]
        command = "run"
        args = [
          "--server",
          "--log-level=debug",
          "--set=services.cvat.url=http://${NOMAD_HOST_ADDR_server}",
          "--set=bundles.cvat.service=cvat",
          "--set=bundles.cvat.resource=/api/auth/rules",
          "--set=bundles.cvat.polling.min_delay_seconds=5",
          "--set=bundles.cvat.polling.max_delay_seconds=15"
        ]
      }
    }

    task "ui" {
      lifecycle {
        hook = "poststart"
        sidecar = "true"
      }
      driver = "docker"
      kill_timeout = "30s"
      config {
        image = "${NOMAD_META_ui_image}:${NOMAD_META_cvat_version}${NOMAD_META_cvat_version_custom}"
        force_pull = "${NOMAD_META_force_pull_img_cvat_ui}"
        ports = ["ui"]
      }
    }
  }
}
