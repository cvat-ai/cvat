---
title: 'REST API design principles'
linkTitle: 'REST API design principles'
weight: 100
description: 'Information on using the REST API scheme and principles of its design.'
---

## REST API scheme

Common scheme for our REST API is `<VERB> [namespace] <objects> <id> <action>`.

- `VERB` can be `POST`, `GET`, `PATCH`, `PUT`, `DELETE`.
- `namespace` should scope some specific functionality like `auth`, `lambda`.
  It is optional in the scheme.
- Typical `objects` are `tasks`, `projects`, `jobs`.
- When you want to extract a specific object from a collection, just specify its `id`.
- An `action` can be used to simplify REST API or provide an endpoint for entities
  without `objects` endpoint like `annotations`, `data`, `data/meta`. Note: action
  should not duplicate other endpoints without a reason.

## Design principles

- Use nouns instead of verbs in endpoint paths. For example,
  `POST /api/tasks` instead of `POST /api/tasks/create`.
- Accept and respond with JSON whenever it is possible
- Name collections with plural nouns (e.g. `/tasks`, `/projects`)
- Try to keep the API structure flat. Prefer two separate endpoints
  for `/projects` and `/tasks` instead of `/projects/:id1/tasks/:id2`. Use
  filters to extract necessary information like `/tasks/:id2?project=:id1`.
  In some cases it is useful to get all `tasks`. If the structure is
  hierarchical, it cannot be done easily. Also you have to know both `:id1`
  and `:id2` to get information about the task.
  _Note: for now we accept `GET /tasks/:id2/jobs` but it should be replaced
  by `/jobs?task=:id2` in the future_.
- Handle errors gracefully and return standard error codes (e.g. `201`, `400`)
- Allow filtering, sorting, and pagination
- Maintain good security practices
- Cache data to improve performance
- Versioning our APIs. It should be done when you delete an endpoint or modify
  its behaviors. Versioning uses a schema with `Accept` header with vendor media type.

## Links

- [Best practices for REST API design](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [Flat vs. nested resources](https://stackoverflow.com/questions/20951419/what-are-best-practices-for-rest-nested-resources)
- [REST API Design Best Practices for Sub and Nested Resources](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/)
