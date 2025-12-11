# Copyright (C) 2021-2023 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import functools
import io
import json
import os
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterator, Sequence
from concurrent.futures import FIRST_EXCEPTION, Future, ThreadPoolExecutor, wait
from enum import Enum
from io import BytesIO
from pathlib import Path
from queue import Queue
from typing import Any, BinaryIO, TypeVar

import boto3
from azure.core.exceptions import HttpResponseError, ServiceRequestError
from azure.storage.blob import BlobServiceClient, ContainerClient
from azure.storage.blob._list_blobs_helper import BlobPrefix
from boto3.s3.transfer import TransferConfig
from botocore.client import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from botocore.handlers import disable_signing
from django.conf import settings
from google.api_core.exceptions import RetryError
from google.cloud import storage
from google.cloud.exceptions import Forbidden as GoogleCloudForbidden
from google.cloud.exceptions import NotFound as GoogleCloudNotFound
from PIL import Image, ImageFile
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rq import get_current_job

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import CloudProviderChoice, CredentialsTypeChoice, DimensionType
from cvat.apps.engine.rq import ExportRQMeta
from cvat.apps.engine.utils import get_cpu_number
from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS
from utils.dataset_manifest.utils import InvalidPcdError, PcdReader


class NamedBytesIO(BytesIO):
    @property
    def filename(self) -> str | None:
        return getattr(self, "_filename", None)

    @filename.setter
    def filename(self, value: str) -> None:
        self._filename = value


slogger = ServerLogManager(__name__)

ImageFile.LOAD_TRUNCATED_IMAGES = True

CPU_NUMBER = get_cpu_number()


def get_max_threads_number(number_of_files: int) -> int:
    return max(
        min(
            number_of_files // settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER_PER_CPU,
            CPU_NUMBER * settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER_PER_CPU,
        ),
        settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER_PER_CPU,
    )


class Status(str, Enum):
    AVAILABLE = "AVAILABLE"
    NOT_FOUND = "NOT_FOUND"
    FORBIDDEN = "FORBIDDEN"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def values(cls):
        return list(i.value for i in cls)

    def __str__(self):
        return self.value


class Permissions(str, Enum):
    READ = "read"
    WRITE = "write"

    @classmethod
    def all(cls):
        return {i.value for i in cls}


def validate_bucket_status(func):
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        try:
            res = func(self, *args, **kwargs)
        except Exception as ex:
            # check that cloud storage exists
            storage_status = self.get_status() if self is not None else None
            if storage_status == Status.FORBIDDEN:
                raise PermissionDenied(
                    "The resource {} is no longer available. Access forbidden.".format(self.name)
                )
            elif storage_status == Status.NOT_FOUND:
                raise NotFound(
                    "The resource {} not found. It may have been deleted.".format(self.name)
                )
            elif storage_status == Status.AVAILABLE:
                raise
            raise ValidationError(str(ex))
        return res

    return wrapper


def validate_file_status(func):
    @functools.wraps(func)
    def wrapper(self, key: str, /, *args, **kwargs):
        try:
            res = func(self, key, *args, **kwargs)
        except Exception as ex:
            storage_status = self.get_status() if self is not None else None
            if storage_status == Status.AVAILABLE:
                file_status = self.get_file_status(key)
                if file_status == Status.NOT_FOUND:
                    raise NotFound(
                        "The file '{}' not found on the cloud storage '{}'".format(key, self.name)
                    )
                elif file_status == Status.FORBIDDEN:
                    raise PermissionDenied(
                        "Access to the file '{}' on the '{}' cloud storage is denied".format(
                            key, self.name
                        )
                    )
                raise ValidationError(str(ex)) from ex
            else:
                raise
        return res

    return wrapper


