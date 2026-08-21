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
  4. List the bucket's actual content, a page at a time.
  5. Update its display name.
  6. Optionally, detach it from CVAT.

Usage (run ``python cloud_storage_register.py --help`` for the full list of options):
  python cloud_storage_register.py --host 'https://app.cvat.ai' --token '<your token>' \\
      --bucket 'my-bucket' --access-key '<key>' --secret-key '<secret>' \\
      --endpoint-url 'https://s3.amazonaws.com'
"""

import argparse

from cvat_sdk import make_client, models
from cvat_sdk.core.helpers import get_paginated_collection


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=" ".join(__doc__.splitlines()[:3]))
    parser.add_argument("--host", required=True, help="CVAT server URL, e.g. 'https://app.cvat.ai'")
    parser.add_argument(
        "--token",
        required=True,
        help="Personal Access Token (CVAT UI: Profile -> Security)",
    )
    parser.add_argument("--bucket", required=True, help="the bucket name, e.g. 'my-bucket'")
    parser.add_argument("--access-key", required=True, help="the bucket's access key id")
    parser.add_argument("--secret-key", required=True, help="the bucket's secret key")
    parser.add_argument(
        "--endpoint-url",
        required=True,
        help="e.g. 'https://s3.amazonaws.com' or 'http://minio:9000'",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        help="entries to fetch per bucket listing request (default: the server's "
        "maximum, 500); a small value makes the pagination loop visible",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="detach the storage at the end (data is never touched)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with make_client(args.host, access_token=args.token) as client:
        api = client.api_client.cloudstorages_api

        # 1. Register
        storage, _ = api.create(
            models.CloudStorageWriteRequest(
                provider_type="AWS_S3_BUCKET",  # any S3-compatible service
                resource=args.bucket,
                display_name=args.bucket,
                credentials_type="KEY_SECRET_KEY_PAIR",
                key=args.access_key,
                secret_key=args.secret_key,
                specific_attributes=f"endpoint_url={args.endpoint_url}",
            )
        )
        print(f"Registered cloud storage {storage.id} -> {args.bucket}")

        # 2. List — api.list() returns a single page. Pair it with
        # get_paginated_collection to walk every page of any low-level list
        # endpoint (works for tasks_api.list_endpoint, jobs_api.list_endpoint, ...).
        storages = get_paginated_collection(api.list_endpoint)
        print(f"Registered storages: {[cs.id for cs in storages]}")

        # 3. Retrieve — credentials are never returned, only metadata
        fetched, _ = api.retrieve(storage.id)
        print(f"Storage {fetched.id}: {fetched.display_name!r} ({fetched.provider_type})")

        # 4. List the bucket's actual content (not CVAT's registry - the objects
        # inside the bucket itself), a page at a time via next_token.
        page_params = {"page_size": args.page_size} if args.page_size else {}
        files = []
        pages = 0
        next_token = None
        while True:
            content, _ = api.retrieve_content_v2(
                storage.id,
                **page_params,
                **({"next_token": next_token} if next_token else {}),
            )
            files.extend(content.content)
            pages += 1
            if not content.next:
                break
            next_token = content.next
        print(f"Bucket {args.bucket!r} contains {len(files)} entries in {pages} page(s):")
        for f in files:
            print(f"  {f.type.value:>3} {f.name}")

        # 5. Update the display name (PATCH — only the passed fields change)
        updated, _ = api.partial_update(
            storage.id,
            patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(
                display_name=f"{args.bucket} (updated)"
            ),
        )
        print(f"Renamed storage {updated.id} to {updated.display_name!r}")

        # 6. Opt-in cleanup: detaches the bucket from CVAT, never deletes data
        if args.cleanup:
            api.destroy(storage.id)
            print(f"Deleted cloud storage {storage.id}")
        else:
            print("Keeping the storage; pass --cleanup to delete it")


if __name__ == "__main__":
    main()
