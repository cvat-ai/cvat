# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Cloud storage management (also a shared helper).

Register an S3-compatible cloud storage, then list, retrieve, update, and delete
storages. There is no high-level proxy for cloud storages yet, so this uses the
low-level API client (``client.api_client.cloudstorages_api``). Any S3-compatible
bucket works with the AWS S3 provider via a custom ``endpoint_url``.

``register_cloud_storage`` is reused by ``task_management`` (create a task from a
bucket) and by the dataset export helpers in ``task_management`` /
``project_management`` (export a dataset to a bucket).
"""

from cvat_sdk import Client, models


def register_cloud_storage(
    client: Client,
    *,
    bucket: str,
    key: str,
    secret_key: str,
    endpoint_url: str,
    display_name: str | None = None,
) -> int:
    """Register an S3-compatible bucket as a CVAT cloud storage and return its id."""
    cs, _ = client.api_client.cloudstorages_api.create(
        models.CloudStorageWriteRequest(
            provider_type="AWS_S3_BUCKET",  # S3-compatible bucket
            resource=bucket,
            display_name=display_name or bucket,
            credentials_type="KEY_SECRET_KEY_PAIR",
            key=key,
            secret_key=secret_key,
            specific_attributes=f"endpoint_url={endpoint_url}",
        )
    )
    print("Registered cloud storage", cs.id, "->", bucket)
    return cs.id


def list_cloud_storages(client: Client) -> list:
    """List registered cloud storages (low-level API - no proxy yet)."""
    data, _ = client.api_client.cloudstorages_api.list()
    return list(data.results)


def get_cloud_storage(client: Client, cloud_storage_id: int):
    """Retrieve a single cloud storage by id.

    Credentials (key/secret) are never returned by the server - the read model
    exposes only metadata such as ``display_name``, ``provider_type``, and
    ``resource`` (the bucket name).
    """
    cs, _ = client.api_client.cloudstorages_api.retrieve(cloud_storage_id)
    return cs


def update_cloud_storage(
    client: Client,
    cloud_storage_id: int,
    *,
    display_name: str | None = None,
    description: str | None = None,
):
    """Update a cloud storage's metadata (a PATCH - only the fields you pass change).

    Pass ``display_name`` and/or ``description``. Rotating credentials also goes
    through this call (``key``/``secret_key`` on ``PatchedCloudStorageWriteRequest``).
    """
    changes = {}
    if display_name is not None:
        changes["display_name"] = display_name
    if description is not None:
        changes["description"] = description
    cs, _ = client.api_client.cloudstorages_api.partial_update(
        cloud_storage_id,
        patched_cloud_storage_write_request=models.PatchedCloudStorageWriteRequest(**changes),
    )
    print("Updated cloud storage", cs.id)
    return cs


def delete_cloud_storage(client: Client, cloud_storage_id: int) -> None:
    """Delete a cloud storage by id.

    This only detaches the bucket from CVAT - it never touches the bucket's
    contents.
    """
    client.api_client.cloudstorages_api.destroy(cloud_storage_id)
    print("Deleted cloud storage", cloud_storage_id)


if __name__ == "__main__":
    import os

    from examples._auth import open_client

    with open_client() as client:
        cs_id = register_cloud_storage(
            client,
            bucket=os.environ["S3_BUCKET"],
            key=os.environ["S3_ACCESS_KEY"],
            secret_key=os.environ["S3_SECRET_KEY"],
            endpoint_url=os.environ["S3_ENDPOINT_URL"],
        )
        print("Retrieved:", get_cloud_storage(client, cs_id).display_name)
        update_cloud_storage(client, cs_id, display_name="renamed bucket")
        delete_cloud_storage(client, cs_id)
