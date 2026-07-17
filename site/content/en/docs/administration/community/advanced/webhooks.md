---
title: 'Webhooks'
linkTitle: 'Webhooks'
description: 'CVAT Webhooks: set up and use'
weight: 80
aliases:
- /docs/administration/advanced/webhooks/
---

Webhooks are user-defined HTTP callbacks that are triggered by specific events.
When an event that triggers a webhook occurs, CVAT makes an HTTP request
to the URL configured for the webhook.
The request will include a payload with information about the event.

CVAT, webhooks can be triggered by a variety of events,
such as the creation, deletion, or modification of tasks,
jobs, and so on.
This makes it easy to set up automated processes
that respond to changes made in CVAT.

For example, you can set up webhooks to alert you when a job's assignee is changed or when
a job/task's status is updated, for instance, when a job is completed and ready for review
or has been reviewed. New task creation can also trigger notifications.

These capabilities allow you to keep track of progress and changes in your CVAT workflow instantly.

In CVAT you can create a webhook for a project or organization.
You can use CVAT GUI or direct API calls.

See:

- [Create Webhook](#create-webhook)
  - [For project](#for-project)
  - [For organization](#for-organization)
  - [Webhooks forms](#webhooks-forms)
  - [List of events](#list-of-events)
- [Payloads](#payloads)
  - [Create event](#create-event)
  - [Update event](#update-event)
  - [Delete event](#delete-event)
- [Webhook secret](#webhook-secret)
- [Ping Webhook](#ping-webhook)
- [Webhooks with API calls](#webhooks-with-api-calls)
- [Example of setup and use](#example-of-setup-and-use)

## Create Webhook

### For project

To create a webhook for **Project**, do the following:

1. {{< ilink "/docs/workspace/projects" "Create a Project" >}}.
2. Go to the **Projects** and click on the project's widget.
3. In the top right corner, click **Actions** > **Setup Webhooks**.
4. In the top right corner click **+**

   ![Create Project Webhook](/images/create_project_webhook.gif)

5. Fill in the **[Setup webhook](#webhooks-forms)** form and click **Submit**.

### For organization

To create a webhook for **Organization**, do the following:

1. {{< ilink "/docs/account_management/organization" "Create Organization" >}}
2. Go to the **Organization** > **Settings** > **Actions** > **Setup Webhooks**.
3. In the top right corner click **+**

  ![Creating an organization webhook via the interface](/images/create_organization_webhook.gif)

4. Fill in the **[Setup webhook](#webhooks-forms)** form and click **Submit**.

### Webhooks forms

The **Setup a webhook** forms look like the following.

![Create Project And Org Webhook Forms ](/images/webhook_form_project_org.jpg)

Forms have the following fields:

| Field                     | Description                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target URL                | The URL where the event data will be sent.                                                                                                                       |
| Description               | Provides a brief summary of the webhook's purpose.                                                                                                               |
| Project                   | A drop-down list that lets you select from available projects.                                                                                                   |
| Content type              | Defines the data type for the payload in the webhook request via the HTTP Content-Type field.                                                                    |
| Secret                    | A unique key for verifying the webhook's origin, ensuring it's genuinely from CVAT. <br>For more information, see [Webhook secret](#webhook-secret)              |
| Enable SSL                | A checkbox for enabling or disabling [SSL verification](https://en.wikipedia.org/wiki/Public_key_certificate).                                                   |
| Active                    | Uncheck this box if you want to stop the delivery of specific webhook payloads.                                                                                  |
| Send everything           | Check this box to send all event types through the webhook.                                                                                                      |
| Specify individual events | Choose this option to send only certain event types. <br>Refer to the [List of available events](#list-of-available-events) for more information on event types. |

### List of events

The following events are available for webhook alerts.

| Resource     | Create | Update | Delete | Description                                                                         |
| ------------ | ------ | ------ | ------ | ----------------------------------------------------------------------------------- |
| Organization |        | ✅     |        | Alerts for changes made to an Organization.                                         |
| Membership   |        | ✅     | ✅     | Alerts when a member is added to or removed from an organization.                   |
| Invitation   | ✅     |        | ✅     | Alerts when an invitation to an Organization is issued or revoked.                  |
| Project      | ✅     | ✅     | ✅     | Alerts for any actions taken within a project.                                      |
| Task         | ✅     | ✅     | ✅     | Alerts for actions related to a task, such as status changes, assignments, etc.     |
| Job          |        | ✅     |        | Alerts for any updates made to a job.                                               |
| Issue        | ✅     | ✅     | ✅     | Alerts for any activities involving issues.                                         |
| Comment      | ✅     | ✅     | ✅     | Alerts for actions involving comments, such as creation, deletion, or modification. |

## Payloads

### Create event

Webhook payload object for `create:<resource>` events:

| Key          | Type      | Description |
| ------------ | --------- | ----------- |
| `event`      | `string`  | Identifies the event that triggered the webhook, following the `create:<resource>` pattern. |
| `<resource>` | `object`  | Complete information about the created resource. Refer to the [Swagger](#webhooks-with-api-calls) docs for individual resource details. |
| `webhook_id` | `integer` | The identifier for the webhook that sends the payload. |
| `sender`     | `object`  | Details about the user that triggered the webhook. |

An example of payload for the `create:task` event:

{{< scroll-code lang="json" >}}
{
 "event": "create:task",
    "task": {
        "url": "<http://localhost:8080/api/tasks/15>",
        "id": 15,
        "name": "task",
        "project_id": 7,
        "mode": "",
        "owner": {
            "url": "<http://localhost:8080/api/users/1>",
            "id": 1,
            "username": "admin1",
            "first_name": "Admin",
            "last_name": "First"
        },
        "assignee": null,
        "bug_tracker": "",
        "created_date": "2022-10-04T08:05:50.419259Z",
        "updated_date": "2022-10-04T08:05:50.422917Z",
        "overlap": null,
        "segment_size": 0,
        "status": "annotation",
        "labels": \[
            {
                "id": 28,
                "name": "label_0",
                "color": "#bde94a",
                "attributes": [],
                "type": "any",
                "sublabels": [],
                "has_parent": false
            }
        \],
        "segments": [],
        "dimension": "2d",
        "subset": "",
        "organization": null,
        "target_storage": {
            "id": 14,
            "location": "local",
            "cloud_storage_id": null
        },
        "source_storage": {
            "id": 13,
            "location": "local",
            "cloud_storage_id": null
        }
    },
    "webhook_id": 7,
    "sender": {
        "url": "<http://localhost:8080/api/users/1>",
        "id": 1,
        "username": "admin1",
        "first_name": "Admin",
        "last_name": "First"
    }
}
{{< /scroll-code >}}

### Update event

Webhook payload object for `update:<resource>` events:

| Key             | Type      | Description                                                                                          |
| --------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `event`         | `string`  | Identifies the event that triggered the webhook, following the `update:<resource>` pattern.          |
| `<resource>`    | `object`  | Provides complete information about the updated resource. See the Swagger docs for resource details. |
| `before_update` | `object`  | Contains keys of `<resource>` that were updated, along with their old values.                        |
| `webhook_id`    | `integer` | The identifier for the webhook that dispatched the payload.                                          |
| `sender`        | `object`  | Details about the user that triggered the webhook.                                                   |

An example of `update:<resource>` event:

{{< scroll-code lang="json" >}}
{
    "event": "update:task",
    "task": {
        "url": "<http://localhost:8080/api/tasks/15>",
        "id": 15,
        "name": "new task name",
        "project_id": 7,
        "mode": "annotation",
        "owner": {
            "url": "<http://localhost:8080/api/users/1>",
            "id": 1,
            "username": "admin1",
            "first_name": "Admin",
            "last_name": "First"
        },
        "assignee": null,
        "bug_tracker": "",
        "created_date": "2022-10-04T08:05:50.419259Z",
        "updated_date": "2022-10-04T11:04:51.451681Z",
        "overlap": 0,
        "segment_size": 1,
        "status": "annotation",
        "labels": \[
            {
                "id": 28,
                "name": "label_0",
                "color": "#bde94a",
                "attributes": [],
                "type": "any",
                "sublabels": [],
                "has_parent": false
            }
        \],
        "segments": \[
            {
                "start_frame": 0,
                "stop_frame": 0,
                "jobs": \[
                    {
                        "url": "<http://localhost:8080/api/jobs/19>",
                        "id": 19,
                        "assignee": null,
                        "status": "annotation",
                        "stage": "annotation",
                        "state": "new"
                    }
                \]
            }
        \],
        "data_chunk_size": 14,
        "data_compressed_chunk_type": "imageset",
        "data_original_chunk_type": "imageset",
        "size": 1,
        "image_quality": 70,
        "data": 14,
        "dimension": "2d",
        "subset": "",
        "organization": null,
        "target_storage": {
            "id": 14,
            "location": "local",
            "cloud_storage_id": null
        },
        "source_storage": {
            "id": 13,
            "location": "local",
            "cloud_storage_id": null
        }
    },
    "before_update": {
        "name": "task"
    },
    "webhook_id": 7,
    "sender": {
        "url": "<http://localhost:8080/api/users/1>",
        "id": 1,
        "username": "admin1",
        "first_name": "Admin",
        "last_name": "First"
    }
}
{{< /scroll-code >}}

### Delete event

Webhook payload object for `delete:<resource>` events:

| Key          | Type      | Description                                                                                          |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------- |
| `event`      | `string`  | Identifies the event that triggered the webhook, following the `delete:<resource>` pattern.          |
| `<resource>` | `object`  | Provides complete information about the deleted resource. See the Swagger docs for resource details. |
| `webhook_id` | `integer` | The identifier for the webhook that dispatched the payload.                                          |
| `sender`     | `object`  | Details about the user that triggered the webhook.                                                   |

Here is an example of the payload for the `delete:task` event:

{{< scroll-code lang="json" >}}
{
    "event": "delete:task",
    "task": {
        "url": "<http://localhost:8080/api/tasks/15>",
        "id": 15,
        "name": "task",
        "project_id": 7,
        "mode": "",
        "owner": {
            "url": "<http://localhost:8080/api/users/1>",
            "id": 1,
            "username": "admin1",
            "first_name": "Admin",
            "last_name": "First"
        },
        "assignee": null,
        "bug_tracker": "",
        "created_date": "2022-10-04T08:05:50.419259Z",
        "updated_date": "2022-10-04T08:05:50.422917Z",
        "overlap": null,
        "segment_size": 0,
        "status": "annotation",
        "labels": \[
            {
                "id": 28,
                "name": "label_0",
                "color": "#bde94a",
                "attributes": [],
                "type": "any",
                "sublabels": [],
                "has_parent": false
            }
        \],
        "segments": [],
        "dimension": "2d",
        "subset": "",
        "organization": null,
        "target_storage": {
            "id": 14,
            "location": "local",
            "cloud_storage_id": null
        },
        "source_storage": {
            "id": 13,
            "location": "local",
            "cloud_storage_id": null
        }
    },
    "webhook_id": 7,
    "sender": {
        "url": "<http://localhost:8080/api/users/1>",
        "id": 1,
        "username": "admin1",
        "first_name": "Admin",
        "last_name": "First"
    }
}
{{< /scroll-code >}}

## Webhook secret

To validate that webhook requests originate from CVAT, include a `secret` during the webhook creation process.
This helps ensure the authenticity of incoming webhook requests.

When a `secret` is provided, CVAT includes an `X-Signature-256` header in the webhook request.
This header contains a SHA256 hash of the request body, signed using the secret key.

How it works:
1. CVAT computes the SHA256 HMAC of the request body using the `secret`.
2. The computed hash is included in the `X-Signature-256` header.
3. The webhook receiver verifies the request by recalculating the hash using the same `secret`
and comparing it with the received signature.

Here’s an example of the `X-Signature-256` header for a request with an empty body and `secret = mykey`:

```
X-Signature-256: e1b24265bf2e0b20c81837993b4f1415f7b68c503114d100a40601eca6a2745f
```

#### Verifying webhook signature
You can verify the webhook signature in your webhook receiver service using Python:

```python
# webhook_receiver.py

import hmac
from hashlib import sha256
from flask import Flask, request

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    secret = "mykey".encode("utf-8")
    received_signature = request.headers.get("X-Signature-256", "")

    expected_signature = "sha256=" + hmac.new(secret, request.data, digestmod=sha256).hexdigest()

    if hmac.compare_digest(received_signature, expected_signature):
        return app.response_class(status=200, response="Valid signature")
    return app.response_class(status=403, response="Invalid Signature")

if __name__ == "__main__":
    app.run(port=5000)
```

## Ping webhook

The **Ping** webhook feature helps confirm that CVAT can successfully send webhook events to the configured target URL.

![Ping Webhook](/images/ping_webhook.jpg)

1. Click the **Ping** button in the CVAT UI. Alternatively, send a `POST /webhooks/{id}/ping` request via the API.
2. CVAT will send a webhook event to the target URL with basic details.

#### Ping webhook payload

| Key       | Type     | Description                                                                 |
| --------- | -------- | --------------------------------------------------------------------------- |
| `event`   | `string` | Always set to `ping`.                                                      |
| `webhook` | `object` | Contains webhook details (refer to Swagger docs for a complete structure). |
| `sender`  | `object` | Includes information about the user who triggered the ping.                |

Example `ping` event payload:

{{< scroll-code lang="json" >}}
{
   "event": "ping",
    "webhook": {
        "id": 7,
        "url": "<http://localhost:8080/api/webhooks/7>",
        "target_url": "<https://example.com>",
        "description": "",
        "type": "project",
        "content_type": "application/json",
        "is_active": true,
        "enable_ssl": true,
        "created_date": "2022-10-04T08:05:23.007381Z",
        "updated_date": "2022-10-04T08:05:23.007395Z",
        "owner": {
            "url": "<http://localhost:8080/api/users/1>",
            "id": 1,
            "username": "admin1",
            "first_name": "Admin",
            "last_name": "First"
        },
        "project": 7,
        "organization": null,
        "events": \[
            "create:comment",
            "create:issue",
            "create:task",
            "delete:comment",
            "delete:issue",
            "delete:task",
            "update:comment",
            "update:issue",
            "update:job",
            "update:project",
            "update:task"
        \],
        "last_status": 200,
        "last_delivery_date": "2022-10-04T11:04:52.538638Z"
    },
    "sender": {
        "url": "<http://localhost:8080/api/users/1>",
        "id": 1,
        "username": "admin1",
        "first_name": "Admin",
        "last_name": "First"
    }
}
{{< /scroll-code >}}

## Webhooks with API calls

You can create and manage webhooks via API calls.
Refer to the [Swagger API documentation](https://app.cvat.ai/api/docs) for details.

For implementation examples, check the [REST API tests](https://github.com/cvat-ai/cvat/blob/develop/tests/python/rest_api/test_webhooks.py).

## Example: setting up email alerts via webhooks

This video demonstrates configuring email alerts for a project using Zapier and Gmail:

<iframe width="560" height="315" src="https://www.youtube.com/embed/x87CsGsd-3I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
