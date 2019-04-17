
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

import mimetypes
_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))
_MEDIA_MIMETYPES_FILE = os.path.join(_SCRIPT_DIR, "media.mimetypes")
mimetypes.init(files=[_MEDIA_MIMETYPES_FILE])

import django_rq
from django.conf import settings
from django.db import transaction
from ffmpy import FFmpeg
from pyunpack import Archive
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

class _FrameExtractor:
    def __init__(self, source_path, compress_quality, flip_flag=False):
        # translate inversed range 1:95 to 2:32
        translated_quality = 96 - compress_quality
        translated_quality = round((((translated_quality - 1) * (31 - 2)) / (95 - 1)) + 2)
        self.output = tempfile.mkdtemp(prefix='cvat-', suffix='.data')
        target_path = os.path.join(self.output, '%d.jpg')
        output_opts = '-start_number 0 -b:v 10000k -vsync 0 -an -y -q:v ' + str(translated_quality)
        if flip_flag:
            output_opts += ' -vf "transpose=2,transpose=2"'
        ff = FFmpeg(
            inputs  = {source_path: None},
            outputs = {target_path: output_opts})

        slogger.glob.info("FFMpeg cmd: {} ".format(ff.cmd))
        ff.run()

    def getframepath(self, k):
        return "{0}/{1}.jpg".format(self.output, k)

    def __del__(self):
        if self.output:
            shutil.rmtree(self.output)

    def __getitem__(self, k):
        return self.getframepath(k)

    def __iter__(self):
        i = 0
        while os.path.exists(self.getframepath(i)):
            yield self[i]
            i += 1

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
                images = filter(lambda x: _get_mime(x) == 'image', fullnames)
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


def _get_mime(name):
    mime = mimetypes.guess_type(name)
    mime_type = mime[0]
    encoding = mime[1]
    # zip, rar, tar, tar.gz, tar.bz2, 7z, cpio
    supportedArchives = ['application/zip', 'application/x-rar-compressed',
        'application/x-tar', 'application/x-7z-compressed', 'application/x-cpio',
        'gzip', 'bzip2']
    if mime_type is not None:
        if mime_type.startswith('video'):
            return 'video'
        elif mime_type in supportedArchives or encoding in supportedArchives:
            return 'archive'
        elif mime_type.startswith('image'):
            return 'image'
        else:
            return 'unknown'
    else:
        if os.path.isdir(name):
            return 'directory'
        else:
            return 'unknown'


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

def _unpack_archive(archive, upload_dir):
    job = rq.get_current_job()
    job.meta['status'] = 'Archive is being unpacked..'
    job.save_meta()

    Archive(archive).extractall(upload_dir)
    os.remove(archive)

def _copy_video_to_task(video, db_task):
    job = rq.get_current_job()
    job.meta['status'] = 'Video is being extracted..'
    job.save_meta()

    extractor = _FrameExtractor(video, db_task.image_quality)
    for frame, image_orig_path in enumerate(extractor):
        image_dest_path = db_task.get_frame_path(frame)
        db_task.size += 1
        dirname = os.path.dirname(image_dest_path)
        if not os.path.exists(dirname):
            os.makedirs(dirname)
        shutil.copyfile(image_orig_path, image_dest_path)

    image = Image.open(db_task.get_frame_path(0))
    models.Video.objects.create(task=db_task, path=video,
        start_frame=0, stop_frame=db_task.size, step=1,
        width=image.width, height=image.height)
    image.close()

