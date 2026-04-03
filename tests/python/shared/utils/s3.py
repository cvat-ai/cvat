# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import time
from io import BytesIO

import boto3
from botocore.exceptions import ClientError
from shared.utils.config import MINIO_ENDPOINT_URL, MINIO_KEY, MINIO_SECRET_KEY


class S3Client:
    def __init__(
        self, endpoint_url: str, *, access_key: str, secret_key: str, bucket: str | None = None
    ) -> None:
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
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

    @staticmethod
    def _is_clock_skew_error(error: ClientError) -> bool:
        code = error.response.get("Error", {}).get("Code")
        return code in {"RequestTimeTooSkewed", "RequestExpired"}

    def _refresh_client(self) -> None:
        self.client = self._make_boto_client(
            endpoint_url=self.endpoint_url,
            access_key=self.access_key,
            secret_key=self.secret_key,
        )

    def _call_with_retry(self, callback):
        max_retries = 4
        for attempt in range(max_retries + 1):
            try:
                return callback()
            except ClientError as e:
                if not self._is_clock_skew_error(e) or attempt == max_retries:
                    raise

                # MinIO can briefly reject signed requests after host sleep/time jump.
                # Recreate the client and retry with exponential backoff.
                self._refresh_client()
                time.sleep(0.5 * (2**attempt))

    def create_file(self, filename: str, data: bytes = b"", *, bucket: str | None = None):
        bucket = bucket or self.bucket
        assert bucket

        def _put_object():
            if hasattr(data, "seek"):
                data.seek(0)
            self.client.put_object(Body=data, Bucket=bucket, Key=filename)

        self._call_with_retry(_put_object)

    def remove_file(
        self,
        filename: str,
        *,
        bucket: str | None = None,
        ignore_clock_skew: bool = False,
    ):
        bucket = bucket or self.bucket
        assert bucket
        try:
            self._call_with_retry(lambda: self.client.delete_object(Bucket=bucket, Key=filename))
        except ClientError as e:
            # Some long-running test sessions hit transient host/container clock skew during
            # finalizer cleanup. Allow cleanup-only callers to ignore that noise without
            # masking normal S3 operation failures.
            if ignore_clock_skew and self._is_clock_skew_error(e):
                return
            raise

    def file_exists(self, filename: str, *, bucket: str | None = None) -> bool:
        bucket = bucket or self.bucket
        assert bucket
        try:
            self._call_with_retry(lambda: self.client.head_object(Bucket=bucket, Key=filename))
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            else:
                raise

    def download_fileobj(self, key: str, *, bucket: str | None = None) -> bytes:
        bucket = bucket or self.bucket
        assert bucket
        with BytesIO() as data:
            self._call_with_retry(
                lambda: self.client.download_fileobj(Bucket=bucket, Key=key, Fileobj=data)
            )
            return data.getvalue()


def make_client(*, bucket: str | None = None) -> S3Client:
    return S3Client(
        endpoint_url=MINIO_ENDPOINT_URL,
        access_key=MINIO_KEY,
        secret_key=MINIO_SECRET_KEY,
        bucket=bucket,
    )
