---
title: 'High-level API'
linkTitle: 'High-level API'
weight: 4
description: ''
---

## Overview

This layer provides high-level APIs, allowing easier access to server operations.
API includes _Repositories_ and _Entities_. Repositories provide management
operations for Entities. Entities represent objects on the server
(e.g. projects, tasks, jobs etc) and simplify interaction with them. The key difference
from the low-level API is that operations on this layer are not limited by a single
server request per operation and encapsulate low-level request machinery behind a high-level
object-oriented API.

The code of this component is located in the `cvat_sdk.core` package.

## Example

```python
from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType, Task

# Create a Client instance bound to a local server and authenticate using basic auth
with make_client(host="localhost", credentials=('user', 'password')) as client:
    # Let's create a new task.

    # Fill in task parameters first.
    # Models are used the same way as in the layer 1.
    task_spec = {
        "name": "example task",
        "labels": [
            {
                "name": "car",
                "color": "#ff00ff",
                "attributes": [
                    {
                        "name": "a",
                        "mutable": True,
                        "input_type": "number",
                        "default_value": "5",
                        "values": ["4", "5", "6"],
                    }
                ],
            }
        ],
    }

    # Now we can create a task using a task repository method.
    # Repositories can be accessed as the Client class members.
    # In this case we use 2 local images as the task data.
    task = client.tasks.create_from_data(
        spec=task_spec,
        resource_type=ResourceType.LOCAL,
        resources=['image1.jpg', 'image2.png'],
    )

    # The returned task object is already up-to-date with its server counterpart.
    # Now we can access task fields. The fields are read-only and can be optional.
    # Let's check that we have 2 images in the task data.
    assert task.size == 2

    # If an object is modified on the server, the local object is not updated automatically.
    # To reflect the latest changes, the local object needs to be fetch()-ed.
    task.fetch()

    # Let's obtain another task. Again, it can be done via the task repository.
    # Suppose we have already created the task earlier and know the task id.
    task2 = client.tasks.retrieve(42)

    # The task object fields can be update()-d. Note that the set of fields that can be
    # modified can be different from what is available for reading.
    task2.update({'name': 'my task'})

    # And the task can also be remove()-d from the server. The local copy will remain
    # untouched.
    task2.remove()
```

## Client

The `cvat_sdk.core.client.Client` class provides session management, implements
authentication operations and simplifies access to server APIs.
It is the starting point for using CVAT SDK.

A `Client` instance allows you to:
- configure connection options with the `Config` class
- check server API compatibility with the current SDK version
- deduce server connection scheme (`https` or `http`) automatically
- manage user session with the `login()`, `logout()` and other methods
- obtain Repository objects with the `users`, `tasks`, `jobs` and other members
- reach to lower-level APIs with the corresponding members

An instance of `Client` can be created directly by calling the class constructor
or with the utility function `cvat_sdk.core.client.make_client()` which can handle
some configuration for you. A `Client` can be configured with
the `cvat_sdk.core.client.Config` class instance. A `Config` object can be passed to
the `Client` constructor and then it will be available in the `Client.config` field.

The `Client` class implements the [context manager protocol](https://docs.python.org/3/reference/datamodel.html#context-managers).
When the context is closed, the session is finished, and the user is logged out
automatically. Otherwise, these actions can be done with the `close()` and `logout()` methods.

You can create and start using a `Client` instance this way:

```python
from cvat_sdk import make_client

with make_client('localhost', port='8080', credentials=('user', 'password')) as client:
    ...
```

The `make_client()` function handles configuration and object creation for you.
It also allows to authenticate right after the object is created.

If you need to configure `Client` parameters, you can do this:

```python
from cvat_sdk import Config, Client

config = Config()
# set up some config fields ...

with Client('localhost:8080', config=config) as client:
    client.login(('user', 'password'))
    ...
```

You can specify server address both with and without the scheme. If the scheme is omitted,
it will be deduced automatically.

> The checks are performed in the following
order: `https` (with the default port 8080), `http` (with the default port 80).
In some cases it may lead to incorrect results - e.g. you have 2 servers running on the
same host at default ports. In such cases just specify the schema manually: `https://localhost`.

When the server is located, its version is checked. If an unsupported version is found,
an error can be raised or suppressed (controlled by `config.allow_unsupported_server`).
If the error is suppressed, some SDK functions may not work as expected with this server.
By default, a warning is raised and the error is suppressed.

### Users and organizations

All `Client` operations rely on the server API and depend on the current user
rights. This affects the set of available APIs, objects and actions. For example, a regular user
can only see and modify their tasks and jobs, while an admin user can see all the tasks etc.

Operations are also affected by the current organization context,
which can be set with the `organization_slug` property of `Client` instances.
The organization context affects which entities are visible,
and where new entities are created.

Set `organization_slug` to an organization's slug (short name)
to make subsequent operations work in the context of that organization:

```python
client.organization_slug = 'myorg'

# create a task in the organization
task = client.tasks.create_from_data(...)
```

You can also set `organization_slug` to an empty string
to work in the context of the user's personal workspace.
By default, it is set to `None`,
which means that both personal and organizational entities are visible,
while new entities are created in the personal workspace.

To temporarily set the organization slug, use the `organization_context` function:

```python
with client.organization_context('myorg'):
    task = client.tasks.create_from_data(...)

# the slug is now reset to its previous value
```

## Entities and Repositories

_Entities_ represent objects on the server. They provide read access to object fields
and implement additional relevant operations, including both the general Read-Update-Delete and
object-specific ones. The set of available general operations depends on the object type.

_Repositories_ provide management operations for corresponding Entities. You don't
need to create Repository objects manually. To obtain a Repository object, use the
corresponding `Client` instance member:

```python
client.projects
client.tasks
client.jobs
client.users
...
```

An Entity can be created on the server with the corresponding Repository method `create()`:

```python
task = client.tasks.create(<task config>)
```

We can retrieve server objects using the `retrieve()` and `list()` methods of the Repository:

```python
job = client.jobs.retrieve(<job id>)
tasks = client.tasks.list()
```

After calling these functions, we obtain local objects representing their server counterparts.

Object fields can be updated with the `update()` method. Note that the set of fields that can be
modified can be different from what is available for reading.

```python
job.update({'stage': 'validation'})
```

The server object will be updated and the local object will reflect the latest object state
after calling this operation.

Note that local objects may fall out of sync with their server counterparts for different reasons.
If you need to update the local object with the latest server state, use the `fetch()` method:

```python
# obtain 2 local copies of the same job
job_ref1 = client.jobs.retrieve(1)
job_ref2 = client.jobs.retrieve(1)

# update the server object with the first reference
job_ref1.update(...)
# job_ref2 is outdated now

job_ref2.fetch()
# job_ref2 is synced
```

Finally, if you need to remove the object from the server, you can use the `remove()` method.
The server object will be removed, but the local copy of the object will remain untouched.

```python
task = client.tasks.retrieve(<task id>)
task.remove()
```

Repositories can also provide group operations over entities. For instance, you can retrieve
all available objects using the `list()` Repository method. The list of available
Entity and Repository operations depends on the object type.

You can learn more about entity members and how model parameters are passed to functions [here](../lowlevel-api).

The implementation for these components is located in `cvat_sdk.core.proxies`.
