FROM grafana/grafana:9.3.6-ubuntu

ARG CLICKHOUSE_DATASOURCE_VERSION=2.0.7

WORKDIR /tmp
USER root

RUN curl -vkL https://github.com/grafana/clickhouse-datasource/releases/download/v${CLICKHOUSE_DATASOURCE_VERSION}/grafana-clickhouse-datasource-${CLICKHOUSE_DATASOURCE_VERSION}.linux_amd64.zip -o grafana-clickhouse-datasource-${CLICKHOUSE_DATASOURCE_VERSION}.linux_amd64.zip

RUN apt-get update && apt-get install -y unzip && \
    unzip grafana-clickhouse-datasource-${CLICKHOUSE_DATASOURCE_VERSION}.linux_amd64.zip -d /var/lib/grafana/plugins/

COPY dashboards/cvat-logs.json /var/lib/grafana/dashboards/
