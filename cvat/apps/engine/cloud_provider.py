# Copyright (C) 2021-2023 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import functools
import json
import os
import math
from abc import ABC, abstractmethod, abstractproperty
from enum import Enum
from io import BytesIO
from typing import Dict, List, Optional, Any, Callable, TypeVar, Iterator
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_EXCEPTION

import boto3
from azure.core.exceptions import HttpResponseError, ResourceExistsError
from azure.storage.blob import BlobServiceClient, ContainerClient, PublicAccess
from azure.storage.blob._list_blobs_helper import BlobPrefix
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from botocore.handlers import disable_signing
from datumaro.util import take_by # can be changed to itertools.batched after migration to python3.12
from django.conf import settings
from google.cloud import storage
from google.cloud.exceptions import Forbidden as GoogleCloudForbidden
from google.cloud.exceptions import NotFound as GoogleCloudNotFound
from PIL import Image, ImageFile
from rest_framework.exceptions import (NotFound, PermissionDenied,
                                       ValidationError)

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import CloudProviderChoice, CredentialsTypeChoice
from cvat.apps.engine.utils import get_cpu_number

class NamedBytesIO(BytesIO):
    @property
    def filename(self) -> Optional[str]:
        return getattr(self, '_filename', None)

    @filename.setter
    def filename(self, value: str) -> None:
        self._filename = value

slogger = ServerLogManager(__name__)

ImageFile.LOAD_TRUNCATED_IMAGES = True

CPU_NUMBER = get_cpu_number()

def normalize_threads_number(
    threads_number: Optional[int], number_of_files: int
) -> int:
    threads_number = (
        min(
            CPU_NUMBER,
            settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER,
            max(
                math.ceil(number_of_files / settings.CLOUD_DATA_DOWNLOADING_NUMBER_OF_FILES_PER_THREAD), 1
            ),
        )
        if threads_number is None
        else min(
            threads_number,
            CPU_NUMBER,
            settings.CLOUD_DATA_DOWNLOADING_MAX_THREADS_NUMBER,
        )
    )
    threads_number = max(threads_number, 1)

    return threads_number

class Status(str, Enum):
    AVAILABLE = 'AVAILABLE'
    NOT_FOUND = 'NOT_FOUND'
    FORBIDDEN = 'FORBIDDEN'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class Permissions(str, Enum):
    READ = 'read'
    WRITE = 'write'

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
                raise PermissionDenied('The resource {} is no longer available. Access forbidden.'.format(self.name))
            elif storage_status == Status.NOT_FOUND:
                raise NotFound('The resource {} not found. It may have been deleted.'.format(self.name))
            elif storage_status == Status.AVAILABLE:
                raise
            raise ValidationError(str(ex))
        return res
    return wrapper

def validate_file_status(func):
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        try:
            res = func(self, *args, **kwargs)
        except Exception as ex:
            storage_status = self.get_status() if self is not None else None
            if storage_status == Status.AVAILABLE:
                key = args[0]
                file_status = self.get_file_status(key)
                if file_status == Status.NOT_FOUND:
                    raise NotFound("The file '{}' not found on the cloud storage '{}'".format(key, self.name))
                elif file_status == Status.FORBIDDEN:
                    raise PermissionDenied("Access to the file '{}' on the '{}' cloud storage is denied".format(key, self.name))
                raise ValidationError(str(ex))
            else:
                raise
        return res
    return wrapper