class _CloudStorage(ABC):
    def __init__(self, prefix: str | None = None):
        self.prefix = prefix

    @property
    @abstractmethod
    def name(self):
        pass

    @abstractmethod
    def _head_file(self, key: str, /):
        pass

    @abstractmethod
    def _head(self):
        pass

    @abstractmethod
    def get_status(self):
        pass

    @abstractmethod
    def get_file_status(self, key: str, /):
        pass

    @abstractmethod
    def get_file_last_modified(self, key: str, /):
        pass

    @abstractmethod
    def _download_fileobj_to_stream(self, key: str, stream: BinaryIO, /) -> None:
        pass

    @validate_file_status
    @validate_bucket_status
    def download_fileobj(self, key: str, /) -> NamedBytesIO:
        buf = NamedBytesIO()
        self._download_fileobj_to_stream(key, buf)
        buf.seek(0)
        buf.filename = key
        return buf

    @validate_file_status
    @validate_bucket_status
    def download_file(self, key: str, path: str, /) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            with open(path, "wb") as f:
                self._download_fileobj_to_stream(key, f)
        except Exception:
            Path(path).unlink()
            raise

    @validate_file_status
    @validate_bucket_status
    def download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int = 0) -> bytes:
        """Method downloads the required bytes range of the file.

        Args:
            key (str): File on the bucket
            stop_byte (int): Stop byte
            start_byte (int, optional): Start byte. Defaults to 0.

        Raises:
            ValidationError: If start_byte > stop_byte

        Returns:
            bytes: Range with bytes
        """

        if start_byte > stop_byte:
            raise ValidationError(f"Incorrect bytes range was received: {start_byte}-{stop_byte}")
        return self._download_range_of_bytes(key, stop_byte=stop_byte, start_byte=start_byte)

    @abstractmethod
    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int):
        pass

    def bulk_download_to_memory(
        self, files: list[str], *, object_downloader: Callable[[str], NamedBytesIO] = None
    ) -> Iterator[BytesIO]:
        func = object_downloader or self.download_fileobj
        threads_number = get_max_threads_number(len(files))

        # We're using a custom queue to limit the maximum number of downloaded unprocessed
        # files stored in the memory.
        # For example, the builtin executor.map() could also be used here, but it
        # would enqueue all the file list in one go, and the downloaded files
        # would all be stored in memory until processed.
        queue: Queue[Future] = Queue(maxsize=threads_number)
        input_iter = iter(files)
        with ThreadPoolExecutor(max_workers=threads_number) as executor:
            while not queue.empty() or input_iter is not None:
                while not queue.full() and input_iter is not None:
                    next_job_params = next(input_iter, None)
                    if next_job_params is None:
                        input_iter = None
                        break

                    next_job = executor.submit(func, next_job_params)
                    queue.put(next_job)

                top_job = queue.get()
                yield top_job.result()

    def bulk_download_to_dir(
        self,
        files: list[str | tuple[str, str]],
        upload_dir: str,
    ) -> None:
        """
        :param files: a list of filenames or (storage filename, output filename) pairs
        :param upload_dir: the output directory
        """

        threads_number = get_max_threads_number(len(files))

        with ThreadPoolExecutor(max_workers=threads_number) as executor:
            futures = []
            for f in files:
                if isinstance(f, tuple):
                    key, output_path = f
                else:
                    key = f
                    output_path = f

                output_path = os.path.join(upload_dir, output_path)
                futures.append(executor.submit(self.download_file, key, output_path))

            done, _ = wait(futures, return_when=FIRST_EXCEPTION)
            for future in done:
                if ex := future.exception():
                    raise ex

    @abstractmethod
    def upload_fileobj(self, file_obj: BinaryIO, key: str, /):
        pass

    @abstractmethod
    def upload_file(self, file_path: str, key: str | None = None, /):
        pass

    @abstractmethod
    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        *,
        next_token: str | None = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> dict:
        pass

    def list_files_on_one_page(
        self,
        prefix: str = "",
        *,
        next_token: str | None = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
        _use_flat_listing: bool = False,
        _use_sort: bool = False,
    ) -> dict:

        if (
            self.prefix
            and prefix
            and not (self.prefix.startswith(prefix) or prefix.startswith(self.prefix))
        ):
            return {
                "content": [],
                "next": None,
            }

        search_prefix = prefix
        if self.prefix and (len(prefix) < len(self.prefix)):
            if prefix and "/" in self.prefix[len(prefix) :]:
                next_layer_and_tail = self.prefix[prefix.find("/") + 1 :].split("/", maxsplit=1)
                if 2 == len(next_layer_and_tail):
                    directory = (
                        next_layer_and_tail[0]
                        if not _use_flat_listing
                        else self.prefix[: prefix.find("/") + 1] + next_layer_and_tail[0] + "/"
                    )
                    return {
                        "content": [{"name": directory, "type": "DIR"}],
                        "next": None,
                    }
                else:
                    search_prefix = self.prefix
            else:
                search_prefix = self.prefix

        result = self._list_raw_content_on_one_page(
            search_prefix, next_token=next_token, page_size=page_size
        )

        if not _use_flat_listing:
            result["directories"] = [d.strip("/") for d in result["directories"]]
        content = [{"name": f, "type": "REG"} for f in result["files"]]
        content.extend([{"name": d, "type": "DIR"} for d in result["directories"]])

        if not _use_flat_listing and search_prefix and "/" in search_prefix:
            last_slash = search_prefix.rindex("/")
            for f in content:
                f["name"] = f["name"][last_slash + 1 :]

        if _use_sort:
            content = sorted(content, key=lambda x: x["type"])

        return {
            "content": content,
            "next": result["next"],
        }

    def list_files(
        self,
        prefix: str = "",
        *,
        _use_flat_listing: bool = False,
    ) -> list[str]:
        all_files = []
        next_token = None
        while True:
            batch = self.list_files_on_one_page(
                prefix, next_token=next_token, _use_flat_listing=_use_flat_listing
            )
            all_files.extend(batch["content"])
            next_token = batch["next"]
            if not next_token:
                break

        return all_files

    @property
    @abstractmethod
    def supported_actions(self):
        pass

    @property
    def read_access(self):
        return Permissions.READ in self.access

    @property
    def write_access(self):
        return Permissions.WRITE in self.access


