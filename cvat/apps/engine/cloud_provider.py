# Copyright (C) 2021-2023 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import functools
import json
import os
import threading
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterator, Sequence
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import datetime
from enum import Enum
from io import BytesIO
from pathlib import Path, PurePath
from queue import Queue
from typing import Any, BinaryIO, Concatenate, ParamSpec, TypeVar

import boto3
import botocore.hooks
import botocore.loaders
import cachetools
from azure.core.exceptions import HttpResponseError, ServiceRequestError
from azure.storage.blob import BlobServiceClient, ContainerClient
from azure.storage.blob._list_blobs_helper import BlobPrefix
from boto3.s3.transfer import TransferConfig
from botocore import UNSIGNED
from botocore.client import Config
from botocore.exceptions import (
    ClientError,
    ConnectTimeoutError,
    EndpointConnectionError,
    ReadTimeoutError,
)
from django.conf import settings
from google.api_core.exceptions import RetryError
from google.cloud import storage
from google.cloud.exceptions import Forbidden as GoogleCloudForbidden
from google.cloud.exceptions import NotFound as GoogleCloudNotFound
from PIL import Image, ImageFile
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rq import get_current_job

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import (
    CloudProviderChoice,
    CloudStorage,
    CredentialsTypeChoice,
    DimensionType,
)
from cvat.apps.engine.rq import ExportRQMeta
from cvat.apps.engine.utils import get_cpu_number, parse_specific_attributes, take_by
from cvat.utils.http import PROXIES_FOR_UNTRUSTED_URLS
from utils.dataset_manifest.utils import (
    InvalidPcdError,
    MemNamedOpenable,
    MemOpenable,
    NamedOpenable,
    PcdReader,
)

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


class AbstractCloudStorage(ABC):
    def __init__(self, prefix: str | None = None) -> None:
        self.prefix = prefix

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def get_status(self) -> Status:
        pass

    @abstractmethod
    def get_file_status(self, key: str, /) -> Status:
        pass

    @abstractmethod
    def get_file_last_modified(self, key: str, /) -> datetime:
        pass

    @abstractmethod
    def _download_fileobj_to_stream(self, key: str, stream: BinaryIO, /) -> None:
        pass

    @validate_file_status
    @validate_bucket_status
    def download_fileobj(self, key: str, /) -> bytes:
        buf = BytesIO()
        self._download_fileobj_to_stream(key, buf)
        return buf.getvalue()

    @validate_file_status
    @validate_bucket_status
    def download_file(self, key: str, path: Path, /) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(path, "wb") as f:
                self._download_fileobj_to_stream(key, f)
        except Exception:
            path.unlink()
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
    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int) -> bytes:
        pass

    def bulk_download_to_memory(
        self, files: list[str], *, object_downloader: Callable[[str], NamedOpenable]
    ) -> Iterator[NamedOpenable]:
        threads_number = get_max_threads_number(len(files))

        # We're using a custom queue to limit the maximum number of downloaded unprocessed
        # files stored in the memory.
        # For example, the builtin executor.map() could also be used here, but it
        # would enqueue all the file list in one go, and the downloaded files
        # would all be stored in memory until processed.
        queue: Queue[Future[NamedOpenable]] = Queue(maxsize=threads_number)
        input_iter = iter(files)
        with ThreadPoolExecutor(max_workers=threads_number) as executor:
            while not queue.empty() or input_iter is not None:
                while not queue.full() and input_iter is not None:
                    next_job_params = next(input_iter, None)
                    if next_job_params is None:
                        input_iter = None
                        break

                    next_job = executor.submit(object_downloader, next_job_params)
                    queue.put(next_job)

                top_job = queue.get()
                yield top_job.result()

    def _in_parallel(self, fn: Callable[[T], object], args: Sequence[T]) -> None:
        threads_number = get_max_threads_number(len(args))

        with ThreadPoolExecutor(max_workers=threads_number) as executor:
            list(executor.map(fn, args))

    def bulk_download_to_dir(
        self,
        files: Sequence[PurePath | tuple[str, PurePath]],
        upload_dir: Path,
    ) -> None:
        """
        :param files: a list of filenames or (storage filename, output filename) pairs
        :param upload_dir: the output directory
        """

        def download_one(f: PurePath | tuple[str, PurePath]) -> None:
            if isinstance(f, tuple):
                key, output_path = f
            else:
                key = f.as_posix()
                output_path = f

            self.download_file(key, upload_dir / output_path)

        self._in_parallel(download_one, files)

    def bulk_upload_from_dir(
        self,
        files: Sequence[PurePath],
        upload_dir: Path,
    ):
        def upload_one(f: PurePath):
            self.upload_file(upload_dir / f, f.as_posix())

        self._in_parallel(upload_one, files)

    @abstractmethod
    def upload_fileobj(self, file_obj: BinaryIO, key: str, /) -> None:
        pass

    @abstractmethod
    def upload_file(self, file_path: Path, key: str | None = None, /) -> None:
        pass

    @abstractmethod
    def bulk_delete(self, files: Sequence[str]) -> None:
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
    ) -> list[dict]:
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