def _copy_images_to_task(upload_dir, db_task):
    image_paths = []
    for root, _, files in os.walk(upload_dir):
        paths = map(lambda f: os.path.join(root, f), files)
        paths = filter(lambda x: _get_mime(x) == 'image', paths)
        image_paths.extend(paths)
    image_paths.sort()

    db_images = []
    if len(image_paths):
        job = rq.get_current_job()
        for frame, image_orig_path in enumerate(image_paths):
            progress = frame * 100 // len(image_paths)
            job.meta['status'] = 'Images are being compressed.. {}%'.format(progress)
            job.save_meta()
            image_dest_path = db_task.get_frame_path(frame)
            db_task.size += 1
            dirname = os.path.dirname(image_dest_path)
            if not os.path.exists(dirname):
                os.makedirs(dirname)
            image = Image.open(image_orig_path)
            # Ensure image data fits into 8bit per pixel before RGB conversion as PIL clips values on conversion
            if image.mode == "I":
                # Image mode is 32bit integer pixels.
                # Autoscale pixels by factor 2**8 / im_data.max() to fit into 8bit
                im_data = np.array(image)
                im_data = im_data * (2**8 / im_data.max())
                image = Image.fromarray(im_data.astype(np.int32))
            image = image.convert('RGB')
            image.save(image_dest_path, quality=db_task.image_quality, optimize=True)
            db_images.append(models.Image(task=db_task, path=image_orig_path,
                frame=frame, width=image.width, height=image.height))
            image.close()

        models.Image.objects.bulk_create(db_images)
    else:
        raise ValueError("Image files were not found")

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
        if 'directory' == _get_mime(full_path):
            server_files['dirs'].append(path)
        else:
            server_files['files'].append(path)
        if os.path.commonprefix([share_root, full_path]) != share_root:
            raise ValueError("Bad file path: " + path)

    # Remove directories if other files from them exists in server files
    data['server_files'] = server_files['files'] + [ dir_name for dir_name in server_files['dirs']
        if not [ f_name for f_name in server_files['files'] if f_name.startswith(dir_name)]]

    def count_files(file_mapping, counter):
        archive = None
        video = None
        for rel_path, full_path in file_mapping.items():
            mime = _get_mime(full_path)
            counter[mime] += 1
            if mime == "archive":
                archive = rel_path
            elif mime == "video":
                video = rel_path
        return video, archive

    counter = {"image": 0, "video": 0, "archive": 0, "directory": 0}

    client_video, client_archive = count_files(
        file_mapping={ f:f for f in data['client_files']},
        counter=counter,
    )

    server_video, server_archive = count_files(
        file_mapping={ f:os.path.abspath(os.path.join(share_root, f)) for f in data['server_files']},
        counter=counter,
    )

    num_videos = counter["video"]
    num_archives = counter["archive"]
    num_images = counter["image"] + counter["directory"]
    if (num_videos > 1 or num_archives > 1 or
        (num_videos == 1 and num_archives + num_images > 0) or
        (num_archives == 1 and num_videos + num_images > 0) or
        (num_images > 0 and num_archives + num_videos > 0)):

        raise ValueError("Only one archive, one video or many images can be \
            dowloaded simultaneously. {} image(s), {} dir(s), {} video(s), {} \
            archive(s) found".format(counter['image'], counter['directory'],
                counter['video'], counter['archive']))

    return client_video or server_video, client_archive or server_archive

@transaction.atomic
def _create_thread(tid, data):
    slogger.glob.info("create task #{}".format(tid))

    db_task = models.Task.objects.select_for_update().get(pk=tid)
    if db_task.size != 0:
        raise NotImplementedError("Adding more data is not implemented")

    upload_dir = db_task.get_upload_dirname()
    video, archive = _validate_data(data)

    if data['server_files']:
        _copy_data_from_share(data['server_files'], upload_dir)

    if archive:
        archive = os.path.join(upload_dir, archive)
        _unpack_archive(archive, upload_dir)

    if video:
        db_task.mode = "interpolation"
        video = os.path.join(upload_dir, video)
        _copy_video_to_task(video, db_task)
    else:
        db_task.mode = "annotation"
        _copy_images_to_task(upload_dir, db_task)

    slogger.glob.info("Founded frames {} for task #{}".format(db_task.size, tid))
    _save_task_to_db(db_task)