class HeaderFirstDownloader(ABC):
    def __init__(self, *, client: _CloudStorage):
        self.client = client

    @abstractmethod
    def try_parse_header(self, header: NamedBytesIO) -> Any | None: ...

    def log_header_miss(self, key: str, header_size: int, *, full_file: NamedBytesIO | None = None):
        message = (
            f'The first {header_size} bytes were not enough to parse the "{key}" object header. '
        )

        if full_file:
            full_object_size = len(full_file.getvalue())

            message += (
                f"Object size was {full_object_size} bytes. "
                f"Downloaded percentage was "
                f"{min(header_size, full_object_size) / full_object_size:.0%}"
            )

        slogger.glob.warning(message)

    def get_header_sizes_to_try(self) -> Sequence[int]:
        return (
            # The first 1-2Kb are typically enough for most formats with the static header size.
            # Unfortunately, it's not enough for some popular formats, such as jpeg,
            # which can optionally include a preview image embedded in the header, so we try
            # other bigger sizes, but less than the whole file.
            # For comparison, the standard Ethernet v2 MTU size is 1500 bytes.
            2048,
            16384,
            65536,
        )

    def download(self, key: str) -> NamedBytesIO:
        """
        Method downloads the file using the following approach:
        First we try to download the file header (first N bytes).
        It should be enough to determine image properties.
        If it's not enough for the file, the whole file will be downloaded.

        :param key: File on the bucket

        Returns:
            buffer with the image
        """

        buff = NamedBytesIO()
        buff.filename = key

        headers_to_try = self.get_header_sizes_to_try()
        for i, header_size in enumerate(headers_to_try):
            buff.seek(0, io.SEEK_END)
            cur_pos = buff.tell()
            chunk = self.client.download_range_of_bytes(
                key, start_byte=cur_pos, stop_byte=header_size - 1
            )
            buff.write(chunk)
            buff.seek(0)

            if self.try_parse_header(buff):
                buff.seek(0)
                return buff

            if i + 1 < len(headers_to_try):
                self.log_header_miss(key=key, header_size=header_size)

        buff = self.client.download_fileobj(key)
        self.log_header_miss(key=key, header_size=header_size, full_file=buff)
        return buff


class _HeaderFirstImageDownloader(HeaderFirstDownloader):
    def try_parse_header(self, header):
        image_parser = ImageFile.Parser()
        image_parser.feed(header.getvalue())
        return image_parser.image

    def log_header_miss(self, key, header_size, *, full_file=None):
        message = (
            f'The first {header_size} bytes were not enough to parse the "{key}" object header. '
        )

        if full_file:
            full_object_size = len(full_file.getvalue())

            message += (
                f"Object size was {full_object_size} bytes. "
                f"Image resolution was {Image.open(full_file).size}. "
                f"Downloaded percentage was "
                f"{min(header_size, full_object_size) / full_object_size:.0%}"
            )

        slogger.glob.warning(message)

    def download(self, key):
        try:
            return super().download(key)
        except Image.UnidentifiedImageError as e:
            # PIL also can raise many OSErrors, but it's quite a broad class
            # for the general capturing here. The precise info will be available in the logs
            raise Exception(f"Failed to read the image file '{key}'") from e


