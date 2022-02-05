
# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import os
import sys
import rq
import re
import shutil
from distutils.dir_util import copy_tree
from traceback import print_exception
from urllib import parse as urlparse
from urllib import request as urlrequest
import requests
import django_rq

from django.conf import settings
from django.db import transaction

from cvat.apps.engine import models
from cvat.apps.engine.log import slogger
from cvat.apps.engine.media_extractors import (MEDIA_TYPES, Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter,
    ValidateDimension, ZipChunkWriter, ZipCompressedChunkWriter, get_mime, sort)
from cvat.apps.engine.utils import av_scan_paths
from utils.dataset_manifest import ImageManifestManager, VideoManifestManager, is_manifest
from utils.dataset_manifest.core import VideoManifestValidator
from utils.dataset_manifest.utils import detect_related_images
from .cloud_provider import get_cloud_storage_instance, Credentials

############################# Low Level server API

def create(tid, data):
    """Schedule the task"""
    q = django_rq.get_queue('default')
    q.enqueue_call(func=_create_thread, args=(tid, data),
        job_id="/api/tasks/{}".format(tid))

@transaction.atomic
def rq_handler(job, exc_type, exc_value, traceback):
    split = job.id.split('/')
    tid = split[split.index('tasks') + 1]
    try:
        tid = int(tid)
        db_task = models.Task.objects.select_for_update().get(pk=tid)
        with open(db_task.get_log_path(), "wt") as log_file:
            print_exception(exc_type, exc_value, traceback, file=log_file)
    except (models.Task.DoesNotExist, ValueError):
        pass # skip exceptions in the code

    return False

############################# Internal implementation for server API

def _copy_data_from_source(server_files, upload_dir, server_dir=None):
    job = rq.get_current_job()
    job.meta['status'] = 'Data are being copied from source..'
    job.save_meta()

    for path in server_files:
        if server_dir is None:
            source_path = os.path.join(settings.SHARE_ROOT, os.path.normpath(path))
        else:
            source_path = os.path.join(server_dir, os.path.normpath(path))
        target_path = os.path.join(upload_dir, path)
        if os.path.isdir(source_path):
            copy_tree(source_path, target_path)
        else:
            target_dir = os.path.dirname(target_path)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir)
            shutil.copyfile(source_path, target_path)