class _CloudStorage(ABC):

    def __init__(self, prefix: Optional[str] = None):
        self.prefix = prefix

    @abstractproperty
    def name(self):
        pass

    @abstractmethod
    def create(self):
        pass

    @abstractmethod
    def _head_file(self, key):
        pass

    @abstractmethod
    def _head(self):
        pass

    @abstractmethod
    def get_status(self):
        pass

    @abstractmethod
    def get_file_status(self, key):
        pass

    @abstractmethod
    def get_file_last_modified(self, key):
        pass

    @abstractmethod
    def download_fileobj(self, key: str) -> NamedBytesIO:
        pass

    def download_file(self, key, path):
        file_obj = self.download_fileobj(key)
        if isinstance(file_obj, BytesIO):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as f:
                f.write(file_obj.getvalue())
        else:
            raise NotImplementedError("Unsupported type {} was found".format(type(file_obj)))

    def download_range_of_bytes(self, key: str, stop_byte: int, start_byte: int = 0) -> bytes:
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
            raise ValidationError(f'Incorrect bytes range was received: {start_byte}-{stop_byte}')
        return self._download_range_of_bytes(key, stop_byte, start_byte)

    @abstractmethod
    def _download_range_of_bytes(self, key: str, stop_byte: int, start_byte: int):
        pass

    def optimally_image_download(self, key: str, chunk_size: int = 65536) -> NamedBytesIO:
        """
        Method downloads image by the following approach:
        Firstly we try to download the first N bytes of image which will be enough for determining image properties.
        If for some reason we cannot identify the required properties then we will download all file.

        Args:
            key (str): File on the bucket
            chunk_size (int, optional): The number of first bytes to download. Defaults to 65536 (64kB).

        Returns:
            BytesIO: Buffer with image
        """
        image_parser = ImageFile.Parser()

        chunk = self.download_range_of_bytes(key, chunk_size - 1)
        image_parser.feed(chunk)

        if image_parser.image:
            buff = NamedBytesIO(chunk)
            buff.filename = key
        else:
            buff = self.download_fileobj(key)
            image_size_in_bytes = len(buff.getvalue())
            slogger.glob.warning(
                f'The {chunk_size} bytes were not enough to parse "{key}" image. '
                f'Image size was {image_size_in_bytes} bytes. Image resolution was {Image.open(buff).size}. '
                f'Downloaded percent was {round(min(chunk_size, image_size_in_bytes) / image_size_in_bytes * 100)}')

        return buff

    def bulk_download_to_memory(
        self,
        files: List[str],
        *,
        threads_number: Optional[int] = None,
        _use_optimal_downloading: bool = True,
    ) -> Iterator[BytesIO]:
        func = self.optimally_image_download if _use_optimal_downloading else self.download_fileobj
        threads_number = normalize_threads_number(threads_number, len(files))

        with ThreadPoolExecutor(max_workers=threads_number) as executor:
            for batch_links in take_by(files, count=threads_number):
                yield from executor.map(func, batch_links)

    def bulk_download_to_dir(
        self,
        files: List[str],
        upload_dir: str,
        *,
        threads_number: Optional[int] = None,
    ) -> None:
        threads_number = normalize_threads_number(threads_number, len(files))

        with ThreadPoolExecutor(max_workers=threads_number) as executor:
            futures = [executor.submit(self.download_file, f, os.path.join(upload_dir, f)) for f in files]
            done, _ = wait(futures, return_when=FIRST_EXCEPTION)
            for future in done:
                if ex := future.exception():
                    raise ex

    @abstractmethod
    def upload_fileobj(self, file_obj, file_name):
        pass

    @abstractmethod
    def upload_file(self, file_path, file_name=None):
        pass

    @abstractmethod
    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        next_token: Optional[str] = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> Dict:
        pass

    def list_files_on_one_page(
        self,
        prefix: str = "",
        next_token: Optional[str] = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
        _use_flat_listing: bool = False,
        _use_sort: bool = False,
    ) -> Dict:

        if self.prefix and prefix and not (self.prefix.startswith(prefix) or prefix.startswith(self.prefix)):
            return {
                'content': [],
                'next': None,
            }

        search_prefix = prefix
        if self.prefix and (len(prefix) < len(self.prefix)):
            if prefix and '/' in self.prefix[len(prefix):]:
                next_layer_and_tail = self.prefix[prefix.find('/') + 1:].split(
                    "/", maxsplit=1
                )
                if 2 == len(next_layer_and_tail):
                    directory = (
                        next_layer_and_tail[0]
                        if not _use_flat_listing
                        else self.prefix[: prefix.find('/') + 1] + next_layer_and_tail[0] + "/"
                    )
                    return {
                        "content": [{"name": directory, "type": "DIR"}],
                        "next": None,
                    }
                else:
                    search_prefix = self.prefix
            else:
                search_prefix = self.prefix

        result = self._list_raw_content_on_one_page(search_prefix, next_token, page_size)

        if not _use_flat_listing:
            result['directories'] = [d.strip('/') for d in result['directories']]
        content = [{'name': f, 'type': 'REG'} for f in result['files']]
        content.extend([{'name': d, 'type': 'DIR'} for d in result['directories']])

        if not _use_flat_listing and search_prefix and '/' in search_prefix:
            last_slash = search_prefix.rindex('/')
            for f in content:
                f['name'] = f['name'][last_slash + 1:]

        if _use_sort:
            content = sorted(content, key=lambda x: x['type'])

        return {
            'content': content,
            'next': result['next'],
        }

    def list_files(
        self,
        prefix: str = "",
        _use_flat_listing: bool = False,
    ) -> List[str]:
        all_files = []
        next_token = None
        while True:
            batch = self.list_files_on_one_page(prefix, next_token, _use_flat_listing=_use_flat_listing)
            all_files.extend(batch['content'])
            next_token = batch['next']
            if not next_token:
                break

        return all_files

    @abstractproperty
    def supported_actions(self):
        pass

    @property
    def read_access(self):
        return Permissions.READ in self.access

    @property
    def write_access(self):
        return Permissions.WRITE in self.access

