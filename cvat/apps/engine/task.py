
# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import os
import sys
from re import findall
import rq
import shutil
from traceback import print_exception
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from cvat.apps.engine.media_extractors import get_mime, MEDIA_TYPES, Mpeg4ChunkWriter, ZipChunkWriter, Mpeg4CompressedChunkWriter, ZipCompressedChunkWriter
from cvat.apps.engine.models import DataChoice, StorageMethodChoice
from cvat.apps.engine.utils import av_scan_paths
from cvat.apps.engine.prepare import prepare_meta

import django_rq
from django.conf import settings
from django.db import transaction
from distutils.dir_util import copy_tree

from . import models
from .log import slogger

############################# Low Level server API

def create(tid, data):
    """Schedule the task"""
    q = django_rq.get_queue('default')
    q.enqueue_call(func=_create_thread, args=(tid, data),
        job_id="/api/v1/tasks/{}".format(tid))

@transaction.atomic
def rq_handler(job, exc_type, exc_value, traceback):
    splitted = job.id.split('/')
    tid = int(splitted[splitted.index('tasks') + 1])
    try:
        db_task = models.Task.objects.select_for_update().get(pk=tid)
        with open(db_task.get_log_path(), "wt") as log_file:
            print_exception(exc_type, exc_value, traceback, file=log_file)
    except models.Task.DoesNotExist:
        pass # skip exceptions in the code

    return False

############################# Internal implementation for server API

def _copy_data_from_share(server_files, upload_dir):
    job = rq.get_current_job()
    job.meta['status'] = 'Data are being copied from share..'
    job.save_meta()

    for path in server_files:
        source_path = os.path.join(settings.SHARE_ROOT, os.path.normpath(path))
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
    if segment_size == 0:
        segment_size = db_task.data.size

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

def _count_files(data, meta_info_file=None):
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

    server_files.sort(reverse=True)
    # The idea of the code is trivial. After sort we will have files in the
    # following order: 'a/b/c/d/2.txt', 'a/b/c/d/1.txt', 'a/b/c/d', 'a/b/c'
    # Let's keep all items which aren't substrings of the previous item. In
    # the example above only 2.txt and 1.txt files will be in the final list.
    # Also need to correctly handle 'a/b/c0', 'a/b/c' case.
    data['server_files'] = [v[1] for v in zip([""] + server_files, server_files)
        if not os.path.dirname(v[0]).startswith(v[1])]

    def count_files(file_mapping, counter):
        for rel_path, full_path in file_mapping.items():
            mime = get_mime(full_path)
            if mime in counter:
                counter[mime].append(rel_path)
            elif findall('meta_info.txt$', rel_path):
                meta_info_file.append(rel_path)
            else:
                slogger.glob.warn("Skip '{}' file (its mime type doesn't "
                    "correspond to a video or an image file)".format(full_path))

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

def _validate_data(counter, meta_info_file=None):
    unique_entries = 0
    multiple_entries = 0
    for media_type, media_config in MEDIA_TYPES.items():
        if counter[media_type]:
            if media_config['unique']:
                unique_entries += len(counter[media_type])
            else:
                multiple_entries += len(counter[media_type])

            if meta_info_file and media_type != 'video':
                raise Exception('File with meta information can only be uploaded with video file')

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

        req = urlrequest.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urlrequest.urlopen(req) as fp, open(os.path.join(upload_dir, name), 'wb') as tfp:
                while True:
                    block = fp.read(8192)
                    if not block:
                        break
                    tfp.write(block)
        except urlerror.HTTPError as err:
            raise Exception("Failed to download " + url + ". " + str(err.code) + ' - ' + err.reason)
        except urlerror.URLError as err:
            raise Exception("Invalid URL: " + url + ". " + err.reason)

        local_files[name] = True
    return list(local_files.keys())

