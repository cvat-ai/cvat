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
(e.g. tasks, jobs etc).

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
