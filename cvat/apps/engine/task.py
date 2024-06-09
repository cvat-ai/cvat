# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import fnmatch
import os
from typing import Any, Dict, Iterator, List, NamedTuple, Optional, Union, Iterable
from rest_framework.serializers import ValidationError
import rq
import re
import shutil
from urllib import parse as urlparse
from urllib import request as urlrequest
import django_rq
import concurrent.futures
import queue

from django.conf import settings
from django.db import transaction
from datetime import datetime, timezone
from pathlib import Path

from cvat.apps.engine import models
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.media_extractors import (MEDIA_TYPES, ImageListReader, Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter,
    ValidateDimension, ZipChunkWriter, ZipCompressedChunkWriter, get_mime, sort)
from cvat.apps.engine.utils import av_scan_paths,get_rq_job_meta, define_dependent_job, get_rq_lock_by_user, preload_images
from cvat.utils.http import make_requests_session, PROXIES_FOR_UNTRUSTED_URLS
from utils.dataset_manifest import ImageManifestManager, VideoManifestManager, is_manifest
from utils.dataset_manifest.core import VideoManifestValidator, is_dataset_manifest
from utils.dataset_manifest.utils import detect_related_images
from .cloud_provider import db_storage_to_storage_instance

slogger = ServerLogManager(__name__)

############################# Low Level server API

def create(db_task, data, request):
    """Schedule the task"""
    q = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)
    user_id = request.user.id

    with get_rq_lock_by_user(q, user_id):
        q.enqueue_call(
            func=_create_thread,
            args=(db_task.pk, data),
            job_id=f"create:task.id{db_task.pk}",
            meta=get_rq_job_meta(request=request, db_obj=db_task),
            depends_on=define_dependent_job(q, user_id),
            failure_ttl=settings.IMPORT_CACHE_FAILED_TTL.total_seconds(),
        )

############################# Internal implementation for server API

JobFileMapping = List[List[str]]

class SegmentParams(NamedTuple):
    start_frame: int
    stop_frame: int

class SegmentsParams(NamedTuple):
    segments: Iterator[SegmentParams]
    segment_size: int
    overlap: int

def _copy_data_from_share_point(
    server_files: List[str],
    upload_dir: str,
    server_dir: Optional[str] = None,
    server_files_exclude: Optional[List[str]] = None,
):
    job = rq.get_current_job()
    job.meta['status'] = 'Data are being copied from source..'
    job.save_meta()

    filtered_server_files = server_files.copy()

    # filter data from files/directories that should be excluded
    if server_files_exclude:
        for f in server_files:
            path = Path(server_dir or settings.SHARE_ROOT) / f
            if path.is_dir():
                filtered_server_files.remove(f)
                filtered_server_files.extend([str(f / i.relative_to(path)) for i in path.glob('**/*') if i.is_file()])

        filtered_server_files = list(filter(
            lambda x: x not in server_files_exclude and all([f'{i}/' not in server_files_exclude for i in Path(x).parents]),
            filtered_server_files
        ))

    for path in filtered_server_files:
        if server_dir is None:
            source_path = os.path.join(settings.SHARE_ROOT, os.path.normpath(path))
        else:
            source_path = os.path.join(server_dir, os.path.normpath(path))
        target_path = os.path.join(upload_dir, path)
        if os.path.isdir(source_path):
            shutil.copytree(source_path, target_path)
        else:
            target_dir = os.path.dirname(target_path)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            shutil.copyfile(source_path, target_path)

def _get_task_segment_data(
    db_task: models.Task,
    *,
    data_size: Optional[int] = None,
    job_file_mapping: Optional[JobFileMapping] = None,
) -> SegmentsParams:
    if job_file_mapping is not None:
        def _segments():
            # It is assumed here that files are already saved ordered in the task
            # Here we just need to create segments by the job sizes
            start_frame = 0
            for jf in job_file_mapping:
                segment_size = len(jf)
                stop_frame = start_frame + segment_size - 1
                yield SegmentParams(start_frame, stop_frame)

                start_frame = stop_frame + 1

        segments = _segments()
        segment_size = 0
        overlap = 0
    else:
        # The segments have equal parameters
        if data_size is None:
            data_size = db_task.data.size

        segment_size = db_task.segment_size
        if segment_size == 0 or segment_size > data_size:
            segment_size = data_size

        overlap = min(
            db_task.overlap if db_task.overlap is not None
                else 5 if db_task.mode == 'interpolation' else 0,
            segment_size // 2,
        )

        segments = (
            SegmentParams(start_frame, min(start_frame + segment_size - 1, data_size - 1))
            for start_frame in range(0, data_size - overlap, segment_size - overlap)
        )

    return SegmentsParams(segments, segment_size, overlap)

def _save_task_to_db(db_task: models.Task, *, job_file_mapping: Optional[JobFileMapping] = None):
    job = rq.get_current_job()
    job.meta['status'] = 'Task is being saved in database'
    job.save_meta()

    segments, segment_size, overlap = _get_task_segment_data(
        db_task=db_task, job_file_mapping=job_file_mapping
    )
    db_task.segment_size = segment_size
    db_task.overlap = overlap

    for segment_idx, (start_frame, stop_frame) in enumerate(segments):
        slogger.glob.info("New segment for task #{}: idx = {}, start_frame = {}, \
            stop_frame = {}".format(db_task.id, segment_idx, start_frame, stop_frame))

        db_segment = models.Segment()
        db_segment.task = db_task
        db_segment.start_frame = start_frame
        db_segment.stop_frame = stop_frame
        db_segment.save()

        db_job = models.Job(segment=db_segment)
        db_job.save()
        db_job.make_dirs()

    db_task.data.save()
    db_task.save()

