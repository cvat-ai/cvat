# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Prepare the Moto S3 server for cloud storage tests.

Create the fixture buckets, upload sample files and manifests, enable anonymous
access to the public bucket, and create an empty bucket for backing storage.
Connection settings and credentials come from the container's AWS environment.
"""

import json
from pathlib import Path

import boto3

SHARE_DIR = Path("/mnt/mounted_file_share")
MANIFEST_DIR = Path("/mnt/images_with_manifest")
FIXTURE_BUCKETS = ("private", "public", "test", "importexportbucket")


def upload_directory(s3, bucket: str, source: Path, prefix: str) -> None:
    """Upload files recursively, preserving their paths under the given prefix."""
    for path in sorted(source.rglob("*")):
        if not path.is_file():
            continue

        key = prefix + path.relative_to(source).as_posix()
        s3.upload_file(str(path), bucket, key)


def populate_bucket(s3, bucket: str) -> None:
    """Upload shared files and manifests using the paths expected by the tests."""
    # The private bucket exercises access to files below a directory prefix.
    prefix = "sub/" if bucket == "private" else ""
    manifest_prefix = f"{prefix}images_with_manifest/"

    upload_directory(s3, bucket, SHARE_DIR, prefix)
    upload_directory(s3, bucket, MANIFEST_DIR, manifest_prefix)

    # Cloud storage tests also expect two additional copies of the same manifest.
    for index in (1, 2):
        s3.upload_file(
            str(MANIFEST_DIR / "manifest.jsonl"),
            bucket,
            f"{manifest_prefix}manifest_{index}.jsonl",
        )


def allow_public_access(s3) -> None:
    """Allow anonymous listing, downloads, uploads, and deletion in public."""
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                "Resource": "arn:aws:s3:::public",
            },
            {
                "Effect": "Allow",
                "Principal": "*",
                # Moto 5.2.3 checks HEAD separately from GetObject. CVAT's
                # anonymous downloads use HEAD before fetching the data.
                "Action": [
                    "s3:GetObject",
                    "s3:HeadObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                ],
                "Resource": "arn:aws:s3:::public/*",
            },
        ],
    }
    s3.put_bucket_policy(Bucket="public", Policy=json.dumps(policy))


def main() -> None:
    s3 = boto3.client("s3")

    # 1. Create and populate the buckets used by cloud storage tests.
    for bucket in FIXTURE_BUCKETS:
        s3.create_bucket(Bucket=bucket)
        populate_bucket(s3, bucket)

    # 2. Enable anonymous access for tests that do not supply S3 credentials.
    allow_public_access(s3)

    # 3. Leave backing storage empty; tests upload task data into it themselves.
    s3.create_bucket(Bucket="backingcs")


if __name__ == "__main__":
    main()
