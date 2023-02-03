<!--lint disable maximum-heading-length-->

---

title: 'Installation Analytics'
linkTitle: 'Installation Analytics'
weight: 20
description: 'Instructions for deployment and customization of Analytics. This section on [GitHub](https://github.com/cvat-ai/cvat/tree/develop/components/analytics).'

---

<!--lint disable heading-style-->

![](/images/image097.jpg)

It is possible to proxy annotation logs from the UI to the Clickhouse database and use Grafana for visualization.
This feature is enabled by default and all required containers will be launched when starting CVAT with:

```shell
docker compose up -d
```

The previous solution based on ELK stack is currently deprecated and will no longer be supported.
it is possible to run Elasticsearch and Kibana on previously saved data, but all new events will be stored in Clickhouse:

```shell
docker compose -f components/analytics/deprecated/docker-compose.analytics.yml build
docker compose -f components/analytics/deprecated/docker-compose.analytics.yml up -d
```