def get_cloud_storage_instance(
    cloud_provider: CloudProviderChoice,
    resource: str,
    credentials: str,
    specific_attributes: Optional[Dict[str, Any]] = None,
):
    instance = None
    if cloud_provider == CloudProviderChoice.AWS_S3:
        instance = AWS_S3(
            bucket=resource,
            access_key_id=credentials.key,
            secret_key=credentials.secret_key,
            session_token=credentials.session_token,
            region=specific_attributes.get('region'),
            endpoint_url=specific_attributes.get('endpoint_url'),
            prefix=specific_attributes.get('prefix'),
        )
    elif cloud_provider == CloudProviderChoice.AZURE_CONTAINER:
        instance = AzureBlobContainer(
            container=resource,
            account_name=credentials.account_name,
            sas_token=credentials.session_token,
            connection_string=credentials.connection_string,
            prefix=specific_attributes.get('prefix'),
        )
    elif cloud_provider == CloudProviderChoice.GOOGLE_CLOUD_STORAGE:
        instance = GoogleCloudStorage(
            bucket_name=resource,
            service_account_json=credentials.key_file_path,
            anonymous_access = credentials.credentials_type == CredentialsTypeChoice.ANONYMOUS_ACCESS,
            prefix=specific_attributes.get('prefix'),
            location=specific_attributes.get('location'),
            project=specific_attributes.get('project')
        )
    else:
        raise NotImplementedError(f"The {cloud_provider} provider is not supported")
    return instance