def _save_task_to_db(db_task):
    job = rq.get_current_job()
    job.meta['status'] = 'Task is being saved in database'
    job.save_meta()

    segment_size = db_task.segment_size
    segment_step = segment_size
    if segment_size == 0 or segment_size > db_task.data.size:
        segment_size = db_task.data.size
        db_task.segment_size = segment_size

        # Segment step must be more than segment_size + overlap in single-segment tasks
        # Otherwise a task contains an extra segment
        segment_step = sys.maxsize

    default_overlap = 5 if db_task.mode == 'interpolation' else 0
    if db_task.overlap is None:
        db_task.overlap = default_overlap
    db_task.overlap = min(db_task.overlap, segment_size  // 2)

    segment_step -= db_task.overlap

    for start_frame in range(0, db_task.data.size, segment_step):
        stop_frame = min(start_frame + segment_size - 1, db_task.data.size - 1)

        slogger.glob.info("New segment for task #{}: start_frame = {}, \
            stop_frame = {}".format(db_task.id, start_frame, stop_frame))

        db_segment = models.Segment()
        db_segment.task = db_task
        db_segment.start_frame = start_frame
        db_segment.stop_frame = stop_frame
        db_segment.save()

        db_job = models.Job()
        db_job.segment = db_segment
        db_job.save()

    db_task.data.save()
    db_task.save()

def _count_files(data, manifest_files=None):
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
                manifest_files.append(rel_path)
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

def _validate_data(counter, manifest_files=None):
    unique_entries = 0
    multiple_entries = 0
    for media_type, media_config in MEDIA_TYPES.items():
        if counter[media_type]:
            if media_config['unique']:
                unique_entries += len(counter[media_type])
            else:
                multiple_entries += len(counter[media_type])

            if manifest_files and media_type not in ('video', 'image'):
                raise Exception('File with meta information can only be uploaded with video/images ')

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

def _validate_manifest(manifests, root_dir):
    if manifests:
        if len(manifests) != 1:
            raise Exception('Only one manifest file can be attached with data')
        full_manifest_path = os.path.join(root_dir, manifests[0])
        if is_manifest(full_manifest_path):
            return manifests[0]
        raise Exception('Invalid manifest was uploaded')
    return None

def _download_data(urls, upload_dir):
    job = rq.get_current_job()
    local_files = {}
    for url in urls:
        name = os.path.basename(urlrequest.url2pathname(urlparse.urlparse(url).path))
        if name in local_files:
            raise Exception("filename collision: {}".format(name))
        slogger.glob.info("Downloading: {}".format(url))
        job.meta['status'] = '{} is being downloaded..'.format(url)
        job.save_meta()

        response = requests.get(url, stream=True)
        if response.status_code == 200:
            response.raw.decode_content = True
            with open(os.path.join(upload_dir, name), 'wb') as output_file:
                shutil.copyfileobj(response.raw, output_file)
        else:
            raise Exception("Failed to download " + url)

        local_files[name] = True

    return list(local_files.keys())

def _get_manifest_frame_indexer(start_frame=0, frame_step=1):
    return lambda frame_id: start_frame + frame_id * frame_step


@transaction.atomic
def _create_thread(db_task, data, isBackupRestore=False, isDatasetImport=False):
    if isinstance(db_task, int):
        db_task = models.Task.objects.select_for_update().get(pk=db_task)

    slogger.glob.info("create task #{}".format(db_task.id))

    db_data = db_task.data
    upload_dir = db_data.get_upload_dirname()

    if data['remote_files'] and not isDatasetImport:
        data['remote_files'] = _download_data(data['remote_files'], upload_dir)

    manifest_files = []
    media = _count_files(data, manifest_files)
    media, task_mode = _validate_data(media, manifest_files)

    if data['server_files']:
        if db_data.storage == models.StorageChoice.LOCAL:
            _copy_data_from_source(data['server_files'], upload_dir, data.get('server_files_path'))
        elif db_data.storage == models.StorageChoice.SHARE:
            upload_dir = settings.SHARE_ROOT

    manifest_root = None
    if db_data.storage in {models.StorageChoice.LOCAL, models.StorageChoice.SHARE}:
        manifest_root = upload_dir
    elif db_data.storage == models.StorageChoice.CLOUD_STORAGE:
        manifest_root = db_data.cloud_storage.get_storage_dirname()

    manifest_file = _validate_manifest(manifest_files, manifest_root)
    if manifest_file and (not settings.USE_CACHE or db_data.storage_method != models.StorageMethodChoice.CACHE):
        raise Exception("File with meta information can be uploaded if 'Use cache' option is also selected")

    if data['server_files'] and db_data.storage == models.StorageChoice.CLOUD_STORAGE:
        if not manifest_file: raise Exception('A manifest file not found')
        db_cloud_storage = db_data.cloud_storage
        credentials = Credentials()
        credentials.convert_from_db({
            'type': db_cloud_storage.credentials_type,
            'value': db_cloud_storage.credentials,
        })

        details = {
            'resource': db_cloud_storage.resource,
            'credentials': credentials,
            'specific_attributes': db_cloud_storage.get_specific_attributes()
        }
        cloud_storage_instance = get_cloud_storage_instance(cloud_provider=db_cloud_storage.provider_type, **details)
        sorted_media = sort(media['image'], data['sorting_method'])
        first_sorted_media_image = sorted_media[0]
        cloud_storage_instance.download_file(first_sorted_media_image, os.path.join(upload_dir, first_sorted_media_image))

        # prepare task manifest file from cloud storage manifest file
        # NOTE we should create manifest before defining chunk_size
        # FIXME in the future when will be implemented archive support
        manifest = ImageManifestManager(db_data.get_manifest_path())
        cloud_storage_manifest = ImageManifestManager(
            os.path.join(db_data.cloud_storage.get_storage_dirname(), manifest_file),
            db_data.cloud_storage.get_storage_dirname()
        )
        cloud_storage_manifest.set_index()
        sequence, content = cloud_storage_manifest.get_subset(sorted_media)
        sorted_content = (i[1] for i in sorted(zip(sequence, content)))
        manifest.create(sorted_content)

    av_scan_paths(upload_dir)

    job = rq.get_current_job()
    job.meta['status'] = 'Media files are being extracted...'
    job.save_meta()

    db_images = []
    extractor = None
    manifest_index = _get_manifest_frame_indexer()

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

    for media_type, media_files in media.items():
        if media_files:
            if extractor is not None:
                raise Exception('Combined data types are not supported')
            if (isDatasetImport or isBackupRestore) and media_type == 'image' and db_data.storage == models.StorageChoice.SHARE:
                manifest_index = _get_manifest_frame_indexer(db_data.start_frame, db_data.get_frame_step())
                db_data.start_frame = 0
                data['stop_frame'] = None
                db_data.frame_filter = ''
            source_paths=[os.path.join(upload_dir, f) for f in media_files]
            if manifest_file and not isBackupRestore and data['sorting_method'] in {models.SortingMethod.RANDOM, models.SortingMethod.PREDEFINED}:
                raise Exception("It isn't supported to upload manifest file and use random sorting")
            if isBackupRestore and db_data.storage_method == models.StorageMethodChoice.FILE_SYSTEM and \
                    data['sorting_method'] in {models.SortingMethod.RANDOM, models.SortingMethod.PREDEFINED}:
                raise Exception("It isn't supported to import the task that was created without cache but with random/predefined sorting")

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
                details['sorting_method'] = data['sorting_method']
            extractor = MEDIA_TYPES[media_type]['extractor'](**details)

    validate_dimension = ValidateDimension()
    if isinstance(extractor, MEDIA_TYPES['zip']['extractor']):
        extractor.extract()

    if db_data.storage == models.StorageChoice.LOCAL or \
            (db_data.storage == models.StorageChoice.SHARE and \
            isinstance(extractor, MEDIA_TYPES['zip']['extractor'])):
        validate_dimension.set_path(upload_dir)
        validate_dimension.validate()

    if db_task.project is not None and db_task.project.tasks.count() > 1 and db_task.project.tasks.first().dimension != validate_dimension.dimension:
        raise Exception(f'Dimension ({validate_dimension.dimension}) of the task must be the same as other tasks in project ({db_task.project.tasks.first().dimension})')

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

    if isBackupRestore and not isinstance(extractor, MEDIA_TYPES['video']['extractor']) and db_data.storage_method == models.StorageMethodChoice.CACHE and \
            db_data.sorting_method in {models.SortingMethod.RANDOM, models.SortingMethod.PREDEFINED} and validate_dimension.dimension != models.DimensionType.DIM_3D:
        # we should sort media_files according to the manifest content sequence
        # and we should do this in general after validation step for 3D data and after filtering from related_images
        manifest = ImageManifestManager(db_data.get_manifest_path())
        manifest.set_index()
        sorted_media_files = []

        for idx in range(len(extractor.absolute_source_paths)):
            properties = manifest[idx]
            image_name = properties.get('name', None)
            image_extension = properties.get('extension', None)

            full_image_path = os.path.join(upload_dir, f"{image_name}{image_extension}") if image_name and image_extension else None
            if full_image_path and full_image_path in extractor:
                sorted_media_files.append(full_image_path)
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

        status_message = 'Images are being compressed'
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
    original_chunk_writer = original_chunk_writer_class(original_quality)

    # calculate chunk size if it isn't specified
    if db_data.chunk_size is None:
        if isinstance(compressed_chunk_writer, ZipCompressedChunkWriter):
            if not (db_data.storage == models.StorageChoice.CLOUD_STORAGE):
                w, h = extractor.get_image_size(0)
            else:
                img_properties = manifest[0]
                w, h = img_properties['width'], img_properties['height']
            area = h * w
            db_data.chunk_size = max(2, min(72, 36 * 1920 * 1080 // area))
        else:
            db_data.chunk_size = 36

    video_path = ""
    video_size = (0, 0)

    def _update_status(msg):
        job.meta['status'] = msg
        job.save_meta()

    if settings.USE_CACHE and db_data.storage_method == models.StorageMethodChoice.CACHE:
       for media_type, media_files in media.items():

            if not media_files:
                continue

            # replace manifest file (e.g was uploaded 'subdir/manifest.jsonl' or 'some_manifest.jsonl')
            if manifest_file and not os.path.exists(db_data.get_manifest_path()):
                shutil.copyfile(os.path.join(upload_dir, manifest_file),
                    db_data.get_manifest_path())
                if upload_dir != settings.SHARE_ROOT:
                    os.remove(os.path.join(upload_dir, manifest_file))

            if task_mode == MEDIA_TYPES['video']['mode']:
                try:
                    manifest_is_prepared = False
                    if manifest_file:
                        try:
                            manifest = VideoManifestValidator(source_path=os.path.join(upload_dir, media_files[0]),
                                                              manifest_path=db_data.get_manifest_path())
                            manifest.init_index()
                            manifest.validate_seek_key_frames()
                            manifest.validate_frame_numbers()
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
                if not manifest_file:
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
                        if db_task.dimension == models.DimensionType.DIM_2D:
                            resolution = (properties['width'], properties['height'])
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
        generator = itertools.groupby(extractor, lambda x: next(counter) // db_data.chunk_size)
        for chunk_idx, chunk_data in generator:
            chunk_data = list(chunk_data)
            original_chunk_path = db_data.get_original_chunk_path(chunk_idx)
            original_chunk_writer.save_as_chunk(chunk_data, original_chunk_path)

            compressed_chunk_path = db_data.get_compressed_chunk_path(chunk_idx)
            img_sizes = compressed_chunk_writer.save_as_chunk(chunk_data, compressed_chunk_path)

            if db_task.mode == 'annotation':
                db_images.extend([
                    models.Image(
                        data=db_data,
                        path=os.path.relpath(data[1], upload_dir),
                        frame=data[2],
                        width=size[0],
                        height=size[1])

                    for data, size in zip(chunk_data, img_sizes)
                ])
            else:
                video_size = img_sizes[0]
                video_path = chunk_data[0][1]

            db_data.size += len(chunk_data)
            progress = extractor.get_progress(chunk_data[-1][2])
            update_progress(progress)

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

    preview = extractor.get_preview()
    preview.save(db_data.get_preview_path())

    slogger.glob.info("Found frames {} for Data #{}".format(db_data.size, db_data.id))
    _save_task_to_db(db_task)