class _HeaderFirstPcdDownloader(HeaderFirstDownloader):
    def try_parse_header(self, header):
        pcd_parser = PcdReader()
        file = header
        file_ext = os.path.splitext(file.filename)[1].lower()

        if file_ext == ".bin":
            # We need to ensure the file is a valid .bin file
            pcd_parser.parse_bin_header(file)

            # but we need the whole file for the next operations (getting frame size etc.)
            return False
        elif file_ext == ".pcd":
            parameters = pcd_parser.parse_pcd_header(file, verify_version=True)
            if not parameters.get("WIDTH") or not parameters.get("HEIGHT"):
                raise InvalidPcdError("invalid scene size")
        else:
            raise InvalidPcdError(f"The '{file_ext}' file format is not supported")

        return True

    def download(self, key):
        try:
            return super().download(key)
        except InvalidPcdError as e:
            raise Exception(f"Failed to read point cloud file '{key}': {e}") from e


class HeaderFirstMediaDownloader:
    @staticmethod
    def create(dimension: DimensionType, **kwargs) -> HeaderFirstDownloader:
        if dimension == DimensionType.DIM_2D:
            downloader = _HeaderFirstImageDownloader(**kwargs)
        elif dimension == DimensionType.DIM_3D:
            downloader = _HeaderFirstPcdDownloader(**kwargs)
        else:
            assert False

        return downloader


def get_cloud_storage_instance(
    *,
    cloud_provider: CloudProviderChoice,
    resource: str,
    credentials: Credentials,
    specific_attributes: dict[str, Any] | None = None,
):
    instance = None
    if cloud_provider == CloudProviderChoice.AMAZON_S3:
        instance = S3CloudStorage(
            resource,
            access_key_id=credentials.key,
            secret_key=credentials.secret_key,
            session_token=credentials.session_token,
            region=specific_attributes.get("region"),
            endpoint_url=specific_attributes.get("endpoint_url"),
            prefix=specific_attributes.get("prefix"),
        )
    elif cloud_provider == CloudProviderChoice.AZURE_BLOB_STORAGE:
        instance = AzureBlobCloudStorage(
            resource,
            account_name=credentials.account_name,
            sas_token=credentials.session_token,
            connection_string=credentials.connection_string,
            prefix=specific_attributes.get("prefix"),
        )
    elif cloud_provider == CloudProviderChoice.GOOGLE_CLOUD_STORAGE:
        instance = GcsCloudStorage(
            resource,
            service_account_json=credentials.key_file_path,
            anonymous_access=credentials.credentials_type == CredentialsTypeChoice.ANONYMOUS_ACCESS,
            prefix=specific_attributes.get("prefix"),
            location=specific_attributes.get("location"),
            project=specific_attributes.get("project"),
        )
    else:
        raise NotImplementedError(f"The {cloud_provider} provider is not supported")
    return instance