class AWS_S3(_CloudStorage):
    transfer_config = {
        'max_io_queue': 10,
    }

    class Effect(str, Enum):
        ALLOW = 'Allow'
        DENY = 'Deny'


    def __init__(self,
                bucket: str,
                region: Optional[str] = None,
                access_key_id: Optional[str] = None,
                secret_key: Optional[str] = None,
                session_token: Optional[str] = None,
                endpoint_url: Optional[str] = None,
                prefix: Optional[str] = None,
    ):
        super().__init__(prefix=prefix)
        if (
            sum(
                1
                for credential in (access_key_id, secret_key, session_token)
                if credential
            )
            == 1
        ):
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
        self._s3 = session.resource("s3", endpoint_url=endpoint_url)

        # anonymous access
        if not any([access_key_id, secret_key, session_token]):
            self._s3.meta.client.meta.events.register(
                "choose-signer.s3.*", disable_signing
            )

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

    def _head_file(self, key):
        return self._client.head_object(Bucket=self.name, Key=key)

    def get_status(self):
        # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html#S3.Client.head_object
        # return only 3 codes: 200, 403, 404
        try:
            self._head()
            return Status.AVAILABLE
        except ClientError as ex:
            code = ex.response['Error']['Code']
            if code == '403':
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND

    def get_file_status(self, key):
        try:
            self._head_file(key)
            return Status.AVAILABLE
        except ClientError as ex:
            code = ex.response['Error']['Code']
            if code == '403':
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key):
        return self._head_file(key).get('LastModified')

    @validate_bucket_status
    def upload_fileobj(self, file_obj, file_name):
        self._bucket.upload_fileobj(
            Fileobj=file_obj,
            Key=file_name,
            Config=TransferConfig(max_io_queue=self.transfer_config['max_io_queue'])
        )

    @validate_bucket_status
    def upload_file(self, file_path, file_name=None):
        if not file_name:
            file_name = os.path.basename(file_path)
        try:
            self._bucket.upload_file(
                file_path,
                file_name,
                Config=TransferConfig(max_io_queue=self.transfer_config['max_io_queue'])
            )
        except ClientError as ex:
            msg = str(ex)
            slogger.glob.error(msg)
            raise Exception(msg)


    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        next_token: Optional[str] = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> Dict:
        # The structure of response looks like this:
        # {
        #    'CommonPrefixes': [{'Prefix': 'sub/'}],
        #    'Contents': [{'ETag': '', 'Key': 'test.jpg', ..., 'Size': 1024}],
        #    ...
        #    'NextContinuationToken': 'str'
        # }
        response = self._client.list_objects_v2(
            Bucket=self.name, MaxKeys=page_size, Delimiter='/',
            **({'Prefix': prefix} if prefix else {}),
            **({'ContinuationToken': next_token} if next_token else {}),
        )
        files = [f['Key'] for f in response.get('Contents', []) if not f['Key'].endswith('/')]
        directories = [p['Prefix'] for p in response.get('CommonPrefixes', [])]

        return {
            'files': files,
            'directories': directories,
            'next': response.get('NextContinuationToken', None),
        }

    @validate_file_status
    @validate_bucket_status
    def download_fileobj(self, key: str) -> NamedBytesIO:
        buf = NamedBytesIO()
        self.bucket.download_fileobj(
            Key=key,
            Fileobj=buf,
            Config=TransferConfig(max_io_queue=self.transfer_config['max_io_queue'])
        )
        buf.seek(0)
        buf.filename = key
        return buf

    @validate_file_status
    @validate_bucket_status
    def _download_range_of_bytes(self, key: str, stop_byte: int, start_byte: int) -> bytes:
        try:
            return self._client.get_object(Bucket=self.bucket.name, Key=key, Range=f'bytes={start_byte}-{stop_byte}')['Body'].read()
        except ClientError as ex:
            if 'InvalidRange' in str(ex):
                if self._head_file(key).get('ContentLength') == 0:
                    slogger.glob.info(f"Attempt to download empty file '{key}' from the '{self.name}' bucket.")
                    raise ValidationError(f'The {key} file is empty.')
                else:
                    slogger.glob.error(f"{str(ex)}. Key: {key}, bucket: {self.name}")
            raise

    def create(self):
        try:
            response = self._bucket.create(
                ACL='private',
                CreateBucketConfiguration={
                    'LocationConstraint': self.region,
                },
                ObjectLockEnabledForBucket=False
            )
            slogger.glob.info(
                'Bucket {} has been created on {} region'.format(
                    self.name,
                    response['Location']
                ))
        except Exception as ex:
            msg = str(ex)
            slogger.glob.info(msg)
            raise Exception(msg)

    def delete_file(self, file_name: str):
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
            if 'NoSuchBucketPolicy' in str(ex):
                return Permissions.all()
            else:
                raise Exception(str(ex))
        bucket_policy = json.loads(bucket_policy) if isinstance(bucket_policy, str) else bucket_policy
        for statement in bucket_policy['Statement']:
            effect = statement.get('Effect') # Allow | Deny
            actions = statement.get('Action', set())
            if effect == self.Effect.ALLOW:
                allowed_actions.update(actions)
        access = {
            's3:GetObject': Permissions.READ,
            's3:PutObject': Permissions.WRITE,
        }
        allowed_actions = Permissions.all() & {access.get(i) for i in allowed_actions}

        return allowed_actions

