---
title: 'High-level API'
linkTitle: 'High-level API'
weight: 4
description: ''
---

## Overview

This layer provides high-level APIs, allowing easier access to server operations.
API includes _Repositories_ and _Entities_. Repositories provide management
operations for Entitites. Entitites represent separate objects on the server
(e.g. tasks, jobs etc). The key difference from the low-level API is that
operations is this layer are not limited by a single server request per operation.

Code of this component is located in `cvat_sdk.core`.

## Example

```python
from cvat_sdk import make_client, models
from cvat_sdk.core.proxies.tasks import ResourceType, Task

with make_client(host="http://localhost") as client:
    # Authorize using the basic auth
    client.login(('YOUR_USERNAME', 'YOUR_PASSWORD'))

    # Models are used the same way as in the layer 1
    task_spec = {
        "name": "example task 2",
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

    # Different repositories can be accessed as the Client class members.
    # They may provide both simple and complex operations,
    # such as entity creation, retrieval and removal.
    task = client.tasks.create_from_data(
        spec=task_spec,
        resource_type=ResourceType.LOCAL,
        resources=['image1.jpg', 'image2.png'],
    )

    # Task object is already up-to-date with its server counterpart
    assert task.size == 2

    # An entity needs to be fetch()-ed to reflect the latest changes.
    # It can be update()-d and remove()-d depending on the entity type.
    task.update({'name': 'mytask'})
    task.remove()
```

## Client

The `cvat_sdk.core.client.Client` class manages session, provides connection management and
resource location operations. It is the staring point for using CVAT SDK.

An instance of `Client` can be created directly by calling the class constructor,
or with the utility function `cvat_sdk.core.client.make_client()`, which can handle
some configuration for you. The extended configuration for `Client` is performed with
the `cvat_sdk.core.client.Config` class instances. A `Config` object can be passed to
the `Client` constructor and then it can be accessed with the `Client.config` field.
`Client` objects implement [context manager protocol](https://docs.python.org/3/reference/datamodel.html#context-managers).

You can create `Client` this way:

```python
from cvat_sdk import make_client

with make_client('localhost', port='8080', credentials=(user, password)) as client:
    ...
```

Or, if you need to tweak `Client`, you can do this:

```python
from cvat_sdk import Config, Client

config = Config()
# set up some config fields ...

with Client('localhost:8080', config=config) as client:
    ...
```

With `Client`, you can `login()` and `logout()`, and you can get Repository objects.

## Entities and Repositories

Entitites represent separate objects on the server. They provide read access to object fields
and provide additional operations, including both general Read-Update-Delete and
object-specific ones.

Repositories provide management operations for corresponding Entities. Typically, you don't
need to create Repository objects manually. To obtain a Repository object, use the corresponding
`Client` instance property:

```python
client.projects
client.tasks
client.jobs
client.users
...
```

An entity can be created on the server with the corresponding Repository method `create()`:

```python
task = client.tasks.create(<task config>)
```

We can retrieve server objects using the `retrieve()` method of the Repository:

```python
job = client.jobs.retrieve(<job id>)
```

After calling these functions, we obtain local objects, representing their server counterparts.

Object fields can be updated with the `update()` method:

```python
job.update({'stage': 'validation'})
```

The sever object will be updated and the local object will reflect the latest object state
after calling this operaiton.

Note, that local objects may out of sync with their server counterparts for different reasons.
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

The local changes in the object are discarded when `fetch()` is called.

Finally, if you need to remove object from the server, you can use the `remove()` method.
The server object will be removed, but the local copy of the object will remain available.

Repositories can also provide group operations over entities. For instance, you can retrieve
all available objects using the `list()` Repository method. Additional operations can also
be available. The list of available Entity and Repository operations depends on the object
type.

The implementation for these components is located in `cvat_sdk.core.proxies`.
