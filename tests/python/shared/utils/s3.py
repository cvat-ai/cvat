# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import suppress
import boto3

from botocore.exceptions import ClientError

from shared.utils.config import MINIO_KEY, MINIO_SECRET_KEY, MINIO_ENDPOINT_URL


class S3client:
    def __init__(self, endpoint_url: str, *, access_key: str, secret_key: str) -> None:
        self.client = self._make_boto_client(endpoint_url=endpoint_url,
            access_key=access_key, secret_key=secret_key)

    @staticmethod
    def _make_boto_client(endpoint_url: str, *, access_key: str, secret_key: str):
        s3 = boto3.resource(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            endpoint_url= endpoint_url,
        )
        return s3.meta.client

    def create_asset(self, bucket: str, filename: str, data: bytes = b''):
        self.client.put_object(Body=data, Bucket=bucket, Key=filename)

    def remove_asset(self, bucket: str, filename: str):
        self.client.delete_object(Bucket=bucket, Key=filename)

    def assert_file_does_not_exist(self, bucket: str, filename: str):
        with suppress(ClientError):
            self.client.head_object(Bucket=bucket, Key=filename)
            raise AssertionError(f'File {filename} on bucket {bucket} already exists')

    def assert_file_exists(self, bucket: str, filename: str):
        try:
            self.client.head_object(Bucket=bucket, Key=filename)
        except ClientError:
            raise AssertionError(f"File {filename} on bucket {bucket} doesn't exist")

def make_client():
    return S3client(endpoint_url=MINIO_ENDPOINT_URL,
        access_key=MINIO_KEY, secret_key=MINIO_SECRET_KEY)