class HeaderFirstDownloader(ABC):
    def __init__(self, *, client: AbstractCloudStorage):
        self.client = client

    @abstractmethod
    def try_parse_header(self, key: str, header: bytes) -> Any | None: ...

    def log_header_miss(
        self, key: str, header_size: int, *, full_contents: bytes | None = None
    ) -> None:
        message = (
            f'The first {header_size} bytes were not enough to parse the "{key}" object header. '
        )

        if full_contents is not None:
            full_object_size = len(full_contents)

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

    def download(self, key: str) -> NamedOpenable:
        """
        Method downloads the file using the following approach:
        First we try to download the file header (first N bytes).
        It should be enough to determine image properties.
        If it's not enough for the file, the whole file will be downloaded.

        :param key: File on the bucket

        Returns:
            buffer with the image
        """

        buff = BytesIO()

        headers_to_try = self.get_header_sizes_to_try()
        for i, header_size in enumerate(headers_to_try):
            cur_pos = buff.tell()
            chunk = self.client.download_range_of_bytes(
                key, start_byte=cur_pos, stop_byte=header_size - 1
            )
            buff.write(chunk)

            partial_contents = buff.getvalue()
            if len(partial_contents) < header_size:
                # This means that the entire file is smaller than the current header_size.
                # It doesn't matter whether the header can be parsed,
                # since there's no more data to download anyway.
                return MemNamedOpenable(partial_contents, key)

            if self.try_parse_header(key, partial_contents):
                return MemNamedOpenable(partial_contents, key)

            if i + 1 < len(headers_to_try):
                self.log_header_miss(key=key, header_size=header_size)

            # If the full size is exactly equal to header_size,
            # the next download_range_of_bytes call will have start_byte equal to the file size,
            # and the request will fail (since an HTTP range can't be empty).
            # To prevent this, force the range to be non-empty by redownloading the last byte.
            buff.seek(-1, os.SEEK_CUR)

        full_contents = self.client.download_fileobj(key)
        self.log_header_miss(key=key, header_size=header_size, full_contents=full_contents)
        return MemNamedOpenable(full_contents, key)