def _count_files(data):
    share_root = settings.SHARE_ROOT
    server_files = []

    for path in data["server_files"]:
        path = os.path.normpath(path).lstrip('/')
        if '..' in path.split(os.path.sep):
            raise ValueError("Don't use '..' inside file paths")
        full_path = os.path.abspath(os.path.join(share_root, path))
        if os.path.commonprefix([share_root, full_path]) != share_root:
            raise ValueError("Bad file path: " + path)
        server_files.append(path)

    sorted_server_files = sorted(server_files, reverse=True)
    # The idea of the code is trivial. After sort we will have files in the
    # following order: 'a/b/c/d/2.txt', 'a/b/c/d/1.txt', 'a/b/c/d', 'a/b/c'
    # Let's keep all items which aren't substrings of the previous item. In
    # the example above only 2.txt and 1.txt files will be in the final list.
    # Also need to correctly handle 'a/b/c0', 'a/b/c' case.
    without_extra_dirs = [v[1] for v in zip([""] + sorted_server_files, sorted_server_files)
        if not os.path.dirname(v[0]).startswith(v[1])]

    # we need to keep the original sequence of files
    data['server_files'] = [f for f in server_files if f in without_extra_dirs]

    def count_files(file_mapping, counter):
        for rel_path, full_path in file_mapping.items():
            mime = get_mime(full_path)
            if mime in counter:
                counter[mime].append(rel_path)
            elif rel_path.endswith('.jsonl'):
                continue
            else:
                slogger.glob.warn("Skip '{}' file (its mime type doesn't "
                    "correspond to supported MIME file type)".format(full_path))

    counter = { media_type: [] for media_type in MEDIA_TYPES.keys() }

    count_files(
        file_mapping={ f:f for f in data['remote_files'] or data['client_files']},
        counter=counter,
    )

    count_files(
        file_mapping={ f:os.path.abspath(os.path.join(share_root, f)) for f in data['server_files']},
        counter=counter,
    )

    return counter

def _find_manifest_files(data):
    manifest_files = []
    for files in ['client_files', 'server_files', 'remote_files']:
        current_manifest_files = list(filter(lambda x: x.endswith('.jsonl'), data[files]))
        if current_manifest_files:
            manifest_files.extend(current_manifest_files)
            data[files] = [f for f in data[files] if f not in current_manifest_files]
    return manifest_files

def _validate_data(counter, manifest_files=None):
    unique_entries = 0
    multiple_entries = 0
    for media_type, media_config in MEDIA_TYPES.items():
        if counter[media_type]:
            if media_config['unique']:
                unique_entries += len(counter[media_type])
            else:
                multiple_entries += len(counter[media_type])

            if manifest_files and media_type not in ('video', 'image', 'zip', 'archive'):
                raise Exception(
                    'File with meta information can only be uploaded with video/images/archives'
                )

    if unique_entries == 1 and multiple_entries > 0 or unique_entries > 1:
        unique_types = ', '.join([k for k, v in MEDIA_TYPES.items() if v['unique']])
        multiply_types = ', '.join([k for k, v in MEDIA_TYPES.items() if not v['unique']])
        count = ', '.join(['{} {}(s)'.format(len(v), k) for k, v in counter.items()])
        raise ValueError('Only one {} or many {} can be used simultaneously, \
            but {} found.'.format(unique_types, multiply_types, count))

    if unique_entries == 0 and multiple_entries == 0:
        raise ValueError('No media data found')

    task_modes = [MEDIA_TYPES[media_type]['mode'] for media_type, media_files in counter.items() if media_files]

    if not all(mode == task_modes[0] for mode in task_modes):
        raise Exception('Could not combine different task modes for data')

    return counter, task_modes[0]

def _validate_job_file_mapping(
    db_task: models.Task, data: Dict[str, Any]
) -> Optional[JobFileMapping]:
    job_file_mapping = data.get('job_file_mapping', None)

    if job_file_mapping is None:
        return None
    elif not list(itertools.chain.from_iterable(job_file_mapping)):
        raise ValidationError("job_file_mapping cannot be empty")

    if db_task.segment_size:
        raise ValidationError("job_file_mapping cannot be used with segment_size")

    if (data.get('sorting_method', db_task.data.sorting_method)
        != models.SortingMethod.LEXICOGRAPHICAL
    ):
        raise ValidationError("job_file_mapping cannot be used with sorting_method")

    if data.get('start_frame', db_task.data.start_frame):
        raise ValidationError("job_file_mapping cannot be used with start_frame")

    if data.get('stop_frame', db_task.data.stop_frame):
        raise ValidationError("job_file_mapping cannot be used with stop_frame")

    if data.get('frame_filter', db_task.data.frame_filter):
        raise ValidationError("job_file_mapping cannot be used with frame_filter")

    if db_task.data.get_frame_step() != 1:
        raise ValidationError("job_file_mapping cannot be used with frame step")

    if data.get('filename_pattern'):
        raise ValidationError("job_file_mapping cannot be used with filename_pattern")

    if data.get('server_files_exclude'):
        raise ValidationError("job_file_mapping cannot be used with server_files_exclude")

    return job_file_mapping

