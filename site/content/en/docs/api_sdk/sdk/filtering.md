---
title: 'High-level API'
linkTitle: 'High-level API'
weight: 4
description: ''
---

CVAT list endpoints can return a lot of objects. A filter tells the server to return only the ones you need.
This guide shows the same filter in three places: the REST API, the Python SDK and the web interface.

## How filtering works

List endpoints such as `GET /api/tasks`, `GET /api/jobs` and `GET /api/projects` accept these query parameters:

| Parameter | What it does |
|---|---|
| `filter` | A JSON Logic expression for complex conditions. |
| A field name, such as `project_id` or `name` | A simple equality check on one field. |
| `search` | A search term, matched against the fields the endpoint lists as searchable. |
| `sort` | The field used to order the results. |

Use a simple parameter when you need one equality check, for example `GET /api/tasks?project_id=2`.
Use `filter` for everything else: several conditions, lists of values, comparisons and text matches.

### JSON Logic in brief

A filter is a [JSON Logic](https://jsonlogic.com/) expression.
You read a field with `{"var": "<field name>"}`, compare it with an operator, and combine conditions with `and` and `or`.

```json
{"and": [{"==": [{"var": "status"}, "completed"]}, {"==": [{"var": "project_id"}, 1]}]}
```

This filter matches completed objects that belong to project 1.

### Which fields can I filter on

Each endpoint accepts its own list of fields. The list is shown in the description of the `filter` parameter in the API reference, and it can change between versions.

| Endpoint | Filter fields |
|---|---|
| Tasks | `assignee`, `created_date`, `dimension`, `id`, `media_type`, `mode`, `name`, `owner`, `project_id`, `project_name`, `status`, `subset`, `tracker_link`, `updated_date`, `validation_mode` |
| Jobs | `assignee`, `dimension`, `id`, `media_type`, `mode`, `parent_job_id`, `project_id`, `project_name`, `stage`, `state`, `task_id`, `task_name`, `type`, `updated_date` |
| Cloud storages | `credentials_type`, `description`, `id`, `name`, `owner`, `provider_type`, `resource` |
| Comments | `frame_id`, `id`, `issue_id`, `job_id`, `owner` |

A field that is not in the list for an endpoint cannot be used in its filter.

## Filter with the REST API

Send the expression in the `filter` query parameter.
The expression must be URL encoded. The `--data-urlencode` option of `curl` does this for you.

```bash
curl -G "https://app.cvat.ai/api/tasks" \
  --data-urlencode 'filter={"and":[{"==":[{"var":"status"},"completed"]},{"==":[{"var":"project_id"},1]}]}' \
  -H "Accept: application/vnd.cvat+json" \
  -H "$CVAT_AUTH_HEADER"
```

Set `CVAT_AUTH_HEADER` to the header your authentication method needs.

### Examples

Tasks created by you:

```json
{"and": [{"==": [{"var": "owner"}, "<your username>"]}]}
```

Tasks from projects 1, 2 and 3:

```json
{"and": [{"in": [{"var": "project_id"}, [1, 2, 3]]}]}
```

Completed tasks from project 1:

```json
{"and": [{"==": [{"var": "status"}, "completed"]}, {"==": [{"var": "project_id"}, 1]}]}
```

Tasks with "demo" in the name:

```json
{"in": ["demo", {"var": "name"}]}
```

Tasks that have no assignee:

```json
{"!": {"var": "assignee"}}
```

Jobs in the validation stage of task 12 (`GET /api/jobs`):

```json
{"and": [{"==": [{"var": "stage"}, "validation"]}, {"==": [{"var": "task_id"}, 12]}]}
```

### Common mistakes

**Passing a plain key and value.** A filter such as `{"project_id": 2}` is not a JSON Logic expression.
The server reads `project_id` as the name of an operation and returns `400 Bad Request` with a message like this:

```
filter: operation 'project_id' with arguments '2' is not supported
```

Use `GET /api/tasks?project_id=2`, or write the condition as JSON Logic:
`{"==": [{"var": "project_id"}, 2]}`.

**Forgetting to URL encode.** Braces, quotes and colons in the expression must be encoded in the query string.
Let your HTTP client do it, as `curl -G --data-urlencode` does above.

**Using a field the endpoint does not list.** Check the field table above, or the `filter` description of the endpoint you call.

## Filter with the Python SDK

Install the SDK with `pip install cvat-sdk`. The SDK requires Python 3.11 or later.

### High level API

The `F` object builds filters for you, so you do not write JSON Logic by hand.
It is available in SDK releases from 2.70.0.
Combine conditions with `&` (and), `|` (or) and `~` (not).

```python
from cvat_sdk import make_client
from cvat_sdk.core.filters import F

with make_client("https://app.cvat.ai", access_token="<your token>") as client:
    tasks = client.tasks.list(
        filter=(F.status == "completed") & F.project_id.one_of([1, 2, 3])
    )
    for task in tasks:
        print(task.id, task.name)
```

The SDK turns each expression into a JSON Logic filter and sends it in the `filter` parameter.
This table shows the result, so you can move a filter between the SDK and the REST API.

| SDK expression | JSON Logic sent to the server |
|---|---|
| `F.owner == "alice"` | `{"==": [{"var": "owner"}, "alice"]}` |
| `F.id >= 10` | `{">=": [{"var": "id"}, 10]}` |
| `F.project_id.one_of([1, 2, 3])` | `{"in": [{"var": "project_id"}, [1, 2, 3]]}` |
| `F.name.contains("demo")` | `{"in": ["demo", {"var": "name"}]}` |
| `F.id.between(10, 20)` | `{"<=": [10, {"var": "id"}, 20]}` |
| `~F.assignee.is_set()` | `{"!": {"var": "assignee"}}` |
| `F.status != "annotation"` | `{"!": {"==": [{"var": "status"}, "annotation"]}}` |
| `(F.status == "completed") & F.project_id.one_of([1, 2, 3])` | `{"and": [{"==": [{"var": "status"}, "completed"]}, {"in": [{"var": "project_id"}, [1, 2, 3]]}]}` |

For filters that only use AND, you can skip `F` and use keyword lookups.
The operator is a suffix on the keyword name, such as `id__gte` for greater than or equal to.

```python
tasks = client.tasks.list(id__gte=10, name__contains="demo")
```

The lookup suffixes are `in`, `contains`, `lt`, `lte`, `gt`, `gte`, `ne`, `between` and `isset`.

### Low level API

The low level API takes the JSON Logic string as it is.

```python
(page, response) = client.tasks.api.list(
    filter='{"in": [{"var": "project_id"}, [1, 2, 3]]}'
)
print(page.count)
```

## Filter in the web interface

The Projects, Tasks, Jobs and Cloud storages pages have sort and filter controls.
The pages use the same API as your scripts, so a filter you build on a page is a quick way to learn the right expression.

1. Open the page, for example Tasks.
2. Open the filter window, add your rules and apply them.
3. Look at the page address. The filter is part of the address. For example, a rule that matches task names containing "balcony" gives an address like this:

   ```
   https://app.cvat.ai/tasks?filter=%7B"and"%3A%5B%7B"in"%3A%5B"balcony"%2C%7B"var"%3A"name"%7D%5D%7D%5D%7D&page=1&pageSize=10
   ```

4. Copy only the value of `filter` and decode it. The example above decodes to this JSON Logic expression:

   ```json
   {"and": [{"in": ["balcony", {"var": "name"}]}]}
   ```

   Use it as the `filter` parameter in your own request. Leave out `page` and `pageSize`, which only control the web page. The API parameter for page length is `page_size`.

## Which method should I use

| You want to | Use |
|---|---|
| Check one field for one value | A simple parameter, such as `?project_id=2` |
| Run a one off query from a terminal | The REST API with `filter` |
| Filter inside a Python script | The SDK with `F` |
| Find the right expression by example | The web interface, then copy the filter |
