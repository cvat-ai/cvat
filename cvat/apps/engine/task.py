
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import sys
import rq
import shutil
import tempfile
import numpy as np
from PIL import Image
from traceback import print_exception
from ast import literal_eval

from cvat.apps.engine.mime import get_mime
from cvat.apps.engine.settings import MEDIA_TYPES

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
    db_task = models.Task.objects.select_for_update().get(pk=tid)
    with open(db_task.get_log_path(), "wt") as log_file:
        print_exception(exc_type, exc_value, traceback, file=log_file)
    return False

############################# Internal implementation for server API

def make_image_meta_cache(db_task):
    with open(db_task.get_image_meta_cache_path(), 'w') as meta_file:
        cache = {
            'original_size': []
        }

        if db_task.mode == 'interpolation':
            image = Image.open(db_task.get_frame_path(0))
            cache['original_size'].append({
                'width': image.size[0],
                'height': image.size[1]
            })
            image.close()
        else:
            filenames = []
            for root, _, files in os.walk(db_task.get_upload_dirname()):
                fullnames = map(lambda f: os.path.join(root, f), files)
                images = filter(lambda x: get_mime(x) == 'image', fullnames)
                filenames.extend(images)
            filenames.sort()

            for image_path in filenames:
                image = Image.open(image_path)
                cache['original_size'].append({
                    'width': image.size[0],
                    'height': image.size[1]
                })
                image.close()

        meta_file.write(str(cache))


def get_image_meta_cache(db_task):
    try:
        with open(db_task.get_image_meta_cache_path()) as meta_cache_file:
            return literal_eval(meta_cache_file.read())
    except Exception:
        make_image_meta_cache(db_task)
        with open(db_task.get_image_meta_cache_path()) as meta_cache_file:
            return literal_eval(meta_cache_file.read())

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
        segment_size = db_task.size

        # Segment step must be more than segment_size + overlap in single-segment tasks
        # Otherwise a task contains an extra segment
        segment_step = sys.maxsize

    default_overlap = 5 if db_task.mode == 'interpolation' else 0
    if db_task.overlap is None:
        db_task.overlap = default_overlap
    db_task.overlap = min(db_task.overlap, segment_size  // 2)

    segment_step -= db_task.overlap

    for x in range(0, db_task.size, segment_step):
        start_frame = x
        stop_frame = min(x + segment_size - 1, db_task.size - 1)

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

    db_task.save()

def _validate_data(data):
    share_root = settings.SHARE_ROOT
    server_files = {
        'dirs': [],
        'files': [],
    }

    for path in data["server_files"]:
        path = os.path.normpath(path).lstrip('/')
        if '..' in path.split(os.path.sep):
            raise ValueError("Don't use '..' inside file paths")
        full_path = os.path.abspath(os.path.join(share_root, path))
        if 'directory' == get_mime(full_path):
            server_files['dirs'].append(path)
        else:
            server_files['files'].append(path)
        if os.path.commonprefix([share_root, full_path]) != share_root:
            raise ValueError("Bad file path: " + path)

    # Remove directories if other files from them exists in server files
    data['server_files'] = server_files['files'] + [ dir_name for dir_name in server_files['dirs']
        if not [ f_name for f_name in server_files['files'] if f_name.startswith(dir_name)]]

    def count_files(file_mapping, counter):
        for rel_path, full_path in file_mapping.items():
            mime = get_mime(full_path)
            counter[mime].append(rel_path)

    counter = { media_type: [] for media_type in MEDIA_TYPES.keys() }

    count_files(
        file_mapping={ f:f for f in data['client_files']},
        counter=counter,
    )

    count_files(
        file_mapping={ f:os.path.abspath(os.path.join(share_root, f)) for f in data['server_files']},
        counter=counter,
    )

    num_videos = len(counter["video"])
    num_archives = len(counter["archive"])
    num_images = len(counter["image"]) + len(counter["directory"])
    if (num_videos > 1 or num_archives > 1 or
        (num_videos == 1 and num_archives + num_images > 0) or
        (num_archives == 1 and num_videos + num_images > 0) or
        (num_images > 0 and num_archives + num_videos > 0)):

        raise ValueError("Only one archive, one video or many images can be \
            dowloaded simultaneously. {} image(s), {} dir(s), {} video(s), {} \
            archive(s) found".format(counter['image'], counter['directory'],
                counter['video'], counter['archive']))

    return counter

@transaction.atomic
def _create_thread(tid, data):
    slogger.glob.info("create task #{}".format(tid))

    db_task = models.Task.objects.select_for_update().get(pk=tid)
    if db_task.size != 0:
        raise NotImplementedError("Adding more data is not implemented")

    upload_dir = db_task.get_upload_dirname()
    media = _validate_data(data)

    if data['server_files']:
        _copy_data_from_share(data['server_files'], upload_dir)

    job = rq.get_current_job()

    db_images = []

    db_task.mode = 'interpolation' if media['video'] else 'annotation'
    for media_type, media_files in media.items():
        if not media_files:
            continue

        extractor = MEDIA_TYPES[media_type]['extractor'](
            source_path=[os.path.join(upload_dir, f) for f in media_files],
            dest_path=upload_dir,
            image_quality=db_task.image_quality,
        )

        for frame, image_orig_path in enumerate(extractor):
            image_dest_path = db_task.get_frame_path(frame)
            db_task.size += 1
            dirname = os.path.dirname(image_dest_path)
            if not os.path.exists(dirname):
                    os.makedirs(dirname)
            if db_task.mode == 'interpolation':
                job.meta['status'] = 'Video is being extracted..'
                job.save_meta()
                extractor.save_image(frame, image_dest_path)
            else:
                progress = frame * 100 // len(extractor)
                job.meta['status'] = 'Images are being compressed.. {}%'.format(progress)
                job.save_meta()
                width, height = extractor.save_image(frame, image_dest_path)
                db_images.append(models.Image(task=db_task, path=image_orig_path,
                    frame=frame, width=width, height=height))

    if db_task.mode == 'interpolation':
        image = Image.open(db_task.get_frame_path(0))
        models.Video.objects.create(task=db_task, path=media['video'][0],
            start_frame=0, stop_frame=db_task.size, step=1,
            width=image.width, height=image.height)
        image.close()
    else:
        models.Image.objects.bulk_create(db_images)

    slogger.glob.info("Founded frames {} for task #{}".format(db_task.size, tid))
    _save_task_to_db(db_task)
