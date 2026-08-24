---
title: 'Cloud storage recipes'
linkTitle: 'Cloud storage'
weight: 6
description: 'Attach an S3-compatible bucket to CVAT via the low-level cloud storages API'
---

One recipe: `cloud_storage_register.py` registers an S3-compatible bucket
(AWS S3, MinIO, DigitalOcean Spaces, …) as a CVAT cloud storage. It uses the
low-level `client.api_client.cloudstorages_api` because there is no high-level
proxy for cloud storages yet.

## Attach a bucket to CVAT

Registers a bucket by key/secret, lists all registered storages, retrieves the
new one, lists the bucket's actual content, and renames it — a smoke test that
the credentials work.

| Flag | Required | Meaning |
| --- | --- | --- |
| `--host` | yes | Server URL |
| `--token` | yes | Personal Access Token |
| `--bucket` | yes | Bucket name |
| `--access-key` | yes | Bucket access key id |
| `--secret-key` | yes | Bucket secret key |
| `--endpoint-url` | yes | Endpoint URL, e.g. `'https://s3.amazonaws.com'` |
| `--page-size` | no | Entries per bucket listing request (default: the server maximum, 500) |
| `--cleanup` | no | Detach the bucket from CVAT at the end (data untouched) |

```bash
python cloud_storage_register.py --host 'https://app.cvat.ai' --token '<your token>' \
    --bucket 'my-bucket' --access-key '<key>' --secret-key '<secret>' \
    --endpoint-url 'https://s3.amazonaws.com'
```

### The script

{{< include-code "assets/sdk-examples/cloud_storage_register.py" >}}

_Other SDK options:_

The recipe uses the low-level `client.api_client.cloudstorages_api` because
there is no high-level proxy for cloud storages yet.

| SDK method / parameter | What it adds |
| --- | --- |
| `models.CloudStorageWriteRequest(description=...)` | Free-text description shown alongside the storage. |
| `models.CloudStorageWriteRequest(manifests=[...])` | Attach manifest files so CVAT can index large buckets faster. |
| `CloudStorageWriteRequest(session_token=..., connection_string=..., account_name=...)` | Alternative credential fields for other providers (e.g. Azure, temporary S3 sessions). |
| `cloudstorages_api.retrieve_status(id=...)` | Check whether a registered storage is reachable/healthy. |
| `cloudstorages_api.retrieve_actions(id: int)` | Return the operations the credentials allow on the bucket (e.g. `"read"` / `"read,write"`) as a string. `id` is the cloud storage id; the string is the returned data (first tuple element). |
| `cloudstorages_api.retrieve_content_v2(id, prefix=..., manifest_path=..., page_size=...)` | List the bucket's actual files/directories. `prefix` filters to one "directory"; `manifest_path` lists from a manifest instead of a live bucket scan (faster for large buckets). |
| `cloudstorages_api.retrieve_preview(id: int)` | Fetch a preview image for the storage. `id` is the cloud storage id; the image bytes are on the HTTP response (`response.data`, the second tuple element), not the parsed data. |
| `PatchedCloudStorageWriteRequest(key=..., secret_key=...)` | Rotate credentials through `partial_update` (any writable field can be patched). |
| `get_paginated_collection(api.list_endpoint)` | Walk every page of any low-level `*_api.list_endpoint` (tasks, jobs, cloud storages, ...); returns a flat list. |

_Notes:_

- The server validates the bucket by connecting to `endpoint_url` itself, so
  use an address the server container can reach.
- Cleanup detaches the bucket from CVAT; the bucket's contents are never
  touched.
- Full recipe:
  [`cloud_storage_register.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/cloud_storage_register.py).