class AzureBlobContainer(_CloudStorage):
    MAX_CONCURRENCY = 3


    class Effect:
        pass

    def __init__(
        self,
        container: str,
        account_name: Optional[str] = None,
        sas_token: Optional[str] = None,
        connection_string: Optional[str] = None,
        prefix: Optional[str] = None,
    ):
        super().__init__(prefix=prefix)
        self._account_name = account_name
        if connection_string:
            self._blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        elif sas_token:
            self._blob_service_client = BlobServiceClient(account_url=self.account_url, credential=sas_token)
        else:
            self._blob_service_client = BlobServiceClient(account_url=self.account_url)
        self._client = self._blob_service_client.get_container_client(container)

    @property
    def container(self) -> ContainerClient:
        return self._client

    @property
    def name(self) -> str:
        return self._client.container_name

    @property
    def account_url(self) -> Optional[str]:
        if self._account_name:
            return "{}.blob.core.windows.net".format(self._account_name)
        return None

    def create(self):
        try:
            self._client.create_container(
               metadata={
                   'type' : 'created by CVAT',
               },
               public_access=PublicAccess.OFF
            )
        except ResourceExistsError:
            msg = f"{self._client.container_name} already exists"
            slogger.glob.info(msg)
            raise Exception(msg)

    def _head(self):
        return self._client.get_container_properties()

    def _head_file(self, key):
        blob_client = self.container.get_blob_client(key)
        return blob_client.get_blob_properties()

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key):
        return self._head_file(key).last_modified

    def get_status(self):
        try:
            self._head()
            return Status.AVAILABLE
        except HttpResponseError as ex:
            if  ex.status_code == 403:
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND

    def get_file_status(self, key):
        try:
            self._head_file(key)
            return Status.AVAILABLE
        except HttpResponseError as ex:
            if  ex.status_code == 403:
                return Status.FORBIDDEN
            else:
                return Status.NOT_FOUND

    @validate_bucket_status
    def upload_fileobj(self, file_obj, file_name):
        self._client.upload_blob(name=file_name, data=file_obj, overwrite=True)

    def upload_file(self, file_path, file_name=None):
        if not file_name:
            file_name = os.path.basename(file_path)
        with open(file_path, 'rb') as f:
            self.upload_fileobj(f, file_name)

    # TODO:
    # def multipart_upload(self, file_obj):
    #     pass


    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        next_token: Optional[str] = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> Dict:
        page = self._client.walk_blobs(
            maxresults=page_size, results_per_page=page_size, delimiter='/',
            **({'name_starts_with': prefix} if prefix else {})
        ).by_page(continuation_token=next_token)
        all_files = list(next(page))

        files, directories = [], []
        for f in all_files:
            if not isinstance(f, BlobPrefix):
                files.append(f.name)
            else:
                directories.append(f.prefix)

        return {
            'files': files,
            'directories': directories,
            'next': page.continuation_token,
        }

    @validate_file_status
    @validate_bucket_status
    def download_fileobj(self, key: str) -> NamedBytesIO:
        buf = NamedBytesIO()
        storage_stream_downloader = self._client.download_blob(
            blob=key,
            offset=None,
            length=None,
        )
        storage_stream_downloader.download_to_stream(buf, max_concurrency=self.MAX_CONCURRENCY)
        buf.seek(0)
        buf.filename = key
        return buf

    @validate_file_status
    @validate_bucket_status
    def _download_range_of_bytes(self, key: str, stop_byte: int, start_byte: int) -> bytes:
        return self._client.download_blob(blob=key, offset=start_byte, length=stop_byte).readall()

    @property
    def supported_actions(self):
        pass

class GOOGLE_DRIVE(_CloudStorage):
    pass

def _define_gcs_status(func):
    def wrapper(self, key=None):
        try:
            if not key:
                func(self)
            else:
                func(self, key)
            return Status.AVAILABLE
        except GoogleCloudNotFound:
            return Status.NOT_FOUND
        except GoogleCloudForbidden:
            return Status.FORBIDDEN
    return wrapper

