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
new one, and renames it — a smoke test that the credentials work.

| Variable | Required | Meaning |
| --- | --- | --- |
| `CVAT_HOST` | yes | Server URL |
| `CVAT_ACCESS_TOKEN` | yes | Personal Access Token |
| `S3_BUCKET` | yes | Bucket name |
| `S3_ACCESS_KEY` | yes | Bucket access key id |
| `S3_SECRET_KEY` | yes | Bucket secret key |
| `S3_ENDPOINT_URL` | yes | Endpoint URL, e.g. `https://s3.amazonaws.com` |
| `CVAT_EXAMPLES_CLEANUP` | no | Set to `1` to detach the bucket from CVAT (data untouched) |

```bash
export CVAT_HOST=https://app.cvat.ai
export CVAT_ACCESS_TOKEN=...
export S3_BUCKET=my-bucket
export S3_ACCESS_KEY=...
export S3_SECRET_KEY=...
export S3_ENDPOINT_URL=https://s3.amazonaws.com
python cloud_storage_register.py
```

### The script

```python
"""Attach an S3-compatible bucket to CVAT as a cloud storage, then list,
retrieve, and update it. Any S3-compatible service works (AWS S3, minio, ...)
via the AWS_S3_BUCKET provider and a custom endpoint URL.

There is no high-level proxy for cloud storages yet, so this recipe uses the
low-level API (client.api_client.cloudstorages_api).

Steps:
  1. Register the bucket with key/secret credentials.
  2. List all registered storages.
  3. Retrieve the new one (the server never returns credentials).
  4. Update its display name.
  5. Optionally detach it (CVAT_EXAMPLES_CLEANUP=1) — the bucket's contents
     are never touched.

Usage:
  export CVAT_HOST=https://app.cvat.ai
  export CVAT_ACCESS_TOKEN=...    # CVAT UI: Profile -> Security
  export S3_BUCKET=my-bucket
  export S3_ACCESS_KEY=...
  export S3_SECRET_KEY=...
  export S3_ENDPOINT_URL=https://s3.amazonaws.com
  python cloud_storage_register.py
"""

import os
import sys

from cvat_sdk import make_client, models


def require_env(name: str, hint: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Set the {name} environment variable: {hint}")
    return value


HOST = require_env("CVAT_HOST", "your CVAT server URL, e.g. https://app.cvat.ai")
TOKEN = require_env("CVAT_ACCESS_TOKEN", "create one in the CVAT UI: Profile -> Security")
BUCKET = require_env("S3_BUCKET", "the bucket name, e.g. my-bucket")
ACCESS_KEY = require_env("S3_ACCESS_KEY", "the bucket's access key id")
SECRET_KEY = require_env("S3_SECRET_KEY", "the bucket's secret key")
ENDPOINT_URL = require_env("S3_ENDPOINT_URL", "e.g. https://s3.amazonaws.com or http://minio:9000")
CLEANUP = os.environ.get("CVAT_EXAMPLES_CLEANUP") == "1"


def main() -> None:
    with make_client(HOST, access_token=TOKEN) as client:
        api = client.api_client.cloudstorages_api

        # 1. Register
        storage, _ = api.create(
            models.CloudStorageWriteRequest(
                provider_type="AWS_S3_BUCKET",  # any S3-compatible service
                resource=BUCKET,
                display_name=BUCKET,
                credentials_type="KEY_SECRET_KEY_PAIR",
                key=ACCESS_KEY,
                secret_key=SECRET_KEY,
                specific_attributes=f"endpoint_url={ENDPOINT_URL}",
            )
        )
        print(f"Registered cloud storage {storage.id} -> {BUCKET}")

        # 2. List
        page, _ = api.list()
        print(f"Registered storages: {[cs.id for cs in page.results]}")

        # 3. Retrieve — credentials are never returned, only metadata
        fetched, _ = api.retrieve(storage.id)
        print(f"Storage {fetched.id}: {fetched.display_name!r} ({fetched.provider_type})")

        # 4. Update the display name (PATCH — only the passed fields change)
        updated, _ = api.partial_update(
            storage.id,
            patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(
                display_name=f"{BUCKET} (updated)"
            ),
        )
        print(f"Renamed storage {updated.id} to {updated.display_name!r}")

        # 5. Opt-in cleanup: detaches the bucket from CVAT, never deletes data
        if CLEANUP:
            api.destroy(storage.id)
            print(f"Deleted cloud storage {storage.id}")
        else:
            print("Keeping the storage; set CVAT_EXAMPLES_CLEANUP=1 to delete it")


if __name__ == "__main__":
    main()
```

_Other SDK options:_

The recipe uses the low-level `client.api_client.cloudstorages_api` because there
is no high-level proxy for cloud storages yet.

| SDK method / parameter | What it adds |
| --- | --- |
| `models.CloudStorageWriteRequest(description=...)` | Free-text description shown alongside the storage. |
| `models.CloudStorageWriteRequest(manifests=[...])` | Attach manifest files so CVAT can index large buckets faster. |
| `CloudStorageWriteRequest(session_token=..., connection_string=..., account_name=...)` | Alternative credential fields for other providers (e.g. Azure, temporary S3 sessions). |
| `cloudstorages_api.retrieve_status(id=...)` | Check whether a registered storage is reachable/healthy. |
| `cloudstorages_api.retrieve_actions(id: int)` | Return the operations the credentials allow on the bucket (e.g. `"read"` / `"read,write"`) as a string. `id` is the cloud storage id; the string is the returned data (first tuple element). |
| `cloudstorages_api.retrieve_preview(id: int)` | Fetch a preview image for the storage. `id` is the cloud storage id; the image bytes are on the HTTP response (`response.data`, the second tuple element), not the parsed data. |
| `PatchedCloudStorageWriteRequest(key=..., secret_key=...)` | Rotate credentials through `partial_update` (any writable field can be patched). |

_Notes:_

- The server validates the bucket by connecting to `endpoint_url` itself, so use
  an address the server container can reach.
- Cleanup detaches the bucket from CVAT; the bucket's contents are never touched.
- Full recipe:
  [`cloud_storage_register.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/cloud_storage_register.py).