class S3CloudStorage(_CloudStorage):
    transfer_config = {
        "max_io_queue": 10,
    }

    class Effect(str, Enum):
        ALLOW = "Allow"
        DENY = "Deny"

    def __init__(
        self,
        bucket: str,
        *,
        region: str | None = None,
        access_key_id: str | None = None,
        secret_key: str | None = None,
        session_token: str | None = None,
        endpoint_url: str | None = None,
        prefix: str | None = None,
    ):
        super().__init__(prefix=prefix)
        if sum(1 for credential in (access_key_id, secret_key, session_token) if credential) == 1:
            raise Exception("Insufficient data for authentication")

        kwargs = dict()
        for key, arg_v in zip(
            (
                "aws_access_key_id",
                "aws_secret_access_key",
                "aws_session_token",
                "region_name",
            ),
            (access_key_id, secret_key, session_token, region),
        ):
            if arg_v:
                kwargs[key] = arg_v

        session = boto3.Session(**kwargs)
        self._s3 = session.resource(
            "s3",
            endpoint_url=endpoint_url,
            config=Config(
                proxies=PROXIES_FOR_UNTRUSTED_URLS or {},
                max_pool_connections=(
                    # AWS can throttle the requests if there are too many of them,
                    # the SDK handles it with the retry policy:
                    # https://boto3.amazonaws.com/v1/documentation/api/latest/guide/retries.html
                    # 10 is the default value
                    max(10, CPU_NUMBER * settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER_PER_CPU)
                ),
            ),
        )

        # anonymous access
        if not any([access_key_id, secret_key, session_token]):
            self._s3.meta.client.meta.events.register("choose-signer.s3.*", disable_signing)

        self._client = self._s3.meta.client
        self._bucket = self._s3.Bucket(bucket)
        self.region = region

    @property
    def bucket(self):
        return self._bucket

    @property
    def name(self):
        return self._bucket.name

    def _head(self):
        return self._client.head_bucket(Bucket=self.name)

    def _head_file(self, key: str, /):
        return self._client.head_object(Bucket=self.name, Key=key)

    def get_status(self):
        # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html#S3.Client.head_object
        # return only 3 codes: 200, 403, 404
        try:
            self._head()
            return Status.AVAILABLE
        except ClientError as ex:
            code = ex.response["Error"]["Code"]
            if code == "403":
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND
        except EndpointConnectionError:
            slogger.glob.warning(
                f"CloudStorage S3 {self._client.meta.endpoint_url}, {self.name} not available",
                exc_info=True,
            )
            return Status.NOT_FOUND

    def get_file_status(self, key: str, /):
        try:
            self._head_file(key)
            return Status.AVAILABLE
        except ClientError as ex:
            code = ex.response["Error"]["Code"]
            if code == "403":
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key: str, /):
        return self._head_file(key).get("LastModified")

    @validate_bucket_status
    def upload_fileobj(self, file_obj: BinaryIO, key: str, /):
        self._bucket.upload_fileobj(
            Fileobj=file_obj,
            Key=key,
            Config=TransferConfig(max_io_queue=self.transfer_config["max_io_queue"]),
        )

    @validate_bucket_status
    def upload_file(self, file_path: str, key: str | None = None, /):
        try:
            self._bucket.upload_file(
                file_path,
                key or os.path.basename(file_path),
                Config=TransferConfig(max_io_queue=self.transfer_config["max_io_queue"]),
            )
        except ClientError as ex:
            msg = str(ex)
            slogger.glob.error(msg)
            raise Exception(msg)

    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        *,
        next_token: str | None = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> dict:
        # The structure of response looks like this:
        # {
        #    'CommonPrefixes': [{'Prefix': 'sub/'}],
        #    'Contents': [{'ETag': '', 'Key': 'test.jpg', ..., 'Size': 1024}],
        #    ...
        #    'NextContinuationToken': 'str'
        # }
        response = self._client.list_objects_v2(
            Bucket=self.name,
            MaxKeys=page_size,
            Delimiter="/",
            **({"Prefix": prefix} if prefix else {}),
            **({"ContinuationToken": next_token} if next_token else {}),
        )
        files = [f["Key"] for f in response.get("Contents", []) if not f["Key"].endswith("/")]
        directories = [p["Prefix"] for p in response.get("CommonPrefixes", [])]

        return {
            "files": files,
            "directories": directories,
            "next": response.get("NextContinuationToken", None),
        }

    def _download_fileobj_to_stream(self, key: str, stream: BinaryIO, /) -> None:
        self.bucket.download_fileobj(
            Key=key,
            Fileobj=stream,
            Config=TransferConfig(max_io_queue=self.transfer_config["max_io_queue"]),
        )

    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int) -> bytes:
        try:
            return self._client.get_object(
                Bucket=self.bucket.name, Key=key, Range=f"bytes={start_byte}-{stop_byte}"
            )["Body"].read()
        except ClientError as ex:
            if "InvalidRange" in str(ex):
                if self._head_file(key).get("ContentLength") == 0:
                    slogger.glob.info(
                        f"Attempt to download empty file '{key}' from the '{self.name}' bucket."
                    )
                    raise ValidationError(f"The {key} file is empty.")
                else:
                    slogger.glob.error(f"{str(ex)}. Key: {key}, bucket: {self.name}")
            raise

    def delete_file(self, file_name: str, /):
        try:
            self._client.delete_object(Bucket=self.name, Key=file_name)
        except Exception as ex:
            msg = str(ex)
            slogger.glob.info(msg)
            raise

    @property
    def supported_actions(self):
        allowed_actions = set()
        try:
            bucket_policy = self._bucket.Policy().policy
        except ClientError as ex:
            if "NoSuchBucketPolicy" in str(ex):
                return Permissions.all()
            else:
                raise Exception(str(ex))
        bucket_policy = (
            json.loads(bucket_policy) if isinstance(bucket_policy, str) else bucket_policy
        )
        for statement in bucket_policy["Statement"]:
            effect = statement.get("Effect")  # Allow | Deny
            actions = statement.get("Action", set())
            if effect == self.Effect.ALLOW:
                allowed_actions.update(actions)
        access = {
            "s3:GetObject": Permissions.READ,
            "s3:PutObject": Permissions.WRITE,
        }
        allowed_actions = Permissions.all() & {access.get(i) for i in allowed_actions}

        return allowed_actions


