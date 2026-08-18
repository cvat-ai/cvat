# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Attach an S3-compatible bucket to CVAT as a cloud storage, then list,
retrieve, and update it. Any S3-compatible service works (AWS S3, minio, ...)
via the AWS_S3_BUCKET provider and a custom endpoint URL.

There is no high-level proxy for cloud storages yet, so this recipe uses the
low-level API (client.api_client.cloudstorages_api).

Steps:
  1. Attach the bucket with key/secret credentials to CVAT.
  2. List all registered storages.
  3. Retrieve the new one.
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
