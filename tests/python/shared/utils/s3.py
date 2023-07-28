# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from io import BytesIO

import boto3
from botocore.exceptions import ClientError

from shared.utils.config import MINIO_ENDPOINT_URL, MINIO_KEY, MINIO_SECRET_KEY


class S3Client:
    def __init__(self, endpoint_url: str, *, access_key: str, secret_key: str) -> None:
        self.client = self._make_boto_client(
            endpoint_url=endpoint_url, access_key=access_key, secret_key=secret_key
        )

    @staticmethod
    def _make_boto_client(endpoint_url: str, *, access_key: str, secret_key: str):
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url=endpoint_url,
        )
        return s3.meta.client

    def create_file(self, bucket: str, filename: str, data: bytes = b""):
        self.client.put_object(Body=data, Bucket=bucket, Key=filename)

    def remove_file(self, bucket: str, filename: str):
        self.client.delete_object(Bucket=bucket, Key=filename)

    def file_exists(self, bucket: str, filename: str) -> bool:
        try:
            self.client.head_object(Bucket=bucket, Key=filename)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            else:
                raise

    def download_fileobj(self, bucket: str, key: str) -> bytes:
        with BytesIO() as data:
            self.client.download_fileobj(Bucket=bucket, Key=key, Fileobj=data)
            return data.getvalue()


def make_client() -> S3Client:
    return S3Client(
        endpoint_url=MINIO_ENDPOINT_URL, access_key=MINIO_KEY, secret_key=MINIO_SECRET_KEY
    )