class AzureBlobCloudStorage(_CloudStorage):
    MAX_CONCURRENCY = 3

    class Effect:
        pass

    def __init__(
        self,
        container: str,
        *,
        account_name: str | None = None,
        sas_token: str | None = None,
        connection_string: str | None = None,
        prefix: str | None = None,
    ):
        super().__init__(prefix=prefix)
        self._account_name = account_name
        if connection_string:
            self._blob_service_client = BlobServiceClient.from_connection_string(
                connection_string, proxies=PROXIES_FOR_UNTRUSTED_URLS
            )
        elif sas_token:
            self._blob_service_client = BlobServiceClient(
                account_url=self.account_url,
                credential=sas_token,
                proxies=PROXIES_FOR_UNTRUSTED_URLS,
            )
        else:
            self._blob_service_client = BlobServiceClient(
                account_url=self.account_url, proxies=PROXIES_FOR_UNTRUSTED_URLS
            )
        self._client = self._blob_service_client.get_container_client(container)

    @property
    def container(self) -> ContainerClient:
        return self._client

    @property
    def name(self) -> str:
        return self._client.container_name

    @property
    def account_url(self) -> str | None:
        if self._account_name:
            return "{}.blob.core.windows.net".format(self._account_name)
        return None

    def _head(self):
        return self._client.get_container_properties()

    def _head_file(self, key: str, /):
        blob_client = self.container.get_blob_client(key)
        return blob_client.get_blob_properties()

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key: str, /):
        return self._head_file(key).last_modified

    def get_status(self):
        try:
            self._head()
            return Status.AVAILABLE
        except HttpResponseError as ex:
            if ex.status_code == 403:
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND
        except ServiceRequestError:
            slogger.glob.warning(
                f"CloudStorage Azure {self.account_url} not available", exc_info=True
            )
            return Status.NOT_FOUND

    def get_file_status(self, key: str, /):
        try:
            self._head_file(key)
            return Status.AVAILABLE
        except HttpResponseError as ex:
            if ex.status_code == 403:
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND

    @validate_bucket_status
    def upload_fileobj(self, file_obj: BinaryIO, key: str, /):
        self._client.upload_blob(name=key, data=file_obj, overwrite=True)

    def upload_file(self, file_path: str, key: str | None = None, /):
        with open(file_path, "rb") as f:
            self.upload_fileobj(f, key or os.path.basename(file_path))

    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        *,
        next_token: str | None = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> dict:
        page = self._client.walk_blobs(
            maxresults=page_size,
            results_per_page=page_size,
            delimiter="/",
            **({"name_starts_with": prefix} if prefix else {}),
        ).by_page(continuation_token=next_token)
        all_files = list(next(page))

        files, directories = [], []
        for f in all_files:
            if not isinstance(f, BlobPrefix):
                files.append(f.name)
            else:
                directories.append(f.prefix)

        return {
            "files": files,
            "directories": directories,
            "next": page.continuation_token,
        }

    def _download_fileobj_to_stream(self, key: str, stream: BinaryIO, /) -> None:
        storage_stream_downloader = self._client.download_blob(
            blob=key,
            offset=None,
            length=None,
            max_concurrency=self.MAX_CONCURRENCY,
        )
        storage_stream_downloader.readinto(stream)

    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int) -> bytes:
        return self._client.download_blob(blob=key, offset=start_byte, length=stop_byte).readall()

    @property
    def supported_actions(self):
        pass