class GoogleCloudStorage(_CloudStorage):

    class Effect:
        pass

    def __init__(
        self,
        bucket_name: str,
        prefix: Optional[str] = None,
        service_account_json: Optional[Any] = None,
        anonymous_access: bool = False,
        project: Optional[str] = None,
        location: Optional[str] = None,
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

    def _head_file(self, key):
        blob = self.bucket.blob(key)
        return self._client._get_resource(blob.path)

    @_define_gcs_status
    def get_status(self):
        self._head()

    @_define_gcs_status
    def get_file_status(self, key):
        self._head_file(key)


    def _list_raw_content_on_one_page(
        self,
        prefix: str = "",
        next_token: Optional[str] = None,
        page_size: int = settings.BUCKET_CONTENT_MAX_PAGE_SIZE,
    ) -> Dict:
        iterator = self._client.list_blobs(
            bucket_or_name=self.name, max_results=page_size, page_size=page_size,
            fields='items(name),nextPageToken,prefixes', # https://cloud.google.com/storage/docs/json_api/v1/parameters#fields
            delimiter='/',
            **({'prefix': prefix} if prefix else {}),
            **({'page_token': next_token} if next_token else {}),
        )
        # NOTE: we should firstly iterate and only then we can define common prefixes
        files = [f.name for f in iterator if not f.name.endswith('/')] # skip manually created "directories"
        directories = iterator.prefixes

        return {
            'files': files,
            'directories': directories,
            'next': iterator.next_page_token,
        }

    @validate_file_status
    @validate_bucket_status
    def download_fileobj(self, key: str) -> NamedBytesIO:
        buf = NamedBytesIO()
        blob = self.bucket.blob(key)
        self._client.download_blob_to_file(blob, buf)
        buf.seek(0)
        buf.filename = key
        return buf

    @validate_file_status
    @validate_bucket_status
    def _download_range_of_bytes(self, key: str, stop_byte: int, start_byte: int) -> bytes:
        with BytesIO() as buff:
            blob = self.bucket.blob(key)
            self._client.download_blob_to_file(blob, buff, start_byte, stop_byte)
            buff.seek(0)
            return buff.getvalue()

    @validate_bucket_status
    def upload_fileobj(self, file_obj, file_name):
        self.bucket.blob(file_name).upload_from_file(file_obj)

    @validate_bucket_status
    def upload_file(self, file_path, file_name=None):
        if not file_name:
            file_name = os.path.basename(file_path)
        self.bucket.blob(file_name).upload_from_filename(file_path)

    def create(self):
        try:
            self._bucket = self._client.create_bucket(
                self.bucket,
                location=self._bucket_location
            )
            slogger.glob.info(
                'Bucket {} has been created at {} region for {}'.format(
                    self.name,
                    self.bucket.location,
                    self.bucket.user_project,
                ))
        except Exception as ex:
            msg = str(ex)
            slogger.glob.info(msg)
            raise Exception(msg)

    @validate_file_status
    @validate_bucket_status
    def get_file_last_modified(self, key):
        blob = self.bucket.blob(key)
        blob.reload()
        return blob.updated

    @property
    def supported_actions(self):
        pass

class Credentials:
    __slots__ = ('key', 'secret_key', 'session_token', 'account_name', 'key_file_path', 'credentials_type', 'connection_string')

    def __init__(self, **credentials):
        self.key = credentials.get('key', '')
        self.secret_key = credentials.get('secret_key', '')
        self.session_token = credentials.get('session_token', '')
        self.account_name = credentials.get('account_name', '')
        self.key_file_path = credentials.get('key_file_path', None)
        self.credentials_type = credentials.get('credentials_type', None)
        self.connection_string = credentials.get('connection_string', None)

    def convert_to_db(self):
        converted_credentials = {
            CredentialsTypeChoice.KEY_SECRET_KEY_PAIR : \
                " ".join([self.key, self.secret_key]),
            CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR : " ".join([self.account_name, self.session_token]),
            CredentialsTypeChoice.KEY_FILE_PATH: self.key_file_path,
            CredentialsTypeChoice.ANONYMOUS_ACCESS: "" if not self.account_name else self.account_name,
            CredentialsTypeChoice.CONNECTION_STRING: self.connection_string,
        }
        return converted_credentials[self.credentials_type]

    def convert_from_db(self, credentials):
        self.credentials_type = credentials.get('type')
        if self.credentials_type == CredentialsTypeChoice.KEY_SECRET_KEY_PAIR:
            self.key, self.secret_key = credentials.get('value').split()
        elif self.credentials_type == CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR:
            self.account_name, self.session_token = credentials.get('value').split()
        elif self.credentials_type == CredentialsTypeChoice.ANONYMOUS_ACCESS:
            # account_name will be in [some_value, '']
            self.account_name = credentials.get('value')
        elif self.credentials_type == CredentialsTypeChoice.KEY_FILE_PATH:
            self.key_file_path = credentials.get('value')
        elif self.credentials_type == CredentialsTypeChoice.CONNECTION_STRING:
            self.connection_string = credentials.get('value')
        else:
            raise NotImplementedError('Found {} not supported credentials type'.format(self.credentials_type))

    def reset(self, exclusion):
        for i in set(self.__slots__) - exclusion - {'credentials_type'}:
            self.__setattr__(i, '')

    def mapping_with_new_values(self, credentials):
        self.credentials_type = credentials.get('credentials_type', self.credentials_type)
        if self.credentials_type == CredentialsTypeChoice.ANONYMOUS_ACCESS:
            self.reset(exclusion={'account_name'})
            self.account_name = credentials.get('account_name', self.account_name)
        elif self.credentials_type == CredentialsTypeChoice.KEY_SECRET_KEY_PAIR:
            self.reset(exclusion={'key', 'secret_key'})
            self.key = credentials.get('key', self.key)
            self.secret_key = credentials.get('secret_key', self.secret_key)
        elif self.credentials_type == CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR:
            self.reset(exclusion={'session_token', 'account_name'})
            self.session_token = credentials.get('session_token', self.session_token)
            self.account_name = credentials.get('account_name', self.account_name)
        elif self.credentials_type == CredentialsTypeChoice.KEY_FILE_PATH:
            self.reset(exclusion={'key_file_path'})
            self.key_file_path = credentials.get('key_file_path', self.key_file_path)
        elif self.credentials_type == CredentialsTypeChoice.CONNECTION_STRING:
            self.reset(exclusion={'connection_string'})
            self.connection_string = credentials.get('connection_string', self.connection_string)
        else:
            raise NotImplementedError('Mapping credentials: unsupported credentials type')


    def values(self):
        return [self.key, self.secret_key, self.session_token, self.account_name, self.key_file_path]

def db_storage_to_storage_instance(db_storage):
    credentials = Credentials()
    credentials.convert_from_db({
        'type': db_storage.credentials_type,
        'value': db_storage.credentials,
    })
    details = {
        'resource': db_storage.resource,
        'credentials': credentials,
        'specific_attributes': db_storage.get_specific_attributes()
    }
    return get_cloud_storage_instance(cloud_provider=db_storage.provider_type, **details)

T = TypeVar('T', Callable[[str, int, int], int], Callable[[str, int, str, bool], None])

def import_resource_from_cloud_storage(
    db_storage: Any,
    key: str,
    cleanup_func: Callable[[T, str,], Any],
    import_func: T,
    filename: str,
    *args,
    **kwargs,
) -> Any:
    storage = db_storage_to_storage_instance(db_storage)

    with storage.download_fileobj(key) as data, open(filename, 'wb+') as f:
        f.write(data.getbuffer())

    return cleanup_func(import_func, filename, *args, **kwargs)

def export_resource_to_cloud_storage(
    db_storage: Any,
    key: str,
    key_pattern: str,
    func: Callable[[int, Optional[str], Optional[str]], str],
    *args,
    **kwargs,
) -> str:
    file_path = func(*args, **kwargs)
    storage = db_storage_to_storage_instance(db_storage)
    storage.upload_file(file_path, key if key else key_pattern.format(os.path.splitext(file_path)[1].lower()))

    return file_path
