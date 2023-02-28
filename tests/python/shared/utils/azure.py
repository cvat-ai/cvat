# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from azure.core.exceptions import HttpResponseError
from azure.storage.blob import BlobServiceClient

from shared.utils.config import AZURE_ACCOUNT_NAME, AZURE_TOKEN


class AzureBlobContainerClient:
    def __init__(self, account_name: str, sas_token: str) -> None:
        self.service_client = BlobServiceClient(
            account_url="{}.blob.core.windows.net".format(account_name), credential=sas_token
        )

    def create_file(self, bucket: str, filename: str, data: bytes = b""):
        self.service_client.get_container_client(bucket).upload_blob(name=filename, data=data)

    def remove_file(self, bucket: str, filename: str, **kwargs):
        self.service_client.get_container_client(bucket).delete_blob(blob=filename)

    def file_exists(self, bucket: str, filename: str, **kwargs) -> bool:
        try:
            blob_client = self.service_client.get_container_client(bucket).get_blob_client(filename)
            blob_client.get_blob_properties()
        except HttpResponseError:
            return False
        return True

    def download_fileobj(self, bucket: str, key: str) -> bytes:
        storage_stream_downloader = self.service_client.get_container_client(bucket).download_blob(
            blob=key
        )
        return storage_stream_downloader.content_as_bytes(max_concurrency=3)


def make_client() -> AzureBlobContainerClient:
    return AzureBlobContainerClient(account_name=AZURE_ACCOUNT_NAME, sas_token=AZURE_TOKEN)