@transaction.atomic
def _create_thread(tid, data):
    slogger.glob.info("create task #{}".format(tid))

    db_task = models.Task.objects.select_for_update().get(pk=tid)
    db_data = db_task.data
    if db_task.data.size != 0:
        raise NotImplementedError("Adding more data is not implemented")

    upload_dir = db_data.get_upload_dirname()

    if data['remote_files']:
        data['remote_files'] = _download_data(data['remote_files'], upload_dir)

    meta_info_file = []
    media = _count_files(data, meta_info_file)
    media, task_mode = _validate_data(media, meta_info_file)
    if meta_info_file:
        assert settings.USE_CACHE and db_data.storage_method == StorageMethodChoice.CACHE, \
            "File with meta information can be uploaded if 'Use cache' option is also selected"

    if data['server_files']:
        _copy_data_from_share(data['server_files'], upload_dir)

    av_scan_paths(upload_dir)

    job = rq.get_current_job()
    job.meta['status'] = 'Media files are being extracted...'
    job.save_meta()

    db_images = []
    extractor = None

    for media_type, media_files in media.items():
        if media_files:
            if extractor is not None:
                raise Exception('Combined data types are not supported')
            extractor = MEDIA_TYPES[media_type]['extractor'](
                source_path=[os.path.join(upload_dir, f) for f in media_files],
                step=db_data.get_frame_step(),
                start=db_data.start_frame,
                stop=data['stop_frame'],
            )
    if extractor.__class__ == MEDIA_TYPES['zip']['extractor']:
        extractor.extract()
    db_task.mode = task_mode
    db_data.compressed_chunk_type = models.DataChoice.VIDEO if task_mode == 'interpolation' and not data['use_zip_chunks'] else models.DataChoice.IMAGESET
    db_data.original_chunk_type = models.DataChoice.VIDEO if task_mode == 'interpolation' else models.DataChoice.IMAGESET

    def update_progress(progress):
        progress_animation = '|/-\\'
        if not hasattr(update_progress, 'call_counter'):
            update_progress.call_counter = 0

        status_template = 'Images are being compressed {}'
        if progress:
            current_progress = '{}%'.format(round(progress * 100))
        else:
            current_progress = '{}'.format(progress_animation[update_progress.call_counter])
        job.meta['status'] = status_template.format(current_progress)
        job.save_meta()
        update_progress.call_counter = (update_progress.call_counter + 1) % len(progress_animation)

    compressed_chunk_writer_class = Mpeg4CompressedChunkWriter if db_data.compressed_chunk_type == DataChoice.VIDEO else ZipCompressedChunkWriter
    original_chunk_writer_class = Mpeg4ChunkWriter if db_data.original_chunk_type == DataChoice.VIDEO else ZipChunkWriter

    compressed_chunk_writer = compressed_chunk_writer_class(db_data.image_quality)
    original_chunk_writer = original_chunk_writer_class(100)

    # calculate chunk size if it isn't specified
    if db_data.chunk_size is None:
        if isinstance(compressed_chunk_writer, ZipCompressedChunkWriter):
            w, h = extractor.get_image_size(0)
            area = h * w
            db_data.chunk_size = max(2, min(72, 36 * 1920 * 1080 // area))
        else:
            db_data.chunk_size = 36


    video_path = ""
    video_size = (0, 0)

    if settings.USE_CACHE and db_data.storage_method == StorageMethodChoice.CACHE:
       for media_type, media_files in media.items():

            if not media_files:
                continue

            if task_mode == MEDIA_TYPES['video']['mode']:
                try:
                    if meta_info_file:
                        try:
                            from cvat.apps.engine.prepare import UploadedMeta
                            if os.path.split(meta_info_file[0])[0]:
                                os.replace(
                                    os.path.join(upload_dir, meta_info_file[0]),
                                    db_data.get_meta_path()
                                )
                            meta_info = UploadedMeta(source_path=os.path.join(upload_dir, media_files[0]),
                                                     meta_path=db_data.get_meta_path())
                            meta_info.check_seek_key_frames()
                            meta_info.check_frames_numbers()
                            meta_info.save_meta_info()
                            assert len(meta_info.key_frames) > 0, 'No key frames.'
                        except Exception as ex:
                            base_msg = str(ex) if isinstance(ex, AssertionError) else \
                                'Invalid meta information was upload.'
                            job.meta['status'] = '{} Start prepare valid meta information.'.format(base_msg)
                            job.save_meta()
                            meta_info, smooth_decoding = prepare_meta(
                                media_file=media_files[0],
                                upload_dir=upload_dir,
                                chunk_size=db_data.chunk_size
                            )
                            assert smooth_decoding == True, 'Too few keyframes for smooth video decoding.'
                    else:
                        meta_info, smooth_decoding = prepare_meta(
                            media_file=media_files[0],
                            upload_dir=upload_dir,
                            chunk_size=db_data.chunk_size
                        )
                        assert smooth_decoding == True, 'Too few keyframes for smooth video decoding.'

                    all_frames = meta_info.get_task_size()
                    video_size = meta_info.frame_sizes

                    db_data.size = len(range(db_data.start_frame, min(data['stop_frame'] + 1 if data['stop_frame'] else all_frames, all_frames), db_data.get_frame_step()))
                    video_path = os.path.join(upload_dir, media_files[0])
                except Exception as ex:
                    db_data.storage_method = StorageMethodChoice.FILE_SYSTEM
                    if os.path.exists(db_data.get_meta_path()):
                        os.remove(db_data.get_meta_path())
                    base_msg = str(ex) if isinstance(ex, AssertionError) else "Uploaded video does not support a quick way of task creating."
                    job.meta['status'] = "{} The task will be created using the old method".format(base_msg)
                    job.save_meta()
            else:#images,archive
                db_data.size = len(extractor)

                counter = itertools.count()
                for chunk_number, chunk_frames in itertools.groupby(extractor.frame_range, lambda x: next(counter) // db_data.chunk_size):
                    chunk_paths = [(extractor.get_path(i), i) for i in chunk_frames]
                    img_sizes = []
                    with open(db_data.get_dummy_chunk_path(chunk_number), 'w') as dummy_chunk:
                        for path, frame_id in chunk_paths:
                            dummy_chunk.write(os.path.relpath(path, upload_dir) + '\n')
                            img_sizes.append(extractor.get_image_size(frame_id))

                    db_images.extend([
                        models.Image(data=db_data,
                            path=os.path.relpath(path, upload_dir),
                            frame=frame, width=w, height=h)
                        for (path, frame), (w, h) in zip(chunk_paths, img_sizes)
                    ])

    if db_data.storage_method == StorageMethodChoice.FILE_SYSTEM or not settings.USE_CACHE:
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
        db_images = []
    else:
        models.Video.objects.create(
            data=db_data,
            path=os.path.relpath(video_path, upload_dir),
            width=video_size[0], height=video_size[1])

    if db_data.stop_frame == 0:
        db_data.stop_frame = db_data.start_frame + (db_data.size - 1) * db_data.get_frame_step()

    preview = extractor.get_preview()
    preview.save(db_data.get_preview_path())

    slogger.glob.info("Found frames {} for Data #{}".format(db_data.size, db_data.id))
    _save_task_to_db(db_task)