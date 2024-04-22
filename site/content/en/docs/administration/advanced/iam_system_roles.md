---
title: 'IAM: system roles'
linkTitle: 'system roles'
weight: 70
---

<!--lint disable heading-style-->

## System roles

By default CVAT users can be assigned to one of the following groups: `admin`, `business`, `user` and `worker`.

Each of these groups gives a set of permissions.
TBD

## Changing permissions

System permissions are defined using `.rego` files stored in `cvat/apps/iam/rules/`.
Rego is a declarative language used for defining OPA policies.
It's syntax is defined in [OPA docs](https://www.openpolicyagent.org/docs/latest/policy-language/).

After changing the `.rego` files, you need to rebuilt and restart the docker compose for the changes to take effect.
In this case you need to include `docker-compose.dev.yml` compose config file to `docker compose` command.