class _HeaderFirstImageDownloader(HeaderFirstDownloader):
    def try_parse_header(self, key: str, header: bytes):
        image_parser = ImageFile.Parser()
        image_parser.feed(header)
        return image_parser.image

    def log_header_miss(self, key, header_size, *, full_contents: bytes | None = None) -> None:
        message = (
            f'The first {header_size} bytes were not enough to parse the "{key}" object header. '
        )

        if full_contents is not None:
            full_object_size = len(full_contents)

            message += (
                f"Object size was {full_object_size} bytes. "
                f"Image resolution was {Image.open(BytesIO(full_contents)).size}. "
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
    def try_parse_header(self, key: str, header: bytes):
        pcd_parser = PcdReader()
        file = MemOpenable(header)
        file_ext = os.path.splitext(key)[1].lower()

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
    specific_attributes: dict[str, Any],
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


def _botocore_load_file_plaindict(self, full_path, open_method):
    # Drop-in replacement for botocore.loaders.JSONFileLoader._load_file that
    # parses with stdlib json into plain dicts instead of OrderedDicts.
    #
    # botocore's loader caches large service-model JSON (service-2.json,
    # resources-1.json, endpoint-rule-sets) and historically built them as
    # OrderedDicts via `object_pairs_hook=OrderedDict`. On Python 3.7+ regular
    # dicts already preserve insertion order, and OrderedDict carries a
    # doubly-linked list per item — measured RSS overhead is ~3x compared to
    # plain dicts for these models (e.g. 1 S3CloudStorage: 29 MB -> 11 MB).
    # No code in botocore relies on OrderedDict-specific methods on loaded
    # service-model data (verified by grep for move_to_end / popitem(last=...)).
    if not os.path.isfile(full_path):
        return
    with open_method(full_path, "rb") as fp:
        payload = fp.read().decode("utf-8")
    return json.loads(payload)


botocore.loaders.JSONFileLoader._load_file = _botocore_load_file_plaindict


# Shared across all S3 sessions in this process. botocore caches the parsed
# service-2.json / resources-1.json / endpoint-rule-set JSON on the Loader, so
# a single Loader instance lets every session reuse them — drops ~7MB per
# cached S3CloudStorage and removes ~80ms of JSON parsing per build. Loader is
# injected into each Session via the "data_loader" component override, see:
#   https://botocore.amazonaws.com/v1/documentation/api/latest/reference/loaders.html
_SHARED_BOTOCORE_LOADER = botocore.loaders.create_loader()


class _FrozenEventEmitter:
    """Wraps a HierarchicalEmitter and forbids registration/unregistration.

    Cached S3 sessions hand their `events` to every client built from them. If
    arbitrary code later calls `session.events.register(...)` it would mutate
    shared state behind the back of any caller already holding a reference, and
    affect every future client built on the same session. Freezing the emitter
    after construction makes such mutations fail loudly instead of silently
    introducing cross-instance coupling.
    """

    __slots__ = ("_wrapped",)

    def __init__(self, wrapped: botocore.hooks.HierarchicalEmitter):
        object.__setattr__(self, "_wrapped", wrapped)

    def __getattr__(self, name):
        return getattr(self._wrapped, name)

    def emit(self, *args, **kwargs):
        return self._wrapped.emit(*args, **kwargs)

    def emit_until_response(self, *args, **kwargs):
        return self._wrapped.emit_until_response(*args, **kwargs)

    def copy(self):
        # Per-client event emitters are copies of the session-level one and
        # remain mutable: clients legitimately register handlers after build
        # (e.g. retry/signing). Only the shared session-level emitter is frozen.
        return self._wrapped.copy()

    def register(self, *args, **kwargs):
        raise RuntimeError(
            "Refusing to register an event handler on a cached S3 session emitter: "
            "session-level events are shared across every client built from this "
            "session. Register on a specific client's `meta.events` instead."
        )

    register_first = register
    register_last = register
    unregister = register


# Serializes the first calls to session.resource("s3") / session.client("s3"):
# they reach into the process-shared botocore Loader to read+cache
# s3/service-2.json, s3/resources-1.json, and the endpoint rule set. The
# Loader does a read-modify-write on its internal cache dict on first miss;
# concurrent first-builds would race on it. After the loader is primed,
# subsequent builds are dict reads and the lock is not contended.
# A unit test (test_lock_protects_shared_loader_load_service_model) confirms
# the loader is actually exercised by these calls — if a future boto3 change
# bypassed the shared Loader, the lock would be guarding nothing.
_S3_BUILD_LOCK = threading.Lock()


def _make_boto3_session(
    *,
    access_key_id: str | None,
    secret_key: str | None,
    session_token: str | None,
    region: str | None,
) -> boto3.Session:
    """Build a Session using the process-shared botocore Loader.

    CloudStorage credentials must come from the DB row: signed CS rows pass
    them via the `boto3.Session(...)` kwargs (boto3 stores them via
    `botocore_session.set_credentials(...)` so subsequent `get_credentials()`
    returns them directly, bypassing the resolver chain); anonymous CS rows
    must use `Config(signature_version=UNSIGNED)` on the resulting clients
    so botocore short-circuits credential resolution entirely (see
    `botocore.session.create_client`).
    """
    kwargs = {}
    for key, arg_v in (
        ("aws_access_key_id", access_key_id),
        ("aws_secret_access_key", secret_key),
        ("aws_session_token", session_token),
        ("region_name", region),
    ):
        if arg_v:
            kwargs[key] = arg_v

    session = boto3.Session(**kwargs)

    # Inject the process-shared loader so every Session reuses the parsed
    # service-2.json/resources-1.json/endpoint-ruleset instead of re-parsing.
    session._session.register_component("data_loader", _SHARED_BOTOCORE_LOADER)

    return session


class S3CloudStorage(AbstractCloudStorage):
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

        is_anonymous = not any([access_key_id, secret_key, session_token])

        session = _make_boto3_session(
            access_key_id=access_key_id,
            secret_key=secret_key,
            session_token=session_token,
            region=region,
        )

        resource_config_kwargs = dict(
            proxies=PROXIES_FOR_UNTRUSTED_URLS or {},
            max_pool_connections=(
                # AWS can throttle the requests if there are too many of them,
                # the SDK handles it with the retry policy:
                # https://boto3.amazonaws.com/v1/documentation/api/latest/guide/retries.html
                # 10 is the default value
                max(10, CPU_NUMBER * settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER_PER_CPU)
            ),
            # Enable SO_KEEPALIVE so the OS detects dead peer connections
            # while the client is parked in the LRU cache between requests.
            # Complements the TTL on the cache; together they bound how stale
            # a kept-alive socket can get.
            tcp_keepalive=True,
        )
        status_config_kwargs = dict(
            proxies=PROXIES_FOR_UNTRUSTED_URLS or {},
            connect_timeout=2,
            read_timeout=5,
            tcp_keepalive=True,
            retries={"total_max_attempts": 1, "mode": "standard"},
        )
        if is_anonymous:
            # UNSIGNED also skips the credential resolver entirely, so there
            # is no need to register `choose-signer` handlers on the client.
            resource_config_kwargs["signature_version"] = UNSIGNED
            status_config_kwargs["signature_version"] = UNSIGNED

        # Lock only the calls that touch the process-shared botocore Loader
        # cache (read-modify-write of service-model/resource/endpoint JSON on
        # first miss) and that exercise the documented non-thread-safe
        # construction paths in boto3 (see _S3_BUILD_LOCK definition above).
        # Everything else — Session, Config, post-build attribute assignment —
        # is per-instance and safe to run concurrently.
        with _S3_BUILD_LOCK:
            # boto3 low-level Clients are documented as thread-safe to use once
            # built; boto3 resources (e.g. session.resource("s3"), Bucket) are
            # NOT, because methods can mutate `meta.data` via lazy load() and
            # sub-resource construction shares identifier state. Cache only the
            # client objects and pass the bucket name explicitly.
            # Status checks are part of the control plane, not the data-transfer path, so
            # Bucket status probes should fail fast when the endpoint is unreachable or
            # misconfigured. Keep a dedicated low-timeout client for head_bucket, while
            # the regular client retains standard retry behavior for normal
            # storage operations.
            self._client = session.client(
                "s3",
                endpoint_url=endpoint_url,
                config=Config(**resource_config_kwargs),
            )
            self._status_client = session.client(
                "s3",
                endpoint_url=endpoint_url,
                config=Config(**status_config_kwargs),
            )

            # Freeze the session-level emitter after both clients have copied
            # it into their own per-client emitters. Any further attempt to
            # register/unregister at the session level will raise; per-client
            # emitters (`client.meta.events`) remain mutable.
            session._session.register_component(
                "event_emitter",
                _FrozenEventEmitter(session._session.get_component("event_emitter")),
            )

        self._bucket_name: str = bucket
        self.region = region

    @property
    def name(self):
        return self._bucket_name

    def _head(self):
        # Bucket status checks use the dedicated fast-fail client.
        return self._status_client.head_bucket(Bucket=self.name)

    def _head_file(self, key: str, /):
        # File metadata reads stay on the regular client so they retain standard retry
        # behavior on slower S3-compatible backends.
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
        # Handle transport-level reachability failures separately from ClientError-
        # based 403/404 responses.
        except (ConnectTimeoutError, EndpointConnectionError, ReadTimeoutError):
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
        # Handle transport-level reachability failures separately from ClientError-
        # based 403/404 responses.
        except (ConnectTimeoutError, EndpointConnectionError, ReadTimeoutError):
            slogger.glob.warning(
                f"CloudStorage S3 {self._client.meta.endpoint_url}, {self.name}/{key} not available",
                exc_info=True,
            )
            return Status.NOT_FOUND

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key: str, /):
        return self._head_file(key).get("LastModified")

    @validate_bucket_status
    def upload_fileobj(self, file_obj: BinaryIO, key: str, /):
        self._client.upload_fileobj(
            Fileobj=file_obj,
            Bucket=self._bucket_name,
            Key=key,
            Config=TransferConfig(max_io_queue=self.transfer_config["max_io_queue"]),
        )

    @validate_bucket_status
    def upload_file(self, file_path: Path, key: str | None = None, /):
        try:
            self._client.upload_file(
                Filename=os.fspath(file_path),
                Bucket=self._bucket_name,
                Key=key or file_path.name,
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
        self._client.download_fileobj(
            Bucket=self._bucket_name,
            Key=key,
            Fileobj=stream,
            Config=TransferConfig(max_io_queue=self.transfer_config["max_io_queue"]),
        )

    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int) -> bytes:
        try:
            return self._client.get_object(
                Bucket=self._bucket_name, Key=key, Range=f"bytes={start_byte}-{stop_byte}"
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

    def bulk_delete(self, files: Sequence[str]) -> None:
        def delete_batch(batch: Sequence[str]):
            delete_request = {"Objects": [{"Key": f} for f in batch], "Quiet": True}
            self._client.delete_objects(Bucket=self.name, Delete=delete_request)

        self._in_parallel(delete_batch, list(take_by(files, 1000)))

    @property
    def supported_actions(self):
        allowed_actions = set()
        try:
            bucket_policy = self._client.get_bucket_policy(Bucket=self._bucket_name)["Policy"]
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


class AzureBlobCloudStorage(AbstractCloudStorage):
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

    def upload_file(self, file_path: Path, key: str | None = None, /):
        with open(file_path, "rb") as f:
            self.upload_fileobj(f, key or file_path.name)

    def bulk_delete(self, files: Sequence[str]) -> None:
        def delete_batch(batch: Sequence[str]) -> None:
            self._client.delete_blobs(*batch)

        self._in_parallel(delete_batch, list(take_by(files, 256)))

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


class GcsCloudStorage(AbstractCloudStorage):

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
    def upload_file(self, file_path: Path, key: str | None = None, /):
        self.bucket.blob(key or file_path.name).upload_from_filename(os.fspath(file_path))

    def bulk_delete(self, files: Sequence[str]) -> None:
        def delete_batch(batch: Sequence[str]):
            with self._client.batch():
                for key in batch:
                    self.bucket.delete_blob(key)

        self._in_parallel(delete_batch, list(take_by(files, 100)))

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key: str, /):
        blob = self.bucket.blob(key)
        blob.reload()
        return blob.updated

    @property
    def supported_actions(self):
        pass