def _define_gcs_status(func):
    def wrapper(self, key=None):
        try:
            if not key:
                func(self)
            else:
                func(self, key)
            return Status.AVAILABLE
        except (GoogleCloudNotFound, RetryError):
            return Status.NOT_FOUND
        except GoogleCloudForbidden:
            return Status.FORBIDDEN

    return wrapper


class GcsCloudStorage(_CloudStorage):

    class Effect:
        pass

    def __init__(
        self,
        bucket_name: str,
        *,
        prefix: str | None = None,
        service_account_json: Any | None = None,
        anonymous_access: bool = False,
        project: str | None = None,
        location: str | None = None,
    ):
        super().__init__(prefix=prefix)
        if service_account_json:
            self._client = storage.Client.from_service_account_json(service_account_json)
        elif anonymous_access:
            self._client = storage.Client.create_anonymous_client()
        else:
            # If no credentials were provided when constructing the client, the
            # client library will look for credentials in the environment.
            self._client = storage.Client()

        self._bucket = self._client.bucket(bucket_name, user_project=project)
        self._bucket_location = location

    @property
    def bucket(self):
        return self._bucket

    @property
    def name(self):
        return self._bucket.name

    def _head(self):
        return self._client.get_bucket(bucket_or_name=self.name)

    def _head_file(self, key: str, /):
        blob = self.bucket.blob(key)
        return self._client._get_resource(blob.path)

    @_define_gcs_status
    def get_status(self):
        self._head()

    @_define_gcs_status
    def get_file_status(self, key: str, /):
        self._head_file(key)

    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        *,
        next_token: str | None = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> dict:
        iterator = self._client.list_blobs(
            bucket_or_name=self.name,
            max_results=page_size,
            page_size=page_size,
            fields="items(name),nextPageToken,prefixes",  # https://cloud.google.com/storage/docs/json_api/v1/parameters#fields
            delimiter="/",
            **({"prefix": prefix} if prefix else {}),
            **({"page_token": next_token} if next_token else {}),
        )
        # NOTE: we should firstly iterate and only then we can define common prefixes
        files = [
            # skip manually created "directories"
            f.name
            for f in iterator
            if not f.name.endswith("/")
        ]
        directories = iterator.prefixes

        return {
            "files": files,
            "directories": directories,
            "next": iterator.next_page_token,
        }

    def _download_fileobj_to_stream(self, key: str, stream: BinaryIO, /) -> None:
        blob = self.bucket.blob(key)
        self._client.download_blob_to_file(blob, stream)

    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int) -> bytes:
        with BytesIO() as buff:
            blob = self.bucket.blob(key)
            self._client.download_blob_to_file(blob, buff, start_byte, stop_byte)
            buff.seek(0)
            return buff.getvalue()

    @validate_bucket_status
    def upload_fileobj(self, file_obj: BinaryIO, key: str, /):
        self.bucket.blob(key).upload_from_file(file_obj)

    @validate_bucket_status
    def upload_file(self, file_path: str, key: str | None = None, /):
        self.bucket.blob(key or os.path.basename(file_path)).upload_from_filename(file_path)

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key: str, /):
        blob = self.bucket.blob(key)
        blob.reload()
        return blob.updated

    @property
    def supported_actions(self):
        pass