def _validate_manifest(
    manifests: List[str],
    root_dir: Optional[str],
    *,
    is_in_cloud: bool,
    db_cloud_storage: Optional[Any],
    data_storage_method: str,
    data_sorting_method: str,
    isBackupRestore: bool,
) -> Optional[str]:
    if manifests:
        if len(manifests) != 1:
            raise ValidationError('Only one manifest file can be attached to data')
        manifest_file = manifests[0]
        full_manifest_path = os.path.join(root_dir, manifests[0])

        if is_in_cloud:
            cloud_storage_instance = db_storage_to_storage_instance(db_cloud_storage)
            # check that cloud storage manifest file exists and is up to date
            if not os.path.exists(full_manifest_path) or \
                    datetime.fromtimestamp(os.path.getmtime(full_manifest_path), tz=timezone.utc) \
                    < cloud_storage_instance.get_file_last_modified(manifest_file):
                cloud_storage_instance.download_file(manifest_file, full_manifest_path)

        if is_manifest(full_manifest_path):
            if not (
                data_sorting_method == models.SortingMethod.PREDEFINED or
                (settings.USE_CACHE and data_storage_method == models.StorageMethodChoice.CACHE) or
                isBackupRestore or is_in_cloud
            ):
                cache_disabled_message = ""
                if data_storage_method == models.StorageMethodChoice.CACHE and not settings.USE_CACHE:
                    cache_disabled_message = (
                        "This server doesn't allow to use cache for data. "
                        "Please turn 'use cache' off and try to recreate the task"
                    )
                    slogger.glob.warning(cache_disabled_message)

                raise ValidationError(
                    "A manifest file can only be used with the 'use cache' option "
                    "or when 'sorting_method' is 'predefined'" + \
                    (". " + cache_disabled_message if cache_disabled_message else "")
                )
            return manifest_file

        raise ValidationError('Invalid manifest was uploaded')

    return None

def _validate_scheme(url):
    ALLOWED_SCHEMES = ['http', 'https']

    parsed_url = urlparse.urlparse(url)

    if parsed_url.scheme not in ALLOWED_SCHEMES:
        raise ValueError('Unsupported URL scheme: {}. Only http and https are supported'.format(parsed_url.scheme))

def _download_data(urls, upload_dir):
    job = rq.get_current_job()
    local_files = {}

    with make_requests_session() as session:
        for url in urls:
            name = os.path.basename(urlrequest.url2pathname(urlparse.urlparse(url).path))
            if name in local_files:
                raise Exception("filename collision: {}".format(name))
            _validate_scheme(url)
            slogger.glob.info("Downloading: {}".format(url))
            job.meta['status'] = '{} is being downloaded..'.format(url)
            job.save_meta()

            response = session.get(url, stream=True, proxies=PROXIES_FOR_UNTRUSTED_URLS)
            if response.status_code == 200:
                response.raw.decode_content = True
                with open(os.path.join(upload_dir, name), 'wb') as output_file:
                    shutil.copyfileobj(response.raw, output_file)
            else:
                error_message = f"Failed to download {response.url}"
                if url != response.url:
                    error_message += f" (redirected from {url})"

                if response.status_code == 407:
                    error_message += "; likely attempt to access internal host"
                elif response.status_code:
                    error_message += f"; HTTP error {response.status_code}"

                raise Exception(error_message)

            local_files[name] = True

    return list(local_files.keys())

def _download_data_from_cloud_storage(
    db_storage: models.CloudStorage,
    files: List[str],
    upload_dir: str,
):
    cloud_storage_instance = db_storage_to_storage_instance(db_storage)
    cloud_storage_instance.bulk_download_to_dir(files, upload_dir)

def _get_manifest_frame_indexer(start_frame=0, frame_step=1):
    return lambda frame_id: start_frame + frame_id * frame_step

def _read_dataset_manifest(path: str, *, create_index: bool = False) -> ImageManifestManager:
    """
    Reads an upload manifest file
    """

    if not is_dataset_manifest(path):
        raise ValidationError(
            "Can't recognize a dataset manifest file in "
            "the uploaded file '{}'".format(os.path.basename(path))
        )

    return ImageManifestManager(path, create_index=create_index)

def _restore_file_order_from_manifest(
    extractor: ImageListReader, manifest: ImageManifestManager, upload_dir: str
) -> List[str]:
    """
    Restores file ordering for the "predefined" file sorting method of the task creation.
    Checks for extra files in the input.
    Read more: https://github.com/cvat-ai/cvat/issues/5061
    """

    input_files = {os.path.relpath(p, upload_dir): p for p in extractor.absolute_source_paths}
    manifest_files = list(manifest.data)

    mismatching_files = list(input_files.keys() ^ manifest_files)
    if mismatching_files:
        DISPLAY_ENTRIES_COUNT = 5
        mismatching_display = [
            fn + (" (upload)" if fn in input_files else " (manifest)")
            for fn in mismatching_files[:DISPLAY_ENTRIES_COUNT]
        ]
        remaining_count = len(mismatching_files) - DISPLAY_ENTRIES_COUNT
        raise FileNotFoundError(
            "Uploaded files do no match the upload manifest file contents. "
            "Please check the upload manifest file contents and the list of uploaded files. "
            "Mismatching files: {}{}. "
            "Read more: https://docs.cvat.ai/docs/manual/advanced/dataset_manifest/"
            .format(
                ", ".join(mismatching_display),
                f" (and {remaining_count} more). " if 0 < remaining_count else ""
            )
        )

    return [input_files[fn] for fn in manifest_files]

def _create_task_manifest_based_on_cloud_storage_manifest(
    sorted_media: List[str],
    cloud_storage_manifest_prefix: str,
    cloud_storage_manifest: ImageManifestManager,
    manifest: ImageManifestManager,
) -> None:
    if cloud_storage_manifest_prefix:
        sorted_media_without_manifest_prefix = [
            os.path.relpath(i, cloud_storage_manifest_prefix) for i in sorted_media
        ]
        sequence, raw_content = cloud_storage_manifest.get_subset(sorted_media_without_manifest_prefix)
        def _add_prefix(properties):
            file_name = properties['name']
            properties['name'] = os.path.join(cloud_storage_manifest_prefix, file_name)
            return properties
        content = list(map(_add_prefix, raw_content))
    else:
        sequence, content = cloud_storage_manifest.get_subset(sorted_media)
    if not content:
        raise ValidationError('There is no intersection of the files specified'
                            'in the request with the contents of the bucket')
    sorted_content = (i[1] for i in sorted(zip(sequence, content)))
    manifest.create(sorted_content)