class SubdirectoryCloudStorage(AbstractCloudStorage):
    def __init__(self, underlying: AbstractCloudStorage, subdirectory: str) -> None:
        super().__init__()

        self.underlying = underlying
        self.subdirectory = subdirectory
        if not self.subdirectory.endswith("/"):
            self.subdirectory += "/"

    def _map_key(self, key: str) -> str:
        return self.subdirectory + key

    def _unmap_key(self, key: str) -> str:
        assert key.startswith(self.subdirectory)
        return key[len(self.subdirectory) :]

    @property
    def name(self) -> str:
        return self.underlying.name + "/" + self.subdirectory

    def get_status(self) -> Status:
        return self.underlying.get_status()

    def get_file_status(self, key: str, /) -> Status:
        return self.underlying.get_file_status(self._map_key(key))

    def get_file_last_modified(self, key: str, /) -> datetime:
        return self.underlying.get_file_last_modified(self._map_key(key))

    def _download_fileobj_to_stream(self, key: str, stream: BinaryIO, /) -> None:
        return self.underlying._download_fileobj_to_stream(self._map_key(key), stream)

    def _download_range_of_bytes(self, key: str, /, *, stop_byte: int, start_byte: int) -> bytes:
        return self.underlying._download_range_of_bytes(
            self._map_key(key), start_byte=start_byte, stop_byte=stop_byte
        )

    def upload_fileobj(self, file_obj: BinaryIO, key: str, /) -> None:
        return self.underlying.upload_fileobj(file_obj, self._map_key(key))

    def upload_file(self, file_path: Path, key: str | None = None, /) -> None:
        assert key is not None
        return self.underlying.upload_file(file_path, self._map_key(key))

    def bulk_delete(self, files: Sequence[str]) -> None:
        self.underlying.bulk_delete(list(map(self._map_key, files)))

    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        *,
        next_token: str | None = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> dict:
        result = self.underlying._list_raw_content_on_one_page(
            self._map_key(prefix), next_token=next_token, page_size=page_size
        )

        for key in ("files", "directories"):
            result[key] = list(map(self._unmap_key, result[key]))

        return result

    def supported_actions(self):
        return self.underlying.supported_actions


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


