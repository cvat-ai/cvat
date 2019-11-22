
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import sys
import rq
import shutil
from PIL import Image
from traceback import print_exception
from ast import literal_eval
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from cvat.apps.engine.media_extractors import get_mime, MEDIA_TYPES

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

    unique_entries = 0
    multiple_entries = 0
    for media_type, media_config in MEDIA_TYPES.items():
        if counter[media_type]:
            if media_config['unique']:
                unique_entries += len(counter[media_type])
            else:
                multiple_entries += len(counter[media_type])

    if unique_entries == 1 and multiple_entries > 0 or unique_entries > 1:
        unique_types = ', '.join([k for k, v in MEDIA_TYPES.items() if v['unique']])
        multiply_types = ', '.join([k for k, v in MEDIA_TYPES.items() if not v['unique']])
        count = ', '.join(['{} {}(s)'.format(len(v), k) for k, v in counter.items()])
        raise ValueError('Only one {} or many {} can be used simultaneously, \
            but {} found.'.format(unique_types, multiply_types, count))

    if unique_entries == 0 and multiple_entries == 0:
        raise ValueError('No media data found')

    return counter

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
    if db_task.size != 0:
        raise NotImplementedError("Adding more data is not implemented")

    upload_dir = db_task.get_upload_dirname()

    if data['remote_files']:
        data['remote_files'] = _download_data(data['remote_files'], upload_dir)

    media = _validate_data(data)

    if data['server_files']:
        _copy_data_from_share(data['server_files'], upload_dir)

    job = rq.get_current_job()
    job.meta['status'] = 'Media files are being extracted...'
    job.save_meta()

    db_images = []
    extractors = []
    length = 0
    for media_type, media_files in media.items():
        if not media_files:
            continue

        extractor = MEDIA_TYPES[media_type]['extractor'](
            source_path=[os.path.join(upload_dir, f) for f in media_files],
            dest_path=upload_dir,
            image_quality=db_task.image_quality,
            step=db_task.get_frame_step(),
            start=db_task.start_frame,
            stop=db_task.stop_frame,
        )
        length += len(extractor)
        db_task.mode = MEDIA_TYPES[media_type]['mode']
        extractors.append(extractor)

    for extractor in extractors:
        for frame, image_orig_path in enumerate(extractor):
            image_dest_path = db_task.get_frame_path(db_task.size)
            dirname = os.path.dirname(image_dest_path)

            if not os.path.exists(dirname):
                os.makedirs(dirname)

            if db_task.mode == 'interpolation':
                extractor.save_image(frame, image_dest_path)
            else:
                width, height = extractor.save_image(frame, image_dest_path)
                db_images.append(models.Image(
                    task=db_task,
                    path=image_orig_path,
                    frame=db_task.size,
                    width=width, height=height))

            db_task.size += 1
            progress = frame * 100 // length
            job.meta['status'] = 'Images are being compressed... {}%'.format(progress)
            job.save_meta()

    if db_task.mode == 'interpolation':
        image = Image.open(db_task.get_frame_path(0))
        models.Video.objects.create(
            task=db_task,
            path=extractors[0].get_source_name(),
            width=image.width, height=image.height)
        image.close()
        if db_task.stop_frame == 0:
            db_task.stop_frame = db_task.start_frame + (db_task.size - 1) * db_task.get_frame_step()
    else:
        models.Image.objects.bulk_create(db_images)

    slogger.glob.info("Founded frames {} for task #{}".format(db_task.size, tid))
    _save_task_to_db(db_task)