def _create_task_manifest_from_cloud_data(
    db_storage: models.CloudStorage,
    sorted_media: List[str],
    manifest: ImageManifestManager,
    dimension: models.DimensionType = models.DimensionType.DIM_2D,
    *,
    stop_frame: Optional[int] = None,
) -> None:
    if stop_frame is None:
        stop_frame = len(sorted_media) - 1
    cloud_storage_instance = db_storage_to_storage_instance(db_storage)
    content_generator = cloud_storage_instance.bulk_download_to_memory(sorted_media)

    manifest.link(
        sources=content_generator,
        DIM_3D=dimension == models.DimensionType.DIM_3D,
        stop=stop_frame,
    )
    manifest.create()

@transaction.atomic
def _create_thread(
    db_task: Union[int, models.Task],
    data: Dict[str, Any],
    *,
    isBackupRestore: bool = False,
    isDatasetImport: bool = False,
) -> None:
    if isinstance(db_task, int):
        db_task = models.Task.objects.select_for_update().get(pk=db_task)

    slogger.glob.info("create task #{}".format(db_task.id))

    job_file_mapping = _validate_job_file_mapping(db_task, data)

    db_data = db_task.data
    upload_dir = db_data.get_upload_dirname() if db_data.storage != models.StorageChoice.SHARE else settings.SHARE_ROOT
    is_data_in_cloud = db_data.storage == models.StorageChoice.CLOUD_STORAGE

    job = rq.get_current_job()

    def _update_status(msg: str) -> None:
        job.meta['status'] = msg
        job.save_meta()

    if data['remote_files'] and not isDatasetImport:
        data['remote_files'] = _download_data(data['remote_files'], upload_dir)

    # find and validate manifest file
    manifest_files = _find_manifest_files(data)
    manifest_root = None

    # we should also handle this case because files from the share source have not been downloaded yet
    if data['copy_data']:
        manifest_root = settings.SHARE_ROOT
    elif db_data.storage in {models.StorageChoice.LOCAL, models.StorageChoice.SHARE}:
        manifest_root = upload_dir
    elif is_data_in_cloud:
        manifest_root = db_data.cloud_storage.get_storage_dirname()
    else:
        assert False, f"Unknown file storage {db_data.storage}"

    manifest_file = _validate_manifest(
        manifest_files,
        manifest_root,
        is_in_cloud=is_data_in_cloud,
        db_cloud_storage=db_data.cloud_storage if is_data_in_cloud else None,
        data_storage_method=db_data.storage_method,
        data_sorting_method=data['sorting_method'],
        isBackupRestore=isBackupRestore,
    )

    manifest = None
    if is_data_in_cloud:
        cloud_storage_instance = db_storage_to_storage_instance(db_data.cloud_storage)

        if manifest_file:
            cloud_storage_manifest = ImageManifestManager(
                os.path.join(db_data.cloud_storage.get_storage_dirname(), manifest_file),
                db_data.cloud_storage.get_storage_dirname()
            )
            cloud_storage_manifest.set_index()
            cloud_storage_manifest_prefix = os.path.dirname(manifest_file)

        if manifest_file and not data['server_files'] and not data['filename_pattern']: # only manifest file was specified in server files by the user
            data['filename_pattern'] = '*'

        # update the server_files list with files from the specified directories
        if (dirs:= list(filter(lambda x: x.endswith('/'), data['server_files']))):
            copy_of_server_files = data['server_files'].copy()
            copy_of_dirs = dirs.copy()
            additional_files = []
            if manifest_file:
                for directory in dirs:
                    if cloud_storage_manifest_prefix:
                        # cloud_storage_manifest_prefix is a dirname of manifest, it doesn't end with a slash
                        directory = directory[len(cloud_storage_manifest_prefix) + 1:]
                    additional_files.extend(
                        list(
                            map(
                                lambda x: x[1].full_name,
                                filter(lambda x: x[1].full_name.startswith(directory), cloud_storage_manifest)
                            )
                        ) if directory else [x[1].full_name for x in cloud_storage_manifest]
                    )
                if cloud_storage_manifest_prefix:
                    additional_files = [os.path.join(cloud_storage_manifest_prefix, f) for f in additional_files]
            else:
                while len(dirs):
                    directory = dirs.pop()
                    for f in cloud_storage_instance.list_files(prefix=directory, _use_flat_listing=True):
                        if f['type'] == 'REG':
                            additional_files.append(f['name'])
                        else:
                            dirs.append(f['name'])

            data['server_files'] = []
            for f in copy_of_server_files:
                if f not in copy_of_dirs:
                    data['server_files'].append(f)
                else:
                    data['server_files'].extend(list(filter(lambda x: x.startswith(f), additional_files)))

            del additional_files

        if server_files_exclude := data.get('server_files_exclude'):
            data['server_files'] = list(filter(
                lambda x: x not in server_files_exclude and all([f'{i}/' not in server_files_exclude for i in Path(x).parents]),
                data['server_files']
            ))

        # update list with server files if task creation approach with pattern and manifest file is used
        if data['filename_pattern']:
            additional_files = []

            if not manifest_file:
                # NOTE: we cannot list files with specified pattern on the providers page because they don't provide such function
                dirs = []
                prefix = ""

                while True:
                    for f in cloud_storage_instance.list_files(prefix=prefix, _use_flat_listing=True):
                        if f['type'] == 'REG':
                            additional_files.append(f['name'])
                        else:
                            dirs.append(f['name'])
                    if not dirs:
                        break
                    prefix = dirs.pop()

                if not data['filename_pattern'] == '*':
                    additional_files = fnmatch.filter(additional_files, data['filename_pattern'])
            else:
                additional_files = list(cloud_storage_manifest.data) if not cloud_storage_manifest_prefix \
                    else [os.path.join(cloud_storage_manifest_prefix, f) for f in cloud_storage_manifest.data]
                if not data['filename_pattern'] == '*':
                    additional_files = fnmatch.filter(additional_files, data['filename_pattern'])

            data['server_files'].extend(additional_files)

        if cloud_storage_instance.prefix:
            # filter server_files based on default prefix
            data['server_files'] = list(filter(lambda x: x.startswith(cloud_storage_instance.prefix), data['server_files']))

        # We only need to process the files specified in job_file_mapping
        if job_file_mapping is not None:
            filtered_files = []
            for f in itertools.chain.from_iterable(job_file_mapping):
                if f not in data['server_files']:
                    raise ValidationError(f"Job mapping file {f} is not specified in input files")
                filtered_files.append(f)
            data['server_files'] = filtered_files

    # count and validate uploaded files
    media = _count_files(data)
    media, task_mode = _validate_data(media, manifest_files)
    is_media_sorted = False

    if is_data_in_cloud:
        # first we need to filter files and keep only supported ones
        if any([v for k, v in media.items() if k != 'image']) and db_data.storage_method == models.StorageMethodChoice.CACHE:
            # FUTURE-FIXME: This is a temporary workaround for creating tasks
            # with unsupported cloud storage data (video, archive, pdf) when use_cache is enabled
            db_data.storage_method = models.StorageMethodChoice.FILE_SYSTEM
            _update_status("The 'use cache' option is ignored")

        if db_data.storage_method == models.StorageMethodChoice.FILE_SYSTEM or not settings.USE_CACHE:
            filtered_data = []
            for files in (i for i in media.values() if i):
                filtered_data.extend(files)
            media_to_download = filtered_data

            if media['image']:
                start_frame = db_data.start_frame
                stop_frame = len(filtered_data) - 1
                if data['stop_frame'] is not None:
                    stop_frame = min(stop_frame, data['stop_frame'])

                step = db_data.get_frame_step()
                if start_frame or step != 1 or stop_frame != len(filtered_data) - 1:
                    media_to_download = filtered_data[start_frame : stop_frame + 1: step]
            _download_data_from_cloud_storage(db_data.cloud_storage, media_to_download, upload_dir)
            del media_to_download
            del filtered_data
            is_data_in_cloud = False
            db_data.storage = models.StorageChoice.LOCAL
        else:
            manifest = ImageManifestManager(db_data.get_manifest_path())

    if job_file_mapping is not None and task_mode != 'annotation':
        raise ValidationError("job_file_mapping can't be used with sequence-based data like videos")

    if data['server_files']:
        if db_data.storage == models.StorageChoice.LOCAL and not db_data.cloud_storage:
            # this means that the data has not been downloaded from the storage to the host
            _copy_data_from_share_point(
                (data['server_files'] + [manifest_file]) if manifest_file else data['server_files'],
                upload_dir, data.get('server_files_path'), data.get('server_files_exclude'))
            manifest_root = upload_dir
        elif is_data_in_cloud:
            # we should sort media before sorting in the extractor because the manifest structure should match to the sorted media
            if job_file_mapping is not None:
                sorted_media = list(itertools.chain.from_iterable(job_file_mapping))
            else:
                sorted_media = sort(media['image'], data['sorting_method'])
                media['image'] = sorted_media
            is_media_sorted = True

            if manifest_file:
                # Define task manifest content based on cloud storage manifest content and uploaded files
                _create_task_manifest_based_on_cloud_storage_manifest(
                    sorted_media, cloud_storage_manifest_prefix,
                    cloud_storage_manifest, manifest)
            else: # without manifest file but with use_cache option
                # Define task manifest content based on list with uploaded files
                _create_task_manifest_from_cloud_data(db_data.cloud_storage, sorted_media, manifest)

    av_scan_paths(upload_dir)

    job.meta['status'] = 'Media files are being extracted...'
    job.save_meta()

    # If upload from server_files image and directories
    # need to update images list by all found images in directories
    if (data['server_files']) and len(media['directory']) and len(media['image']):
        media['image'].extend(
            [os.path.relpath(image, upload_dir) for image in
                MEDIA_TYPES['directory']['extractor'](
                    source_path=[os.path.join(upload_dir, f) for f in media['directory']],
                ).absolute_source_paths
            ]
        )
        media['directory'] = []

    if (not isBackupRestore and manifest_file and
        data['sorting_method'] == models.SortingMethod.RANDOM
    ):
        raise ValidationError("It isn't supported to upload manifest file and use random sorting")

    if (isBackupRestore and db_data.storage_method == models.StorageMethodChoice.FILE_SYSTEM and
        data['sorting_method'] in {models.SortingMethod.RANDOM, models.SortingMethod.PREDEFINED}
    ):
        raise ValidationError(
            "It isn't supported to import the task that was created "
            "without cache but with random/predefined sorting"
        )

    # Extract input data
    extractor = None
    manifest_index = _get_manifest_frame_indexer()
    for media_type, media_files in media.items():
        if not media_files:
            continue

        if extractor is not None:
            raise ValidationError('Combined data types are not supported')

        if (isDatasetImport or isBackupRestore) and media_type == 'image' and db_data.storage == models.StorageChoice.SHARE:
            manifest_index = _get_manifest_frame_indexer(db_data.start_frame, db_data.get_frame_step())
            db_data.start_frame = 0
            data['stop_frame'] = None
            db_data.frame_filter = ''

        source_paths = [os.path.join(upload_dir, f) for f in media_files]

        details = {
            'source_path': source_paths,
            'step': db_data.get_frame_step(),
            'start': db_data.start_frame,
            'stop': data['stop_frame'],
        }
        if media_type in {'archive', 'zip', 'pdf'} and db_data.storage == models.StorageChoice.SHARE:
            details['extract_dir'] = db_data.get_upload_dirname()
            upload_dir = db_data.get_upload_dirname()
            db_data.storage = models.StorageChoice.LOCAL
        if media_type != 'video':
            details['sorting_method'] = data['sorting_method'] if not is_media_sorted else models.SortingMethod.PREDEFINED

        extractor = MEDIA_TYPES[media_type]['extractor'](**details)

    if extractor is None:
        raise ValidationError("Can't create a task without data")

    # filter server_files from server_files_exclude when share point is used and files are not copied to CVAT.
    # here we exclude the case when the files are copied to CVAT because files are already filtered out.
    if (
        (server_files_exclude := data.get('server_files_exclude')) and
        data['server_files'] and
        not is_data_in_cloud and
        not data['copy_data'] and
        isinstance(extractor, MEDIA_TYPES['image']['extractor'])
    ):
        extractor.filter(
            lambda x: os.path.relpath(x, upload_dir) not in server_files_exclude and \
                all([f'{i}/' not in server_files_exclude for i in Path(x).relative_to(upload_dir).parents])
        )

    validate_dimension = ValidateDimension()
    if isinstance(extractor, MEDIA_TYPES['zip']['extractor']):
        extractor.extract()

    validate_dimension = ValidateDimension()
    if db_data.storage == models.StorageChoice.LOCAL or (
        db_data.storage == models.StorageChoice.SHARE and
        isinstance(extractor, MEDIA_TYPES['zip']['extractor'])
    ):
        validate_dimension.set_path(upload_dir)
        validate_dimension.validate()

    if (db_task.project is not None and
        db_task.project.tasks.count() > 1 and
        db_task.project.tasks.first().dimension != validate_dimension.dimension
    ):
        raise ValidationError(
            f"Dimension ({validate_dimension.dimension}) of the task must be the "
            f"same as other tasks in project ({db_task.project.tasks.first().dimension})"
        )

    if validate_dimension.dimension == models.DimensionType.DIM_3D:
        db_task.dimension = models.DimensionType.DIM_3D

        keys_of_related_files = validate_dimension.related_files.keys()
        absolute_keys_of_related_files = [os.path.join(upload_dir, f) for f in keys_of_related_files]
        # When a task is created, the sorting method can be random and in this case, reinitialization will be with correct sorting
        # but when a task is restored from a backup, a random sorting is changed to predefined and we need to manually sort files
        # in the correct order.
        source_files = absolute_keys_of_related_files if not isBackupRestore else \
            [item for item in extractor.absolute_source_paths if item in absolute_keys_of_related_files]
        extractor.reconcile(
            source_files=source_files,
            step=db_data.get_frame_step(),
            start=db_data.start_frame,
            stop=data['stop_frame'],
            dimension=models.DimensionType.DIM_3D,
        )

    related_images = {}
    if isinstance(extractor, MEDIA_TYPES['image']['extractor']):
        extractor.filter(lambda x: not re.search(r'(^|{0})related_images{0}'.format(os.sep), x))
        related_images = detect_related_images(extractor.absolute_source_paths, upload_dir)

    if validate_dimension.dimension != models.DimensionType.DIM_3D and (
        (
            not isinstance(extractor, MEDIA_TYPES['video']['extractor']) and
            isBackupRestore and
            db_data.storage_method == models.StorageMethodChoice.CACHE and
            db_data.sorting_method in {models.SortingMethod.RANDOM, models.SortingMethod.PREDEFINED}
        ) or (
            not isDatasetImport and
            not isBackupRestore and
            data['sorting_method'] == models.SortingMethod.PREDEFINED and (
                # Sorting with manifest is required for zip
                isinstance(extractor, MEDIA_TYPES['zip']['extractor']) or

                # Sorting with manifest is optional for non-video
                (manifest_file or manifest) and
                not isinstance(extractor, MEDIA_TYPES['video']['extractor'])
            )
        )
    ) or job_file_mapping:
        # We should sort media_files according to the manifest content sequence
        # and we should do this in general after validation step for 3D data
        # and after filtering from related_images
        if job_file_mapping:
            sorted_media_files = itertools.chain.from_iterable(job_file_mapping)

        else:
            if manifest is None:
                if not manifest_file or not os.path.isfile(os.path.join(manifest_root, manifest_file)):
                    raise FileNotFoundError(
                        "Can't find upload manifest file '{}' "
                        "in the uploaded files. When the 'predefined' sorting method is used, "
                        "this file is required in the input files. "
                        "Read more: https://docs.cvat.ai/docs/manual/advanced/dataset_manifest/"
                        .format(manifest_file or os.path.basename(db_data.get_manifest_path()))
                    )

                manifest = _read_dataset_manifest(os.path.join(manifest_root, manifest_file),
                    create_index=manifest_root.startswith(db_data.get_upload_dirname())
                )

            sorted_media_files = _restore_file_order_from_manifest(extractor, manifest, upload_dir)

        sorted_media_files = [os.path.join(upload_dir, fn) for fn in sorted_media_files]

        # validate the sorting
        for file_path in sorted_media_files:
            if not file_path in extractor:
                raise ValidationError(
                    f"Can't find file '{os.path.basename(file_path)}' in the input files"
                )

        media_files = sorted_media_files.copy()
        del sorted_media_files

        data['sorting_method'] = models.SortingMethod.PREDEFINED
        extractor.reconcile(
            source_files=media_files,
            step=db_data.get_frame_step(),
            start=db_data.start_frame,
            stop=data['stop_frame'],
            sorting_method=data['sorting_method'],
        )

    db_task.mode = task_mode
    db_data.compressed_chunk_type = models.DataChoice.VIDEO if task_mode == 'interpolation' and not data['use_zip_chunks'] else models.DataChoice.IMAGESET
    db_data.original_chunk_type = models.DataChoice.VIDEO if task_mode == 'interpolation' else models.DataChoice.IMAGESET

    def update_progress(progress):
        progress_animation = '|/-\\'
        if not hasattr(update_progress, 'call_counter'):
            update_progress.call_counter = 0

        status_message = 'CVAT is preparing data chunks'
        if not progress:
            status_message = '{} {}'.format(status_message, progress_animation[update_progress.call_counter])
        job.meta['status'] = status_message
        job.meta['task_progress'] = progress or 0.
        job.save_meta()
        update_progress.call_counter = (update_progress.call_counter + 1) % len(progress_animation)

    compressed_chunk_writer_class = Mpeg4CompressedChunkWriter if db_data.compressed_chunk_type == models.DataChoice.VIDEO else ZipCompressedChunkWriter
    if db_data.original_chunk_type == models.DataChoice.VIDEO:
        original_chunk_writer_class = Mpeg4ChunkWriter
        # Let's use QP=17 (that is 67 for 0-100 range) for the original chunks, which should be visually lossless or nearly so.
        # A lower value will significantly increase the chunk size with a slight increase of quality.
        original_quality = 67
    else:
        original_chunk_writer_class = ZipChunkWriter
        original_quality = 100

    kwargs = {}
    if validate_dimension.dimension == models.DimensionType.DIM_3D:
        kwargs["dimension"] = validate_dimension.dimension
    compressed_chunk_writer = compressed_chunk_writer_class(db_data.image_quality, **kwargs)
    original_chunk_writer = original_chunk_writer_class(original_quality, **kwargs)

    # calculate chunk size if it isn't specified
    if db_data.chunk_size is None:
        if isinstance(compressed_chunk_writer, ZipCompressedChunkWriter):
            first_image_idx = db_data.start_frame
            if not is_data_in_cloud:
                w, h = extractor.get_image_size(first_image_idx)
            else:
                img_properties = manifest[first_image_idx]
                w, h = img_properties['width'], img_properties['height']
            area = h * w
            db_data.chunk_size = max(2, min(72, 36 * 1920 * 1080 // area))
        else:
            db_data.chunk_size = 36

    video_path = ""
    video_size = (0, 0)

    db_images = []

    if settings.USE_CACHE and db_data.storage_method == models.StorageMethodChoice.CACHE:
        for media_type, media_files in media.items():
            if not media_files:
                continue

            # replace manifest file (e.g was uploaded 'subdir/manifest.jsonl' or 'some_manifest.jsonl')
            if manifest_file and not os.path.exists(db_data.get_manifest_path()):
                shutil.copyfile(os.path.join(manifest_root, manifest_file),
                    db_data.get_manifest_path())
                if manifest_root and manifest_root.startswith(db_data.get_upload_dirname()):
                    os.remove(os.path.join(manifest_root, manifest_file))
                manifest_file = os.path.relpath(db_data.get_manifest_path(), upload_dir)

            if task_mode == MEDIA_TYPES['video']['mode']:
                try:
                    manifest_is_prepared = False
                    if manifest_file:
                        try:
                            manifest = VideoManifestValidator(source_path=os.path.join(upload_dir, media_files[0]),
                                                              manifest_path=db_data.get_manifest_path())
                            manifest.init_index()
                            manifest.validate_seek_key_frames()
                            assert len(manifest) > 0, 'No key frames.'

                            all_frames = manifest.video_length
                            video_size = manifest.video_resolution
                            manifest_is_prepared = True
                        except Exception as ex:
                            manifest.remove()
                            if isinstance(ex, AssertionError):
                                base_msg = str(ex)
                            else:
                                base_msg = 'Invalid manifest file was upload.'
                                slogger.glob.warning(str(ex))
                            _update_status('{} Start prepare a valid manifest file.'.format(base_msg))

                    if not manifest_is_prepared:
                        _update_status('Start prepare a manifest file')
                        manifest = VideoManifestManager(db_data.get_manifest_path())
                        manifest.link(
                            media_file=media_files[0],
                            upload_dir=upload_dir,
                            chunk_size=db_data.chunk_size
                        )
                        manifest.create()
                        _update_status('A manifest had been created')

                        all_frames = len(manifest.reader)
                        video_size = manifest.reader.resolution
                        manifest_is_prepared = True

                    db_data.size = len(range(db_data.start_frame, min(data['stop_frame'] + 1 \
                        if data['stop_frame'] else all_frames, all_frames), db_data.get_frame_step()))
                    video_path = os.path.join(upload_dir, media_files[0])
                except Exception as ex:
                    db_data.storage_method = models.StorageMethodChoice.FILE_SYSTEM
                    manifest.remove()
                    del manifest
                    base_msg = str(ex) if isinstance(ex, AssertionError) \
                        else "Uploaded video does not support a quick way of task creating."
                    _update_status("{} The task will be created using the old method".format(base_msg))
            else: # images, archive, pdf
                db_data.size = len(extractor)
                manifest = ImageManifestManager(db_data.get_manifest_path())

                if not manifest.exists:
                    manifest.link(
                        sources=extractor.absolute_source_paths,
                        meta={ k: {'related_images': related_images[k] } for k in related_images },
                        data_dir=upload_dir,
                        DIM_3D=(db_task.dimension == models.DimensionType.DIM_3D),
                    )
                    manifest.create()
                else:
                    manifest.init_index()
                counter = itertools.count()
                for _, chunk_frames in itertools.groupby(extractor.frame_range, lambda x: next(counter) // db_data.chunk_size):
                    chunk_paths = [(extractor.get_path(i), i) for i in chunk_frames]
                    img_sizes = []

                    for chunk_path, frame_id in chunk_paths:
                        properties = manifest[manifest_index(frame_id)]

                        # check mapping
                        if not chunk_path.endswith(f"{properties['name']}{properties['extension']}"):
                            raise Exception('Incorrect file mapping to manifest content')

                        if db_task.dimension == models.DimensionType.DIM_2D and (
                            properties.get('width') is not None and
                            properties.get('height') is not None
                        ):
                            resolution = (properties['width'], properties['height'])
                        elif is_data_in_cloud:
                            raise Exception(
                                "Can't find image '{}' width or height info in the manifest"
                                .format(f"{properties['name']}{properties['extension']}")
                            )
                        else:
                            resolution = extractor.get_image_size(frame_id)
                        img_sizes.append(resolution)

                    db_images.extend([
                        models.Image(data=db_data,
                            path=os.path.relpath(path, upload_dir),
                            frame=frame, width=w, height=h)
                        for (path, frame), (w, h) in zip(chunk_paths, img_sizes)
                    ])
    if db_data.storage_method == models.StorageMethodChoice.FILE_SYSTEM or not settings.USE_CACHE:
        counter = itertools.count()
        generator = itertools.groupby(extractor, lambda _: next(counter) // db_data.chunk_size)
        generator = ((idx, list(chunk_data)) for idx, chunk_data in generator)

        def save_chunks(
                executor: concurrent.futures.ThreadPoolExecutor,
                chunk_idx: int,
                chunk_data: Iterable[tuple[str, str, str]]) -> list[tuple[str, int, tuple[int, int]]]:
            nonlocal db_data, db_task, extractor, original_chunk_writer, compressed_chunk_writer
            if (db_task.dimension == models.DimensionType.DIM_2D and
                isinstance(extractor, (
                    MEDIA_TYPES['image']['extractor'],
                    MEDIA_TYPES['zip']['extractor'],
                    MEDIA_TYPES['pdf']['extractor'],
                    MEDIA_TYPES['archive']['extractor'],
                ))):
                chunk_data = preload_images(chunk_data)

            fs_original = executor.submit(
                original_chunk_writer.save_as_chunk,
                images=chunk_data,
                chunk_path=db_data.get_original_chunk_path(chunk_idx)
            )
            fs_compressed = executor.submit(
                compressed_chunk_writer.save_as_chunk,
                images=chunk_data,
                chunk_path=db_data.get_compressed_chunk_path(chunk_idx),
            )
            fs_original.result()
            image_sizes = fs_compressed.result()

            # (path, frame, size)
            return list((i[0][1], i[0][2], i[1]) for i in zip(chunk_data, image_sizes))

        def process_results(img_meta: list[tuple[str, int, tuple[int, int]]]):
            nonlocal db_images, db_data, video_path, video_size

            if db_task.mode == 'annotation':
                db_images.extend(
                    models.Image(
                        data=db_data,
                        path=os.path.relpath(frame_path, upload_dir),
                        frame=frame_number,
                        width=frame_size[0],
                        height=frame_size[1])
                    for frame_path, frame_number,  frame_size in img_meta)
            else:
                video_size = img_meta[0][2]
                video_path = img_meta[0][0]

            progress = extractor.get_progress(img_meta[-1][1])
            update_progress(progress)

        futures = queue.Queue(maxsize=settings.CVAT_CONCURRENT_CHUNK_PROCESSING)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2*settings.CVAT_CONCURRENT_CHUNK_PROCESSING) as executor:
            for chunk_idx, chunk_data in generator:
                db_data.size += len(chunk_data)
                if futures.full():
                    process_results(futures.get().result())
                futures.put(executor.submit(save_chunks, executor, chunk_idx, chunk_data))

            while not futures.empty():
                process_results(futures.get().result())

    if db_task.mode == 'annotation':
        models.Image.objects.bulk_create(db_images)
        created_images = models.Image.objects.filter(data_id=db_data.id)

        db_related_files = [
            models.RelatedFile(data=image.data, primary_image=image, path=os.path.join(upload_dir, related_file_path))
            for image in created_images
            for related_file_path in related_images.get(image.path, [])
        ]
        models.RelatedFile.objects.bulk_create(db_related_files)
        db_images = []
    else:
        models.Video.objects.create(
            data=db_data,
            path=os.path.relpath(video_path, upload_dir),
            width=video_size[0], height=video_size[1])

    if db_data.stop_frame == 0:
        db_data.stop_frame = db_data.start_frame + (db_data.size - 1) * db_data.get_frame_step()
    else:
        # validate stop_frame
        db_data.stop_frame = min(db_data.stop_frame, \
            db_data.start_frame + (db_data.size - 1) * db_data.get_frame_step())

    slogger.glob.info("Found frames {} for Data #{}".format(db_data.size, db_data.id))
    _save_task_to_db(db_task, job_file_mapping=job_file_mapping)