class Credentials:
    __slots__ = (
        "key",
        "secret_key",
        "session_token",
        "account_name",
        "key_file_path",
        "credentials_type",
        "connection_string",
    )

    def __init__(self, **credentials):
        self.key = credentials.get("key", "")
        self.secret_key = credentials.get("secret_key", "")
        self.session_token = credentials.get("session_token", "")
        self.account_name = credentials.get("account_name", "")
        self.key_file_path = credentials.get("key_file_path", None)
        self.credentials_type = credentials.get("credentials_type", None)
        self.connection_string = credentials.get("connection_string", None)

    def convert_to_db(self):
        converted_credentials = {
            CredentialsTypeChoice.KEY_SECRET_KEY_PAIR: " ".join([self.key, self.secret_key]),
            CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR: " ".join(
                [self.account_name, self.session_token]
            ),
            CredentialsTypeChoice.KEY_FILE_PATH: self.key_file_path,
            CredentialsTypeChoice.ANONYMOUS_ACCESS: (
                "" if not self.account_name else self.account_name
            ),
            CredentialsTypeChoice.CONNECTION_STRING: self.connection_string,
        }
        return converted_credentials[self.credentials_type]

    def convert_from_db(self, credentials):
        self.credentials_type = credentials.get("type")
        if self.credentials_type == CredentialsTypeChoice.KEY_SECRET_KEY_PAIR:
            self.key, self.secret_key = credentials.get("value").split()
        elif self.credentials_type == CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR:
            self.account_name, self.session_token = credentials.get("value").split()
        elif self.credentials_type == CredentialsTypeChoice.ANONYMOUS_ACCESS:
            # account_name will be in [some_value, '']
            self.account_name = credentials.get("value")
        elif self.credentials_type == CredentialsTypeChoice.KEY_FILE_PATH:
            self.key_file_path = credentials.get("value")
        elif self.credentials_type == CredentialsTypeChoice.CONNECTION_STRING:
            self.connection_string = credentials.get("value")
        else:
            raise NotImplementedError(
                "Found {} not supported credentials type".format(self.credentials_type)
            )

    def reset(self, exclusion):
        for i in set(self.__slots__) - exclusion - {"credentials_type"}:
            self.__setattr__(i, "")

    def mapping_with_new_values(self, credentials):
        self.credentials_type = credentials.get("credentials_type", self.credentials_type)
        if self.credentials_type == CredentialsTypeChoice.ANONYMOUS_ACCESS:
            self.reset(exclusion={"account_name"})
            self.account_name = credentials.get("account_name", self.account_name)
        elif self.credentials_type == CredentialsTypeChoice.KEY_SECRET_KEY_PAIR:
            self.reset(exclusion={"key", "secret_key"})
            self.key = credentials.get("key", self.key)
            self.secret_key = credentials.get("secret_key", self.secret_key)
        elif self.credentials_type == CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR:
            self.reset(exclusion={"session_token", "account_name"})
            self.session_token = credentials.get("session_token", self.session_token)
            self.account_name = credentials.get("account_name", self.account_name)
        elif self.credentials_type == CredentialsTypeChoice.KEY_FILE_PATH:
            self.reset(exclusion={"key_file_path"})
            self.key_file_path = credentials.get("key_file_path", self.key_file_path)
        elif self.credentials_type == CredentialsTypeChoice.CONNECTION_STRING:
            self.reset(exclusion={"connection_string"})
            self.connection_string = credentials.get("connection_string", self.connection_string)
        else:
            raise NotImplementedError("Mapping credentials: unsupported credentials type")

    def values(self):
        return [
            self.key,
            self.secret_key,
            self.session_token,
            self.account_name,
            self.key_file_path,
        ]


def db_storage_to_storage_instance(db_storage):
    credentials = Credentials()
    credentials.convert_from_db(
        {
            "type": db_storage.credentials_type,
            "value": db_storage.credentials,
        }
    )
    details = {
        "resource": db_storage.resource,
        "credentials": credentials,
        "specific_attributes": db_storage.get_specific_attributes(),
    }
    return get_cloud_storage_instance(cloud_provider=db_storage.provider_type, **details)


T = TypeVar("T", Callable[[str, int, int], int], Callable[[str, int, str, bool], None])


def import_resource_from_cloud_storage(
    filename: str,
    db_storage: Any,
    key: str,
    import_func: T,
    *args,
    **kwargs,
) -> Any:
    storage = db_storage_to_storage_instance(db_storage)
    storage.download_file(key, filename)

    return import_func(filename, *args, **kwargs)


def export_resource_to_cloud_storage(
    db_storage: Any,
    func: Callable[[int, str | None, str | None], str],
    *args,
    **kwargs,
) -> str:
    rq_job = get_current_job()
    assert rq_job, "func can be executed only from a background job"

    file_path = func(*args, **kwargs)
    rq_job_meta = ExportRQMeta.for_job(rq_job)

    storage = db_storage_to_storage_instance(db_storage)
    storage.upload_file(file_path, rq_job_meta.result_filename)

    return file_path
