---
title: 'Manage cloud storage'
linkTitle: 'Cloud storage'
weight: 6
description: 'Register, list, retrieve, update, and delete an S3-compatible CVAT cloud storage'
---

Register an S3-compatible bucket so tasks can read from it and datasets can
be exported to it, then list, retrieve, update, and delete registered storages.

_Prerequisites:_ an authenticated `client` and S3-compatible credentials plus the endpoint the CVAT **server**
can reach.

```python
from cvat_sdk import Client, models


def register_cloud_storage(
    client: Client, *, bucket: str, key: str, secret_key: str,
    endpoint_url: str, display_name: str | None = None,
) -> int:
    # No high-level proxy for cloud storages yet. Any S3-compatible
    # bucket works with the AWS S3 provider via a custom endpoint_url.
    cs, _ = client.api_client.cloudstorages_api.create(
        models.CloudStorageWriteRequest(
            provider_type="AWS_S3_BUCKET",
            resource=bucket,
            display_name=display_name or bucket,
            credentials_type="KEY_SECRET_KEY_PAIR",
            key=key,
            secret_key=secret_key,
            specific_attributes=f"endpoint_url={endpoint_url}",
        )
    )
    return cs.id
```

List, retrieve, update, and delete registered storages. Credentials are never
returned by the server, so the read model exposes only metadata (`display_name`,
`provider_type`, `resource`); a PATCH changes only the fields you pass:

```python
def list_cloud_storages(client: Client) -> list:
    data, _ = client.api_client.cloudstorages_api.list()
    return list(data.results)


def get_cloud_storage(client: Client, cloud_storage_id: int):
    cs, _ = client.api_client.cloudstorages_api.retrieve(cloud_storage_id)
    return cs


def update_cloud_storage(
    client: Client, cloud_storage_id: int, *,
    display_name: str | None = None, description: str | None = None,
):
    changes = {}
    if display_name is not None:
        changes["display_name"] = display_name
    if description is not None:
        changes["description"] = description
    cs, _ = client.api_client.cloudstorages_api.partial_update(
        cloud_storage_id,
        patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(**changes),
    )
    return cs


def delete_cloud_storage(client: Client, cloud_storage_id: int) -> None:
    # Only detaches the bucket from CVAT - never touches the bucket's contents.
    client.api_client.cloudstorages_api.destroy(cloud_storage_id)
```

_Other SDK options:_

The example uses the low-level `client.api_client.cloudstorages_api` because there is no
high-level proxy for cloud storages yet.

| SDK method / parameter | What it adds |
| --- | --- |
| `models.CloudStorageWriteRequest(description=...)` | Free-text description shown alongside the storage. |
| `models.CloudStorageWriteRequest(manifests=[...])` | Attach manifest files so CVAT can index large buckets faster. |
| `CloudStorageWriteRequest(session_token=..., connection_string=..., account_name=...)` | Alternative credential fields for other providers (e.g. Azure, temporary S3 sessions). |
| `cloudstorages_api.retrieve_status(id=...)` | Check whether a registered storage is reachable/healthy. |
| `cloudstorages_api.retrieve_actions(id: int)` | Return the operations the credentials allow on the bucket (e.g. `"read"` / `"read,write"`) as a string. `id` is the cloud storage id; the string is the returned data (first tuple element). |
| `cloudstorages_api.retrieve_preview(id: int)` | Fetch a preview image for the storage. `id` is the cloud storage id; the image bytes are on the HTTP response (`response.data`, the second tuple element), not the parsed data. |
| `PatchedCloudStorageWriteRequest(key=..., secret_key=...)` | Rotate credentials through `update_cloud_storage` (any writable field can be patched). |

_Notes:_

- The server validates the bucket by connecting to `endpoint_url` itself, so use an address the
  server container can reach.
- Full module:
  [`cloud_storage.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/cloud_storage.py).