def _build_storage_instance(
    cloud_provider: str,
    resource: str,
    credentials_type: str,
    credentials_value: str,
    specific_attributes_str: str,
) -> AbstractCloudStorage:
    credentials = Credentials()
    credentials.convert_from_db({"type": credentials_type, "value": credentials_value})
    return get_cloud_storage_instance(
        cloud_provider=cloud_provider,
        resource=resource,
        credentials=credentials,
        specific_attributes=parse_specific_attributes(specific_attributes_str),
    )


@functools.cache
def _build_storage_instance_cached():
    # Wrapped lazily so the size/ttl settings are read after Django app config
    # has applied engine defaults (apps.py:EngineConfig.ready), not at module
    # import time. TTL bounds how long an idle client (and its kept-alive HTTP
    # connection pool) can stay parked; on expiry the entry is evicted, the
    # boto3 Session is GC'd, and its socket pool closes. STS session-token
    # rotations and DNS staleness are bounded by the same window.
    return cachetools.cached(
        cache=cachetools.TTLCache(
            maxsize=settings.CLOUD_STORAGE_INSTANCE_CACHE_SIZE,
            ttl=settings.CLOUD_STORAGE_INSTANCE_CACHE_TTL,
        ),
        lock=threading.Lock(),
    )(_build_storage_instance)


