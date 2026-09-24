# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Populate the test S3 server with the cloud storage fixtures."""

import json
from pathlib import Path

import boto3


def main():
    s3 = boto3.client("s3")
    manifest_dir = Path("/mnt/images_with_manifest")
    share_dir = Path("/mnt/mounted_file_share")

    for bucket in ("private", "public", "test", "importexportbucket"):
        s3.create_bucket(Bucket=bucket)
        prefix = "sub/" if bucket == "private" else ""
        for source, destination in ((share_dir, ""), (manifest_dir, "images_with_manifest/")):
            for path in sorted(source.rglob("*")):
                if path.is_file():
                    key = prefix + destination + path.relative_to(source).as_posix()
                    s3.upload_file(str(path), bucket, key)

        for index in (1, 2):
            s3.upload_file(
                str(manifest_dir / "manifest.jsonl"),
                bucket,
                f"{prefix}images_with_manifest/manifest_{index}.jsonl",
            )

    s3.put_bucket_policy(
        Bucket="public",
        Policy=json.dumps(
            {
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
                        # Moto 5.2.2 checks HEAD separately from GetObject. CVAT's
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
        ),
    )
    s3.create_bucket(Bucket="backingcs")


if __name__ == "__main__":
    main()
