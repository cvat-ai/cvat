# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from io import BytesIO
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from shared.utils.config import MINIO_ENDPOINT_URL, MINIO_KEY, MINIO_SECRET_KEY


class S3Client:
    def __init__(
        self, endpoint_url: str, *, access_key: str, secret_key: str, bucket: Optional[str] = None
    ) -> None:
        self.client = self._make_boto_client(
            endpoint_url=endpoint_url, access_key=access_key, secret_key=secret_key
        )
        self.bucket = bucket

    @staticmethod
    def _make_boto_client(endpoint_url: str, *, access_key: str, secret_key: str):
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url,
        )
        return s3.meta.client

    def create_file(self, filename: str, data: bytes = b"", *, bucket: Optional[str] = None):
        bucket = bucket or self.bucket
        assert bucket
        self.client.put_object(Body=data, Bucket=bucket, Key=filename)

    def remove_file(self, filename: str, *, bucket: Optional[str] = None):
        bucket = bucket or self.bucket
        assert bucket
        self.client.delete_object(Bucket=bucket, Key=filename)

    def file_exists(self, filename: str, *, bucket: Optional[str] = None) -> bool:
        bucket = bucket or self.bucket
        assert bucket
        try:
            self.client.head_object(Bucket=bucket, Key=filename)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            else:
                raise

    def download_fileobj(self, key: str, *, bucket: Optional[str] = None) -> bytes:
        bucket = bucket or self.bucket
        assert bucket
        with BytesIO() as data:
            self.client.download_fileobj(Bucket=bucket, Key=key, Fileobj=data)
            return data.getvalue()


def make_client(*, bucket: Optional[str] = None) -> S3Client:
    return S3Client(
        endpoint_url=MINIO_ENDPOINT_URL,
        access_key=MINIO_KEY,
        secret_key=MINIO_SECRET_KEY,
        bucket=bucket,
    )