def db_storage_to_storage_instance(db_storage: CloudStorage) -> AbstractCloudStorage:
    # The kwargs passed here IS the cache key for the cached build. Pass every
    # CloudStorage field that affects session construction; if none of them
    # change, reusing the cached client is correct (cs clients are expensive
    # to build, ~25-150 ms each). Two guard tests anchor this:
    # `test_cloud_storage_field_set_is_stable` (catches new model fields) and
    # `test_build_storage_instance_signature_is_stable` (catches new kwargs);
    # both fail loudly so a reviewer classifies the change.
    #
    # Only S3 is cached: S3CloudStorage only retains boto3 low-level Clients,
    # which boto3 documents as thread-safe to share. Azure (`BlobServiceClient`)
    # and GCS (`storage.Client` + `storage.Bucket`) keep mutable per-request
    # state that boto3-style proof of thread-safety doesn't extend to, so they
    # are rebuilt per call until verified.
    build = (
        _build_storage_instance_cached()
        if db_storage.provider_type == CloudProviderChoice.AMAZON_S3
        else _build_storage_instance
    )
    return build(
        cloud_provider=db_storage.provider_type,
        resource=db_storage.resource,
        credentials_type=db_storage.credentials_type,
        credentials_value=db_storage.credentials,
        specific_attributes_str=db_storage.specific_attributes,
    )


P = ParamSpec("P")
T = TypeVar("T")


def import_resource_from_cloud_storage(
    filename: str,
    db_storage: CloudStorage,
    key: str,
    import_func: Callable[Concatenate[str, P], T],
    *args: P.args,
    **kwargs: P.kwargs,
) -> T:
    storage = db_storage_to_storage_instance(db_storage)
    storage.download_file(key, Path(filename))

    return import_func(filename, *args, **kwargs)


def export_resource_to_cloud_storage(
    db_storage: CloudStorage,
    func: Callable[P, str],
    *args: P.args,
    **kwargs: P.kwargs,
) -> str:
    rq_job = get_current_job()
    assert rq_job, "func can be executed only from a background job"

    file_path = func(*args, **kwargs)
    rq_job_meta = ExportRQMeta.for_job(rq_job)

    storage = db_storage_to_storage_instance(db_storage)
    storage.upload_file(Path(file_path), rq_job_meta.result_filename)

    return file_path
