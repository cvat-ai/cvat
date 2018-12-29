
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import sys
import rq
import shlex
import shutil
import tempfile
from PIL import Image
from traceback import print_exception
from ast import literal_eval

import mimetypes
_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))
_MEDIA_MIMETYPES_FILE = os.path.join(_SCRIPT_DIR, "media.mimetypes")
mimetypes.init(files=[_MEDIA_MIMETYPES_FILE])

from cvat.apps.engine.models import StatusChoice

import django_rq
from django.conf import settings
from django.db import transaction
from ffmpy import FFmpeg
from pyunpack import Archive
from distutils.dir_util import copy_tree
from collections import OrderedDict

from . import models
from .log import slogger

############################# Low Level server API

@transaction.atomic
def create_empty(params):
    """Create empty directory structure for a new task, add it to DB."""

    db_task = models.Task()

    db_task.name = params['task_name']
    db_task.bug_tracker = params['bug_tracker_link']
    db_task.path = ""
    db_task.size = 0
    db_task.owner = params['owner']
    db_task.save()
    task_path = os.path.join(settings.DATA_ROOT, str(db_task.id))
    db_task.set_task_dirname(task_path)

    task_path = db_task.get_task_dirname()
    if os.path.isdir(task_path):
        shutil.rmtree(task_path)
        os.mkdir(task_path)

    upload_dir = db_task.get_upload_dirname()
    os.makedirs(upload_dir)
    output_dir = db_task.get_data_dirname()
    os.makedirs(output_dir)

    return db_task

def create(tid, params):
    """Schedule the task"""
    q = django_rq.get_queue('default')
    q.enqueue_call(func=_create_thread, args=(tid, params),
        job_id="task.create/{}".format(tid))

def check(tid):
    """Check status of the scheduled task"""
    response = {}
    queue = django_rq.get_queue('default')
    job = queue.fetch_job("task.create/{}".format(tid))
    if job is None:
        response = {"state": "unknown"}
    elif job.is_failed:
        response = {"state": "error", "stderr": "Could not create the task. " + job.exc_info }
    elif job.is_finished:
        response = {"state": "created"}
    else:
        response = {"state": "started"}

    if 'status' in job.meta:
        response['status'] = job.meta['status']

    return response

@transaction.atomic
def delete(tid):
    """Delete the task"""
    db_task = models.Task.objects.select_for_update().get(pk=tid)
    if db_task:
        db_task.delete()
        shutil.rmtree(db_task.get_task_dirname(), ignore_errors=True)
    else:
        raise Exception("The task doesn't exist")

@transaction.atomic
def update(tid, labels):
    """Update labels for the task"""

    db_task = models.Task.objects.select_for_update().get(pk=tid)
    db_labels = list(db_task.label_set.prefetch_related('attributespec_set').all())

    new_labels = _parse_labels(labels)
    old_labels = _parse_db_labels(db_labels)

    for label_name in new_labels:
        if label_name in old_labels:
            db_label = [l for l in db_labels if l.name == label_name][0]
            for attr_name in new_labels[label_name]:
                if attr_name in old_labels[label_name]:
                    db_attr = [attr for attr in db_label.attributespec_set.all()
                        if attr.get_name() == attr_name][0]
                    new_attr = new_labels[label_name][attr_name]
                    old_attr = old_labels[label_name][attr_name]
                    if new_attr['prefix'] != old_attr['prefix']:
                        raise Exception("new_attr['prefix'] != old_attr['prefix']")
                    if new_attr['type'] != old_attr['type']:
                        raise Exception("new_attr['type'] != old_attr['type']")
                    if set(old_attr['values']) - set(new_attr['values']):
                        raise Exception("set(old_attr['values']) - set(new_attr['values'])")

                    db_attr.text = "{}{}={}:{}".format(new_attr['prefix'],
                        new_attr['type'], attr_name, ",".join(new_attr['values']))
                    db_attr.save()
                else:
                    db_attr = models.AttributeSpec()
                    attr = new_labels[label_name][attr_name]
                    db_attr.text = "{}{}={}:{}".format(attr['prefix'],
                        attr['type'], attr_name, ",".join(attr['values']))
                    db_attr.label = db_label
                    db_attr.save()
        else:
            db_label = models.Label()
            db_label.name = label_name
            db_label.task = db_task
            db_label.save()
            for attr_name in new_labels[label_name]:
                db_attr = models.AttributeSpec()
                attr = new_labels[label_name][attr_name]
                db_attr.text = "{}{}={}:{}".format(attr['prefix'],
                    attr['type'], attr_name, ",".join(attr['values']))
                db_attr.label = db_label
                db_attr.save()

def get_frame_path(tid, frame):
    """Read corresponding frame for the task"""
    db_task = models.Task.objects.get(pk=tid)
    path = _get_frame_path(frame, db_task.get_data_dirname())

    return path

def get(tid):
    """Get the task as dictionary of attributes"""
    db_task = models.Task.objects.get(pk=tid)
    if db_task:
        db_labels = db_task.label_set.prefetch_related('attributespec_set').order_by('-pk').all()
        im_meta_data = get_image_meta_cache(db_task)
        attributes = {}
        for db_label in db_labels:
            attributes[db_label.id] = {}
            for db_attrspec in db_label.attributespec_set.all():
                attributes[db_label.id][db_attrspec.id] = db_attrspec.text
        db_segments = list(db_task.segment_set.prefetch_related('job_set').all())
        segment_length = max(db_segments[0].stop_frame - db_segments[0].start_frame + 1, 1)
        job_indexes = []
        for segment in db_segments:
            db_job = segment.job_set.first()
            job_indexes.append({
                "job_id": db_job.id,
                "max_shape_id": db_job.max_shape_id,
            })

        response = {
            "status": db_task.status,
            "spec": {
                "labels": OrderedDict((db_label.id, db_label.name) for db_label in db_labels),
                "attributes": attributes
            },
            "size": db_task.size,
            "taskid": db_task.id,
            "name": db_task.name,
            "mode": db_task.mode,
            "segment_length": segment_length,
            "jobs": job_indexes,
            "overlap": db_task.overlap,
            "z_orded": db_task.z_order,
            "flipped": db_task.flipped,
            "image_meta_data": im_meta_data
        }
    else:
        raise Exception("Cannot find the task: {}".format(tid))

    return response


@transaction.atomic
def save_job_status(jid, status, user):
    db_job = models.Job.objects.select_related("segment__task").select_for_update().get(pk = jid)
    db_task = db_job.segment.task
    status = StatusChoice(status)

    slogger.job[jid].info('changing job status from {} to {} by an user {}'.format(db_job.status, str(status), user))

    db_job.status = status.value
    db_job.save()
    db_segments = list(db_task.segment_set.prefetch_related('job_set').all())
    db_jobs = [db_segment.job_set.first() for db_segment in db_segments]

    if len(list(filter(lambda x: StatusChoice(x.status) == StatusChoice.ANNOTATION, db_jobs))) > 0:
        db_task.status = StatusChoice.ANNOTATION
    elif len(list(filter(lambda x: StatusChoice(x.status) == StatusChoice.VALIDATION, db_jobs))) > 0:
        db_task.status = StatusChoice.VALIDATION
    else:
        db_task.status = StatusChoice.COMPLETED

    db_task.save()

def get_job(jid):
    """Get the job as dictionary of attributes"""
    db_job = models.Job.objects.select_related("segment__task").get(id=jid)
    if db_job:
        db_segment = db_job.segment
        db_task = db_segment.task
        im_meta_data = get_image_meta_cache(db_task)

        # Truncate extra image sizes
        if db_task.mode == 'annotation':
            im_meta_data['original_size'] = im_meta_data['original_size'][db_segment.start_frame:db_segment.stop_frame + 1]

        db_labels = db_task.label_set.prefetch_related('attributespec_set').order_by('-pk').all()
        attributes = {}
        for db_label in db_labels:
            attributes[db_label.id] = {}
            for db_attrspec in db_label.attributespec_set.all():
                attributes[db_label.id][db_attrspec.id] = db_attrspec.text

        response = {
            "status": db_job.status,
            "labels": OrderedDict((db_label.id, db_label.name) for db_label in db_labels),
            "stop": db_segment.stop_frame,
            "taskid": db_task.id,
            "slug": db_task.name,
            "jobid": jid,
            "start": db_segment.start_frame,
            "mode": db_task.mode,
            "overlap": db_task.overlap,
            "attributes": attributes,
            "z_order": db_task.z_order,
            "flipped": db_task.flipped,
            "image_meta_data": im_meta_data,
            "max_shape_id": db_job.max_shape_id,
        }
    else:
        raise Exception("Cannot find the job: {}".format(jid))

    return response

@transaction.atomic
def rq_handler(job, exc_type, exc_value, traceback):
    tid = job.id.split('/')[1]
    db_task = models.Task.objects.select_for_update().get(pk=tid)
    with open(db_task.get_log_path(), "wt") as log_file:
        print_exception(exc_type, exc_value, traceback, file=log_file)
    db_task.delete()

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

def _make_image_meta_cache(db_task):
    with open(db_task.get_image_meta_cache_path(), 'w') as meta_file:
        cache = {
            'original_size': []
        }

        if db_task.mode == 'interpolation':
            image = Image.open(get_frame_path(db_task.id, 0))
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
        _make_image_meta_cache(db_task)
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
            return 'empty'
    else:
        if os.path.isdir(name):
            return 'directory'
        else:
            return 'empty'


def _get_frame_path(frame, base_dir):
    d1 = str(frame // 10000)
    d2 = str(frame // 100)
    path = os.path.join(d1, d2, str(frame) + '.jpg')
    if base_dir:
        path = os.path.join(base_dir, path)

    return path

def _parse_labels(labels):
    parsed_labels = OrderedDict()

    last_label = ""
    for token in shlex.split(labels):
        if token[0] != "~" and token[0] != "@":
            if token in parsed_labels:
                raise ValueError("labels string is not corect. " +
                    "`{}` label is specified at least twice.".format(token))

            parsed_labels[token] = {}
            last_label = token
        else:
            attr = models.parse_attribute(token)
            attr['text'] = token
            if not attr['type'] in ['checkbox', 'radio', 'number', 'text', 'select']:
                raise ValueError("labels string is not corect. " +
                    "`{}` attribute has incorrect type {}.".format(
                    attr['name'], attr['type']))

            values = attr['values']
            if attr['type'] == 'checkbox': # <prefix>checkbox=name:true/false
                if not (len(values) == 1 and values[0] in ['true', 'false']):
                    raise ValueError("labels string is not corect. " +
                        "`{}` attribute has incorrect value.".format(attr['name']))
            elif attr['type'] == 'number': # <prefix>number=name:min,max,step
                try:
                    if len(values) != 3 or float(values[2]) <= 0 or \
                        float(values[0]) >= float(values[1]):
                        raise ValueError
                except ValueError:
                    raise ValueError("labels string is not correct. " +
                        "`{}` attribute has incorrect format.".format(attr['name']))

            if attr['name'] in parsed_labels[last_label]:
                raise ValueError("labels string is not corect. " +
                    "`{}` attribute is specified at least twice.".format(attr['name']))

            parsed_labels[last_label][attr['name']] = attr

    return parsed_labels

def _parse_db_labels(db_labels):
    result = []
    for db_label in db_labels:
        result += [db_label.name]
        result += [attr.text for attr in db_label.attributespec_set.all()]
    return _parse_labels(" ".join(result))


'''
    Count all files, remove garbage (unknown mime types or extra dirs)
'''
def _prepare_paths(source_paths, target_paths, storage):
    counters = {
        "image": 0,
        "directory": 0,
        "video": 0,
        "archive": 0
    }

    share_dirs_mapping = {}
    share_files_mapping = {}

    if storage == 'local':
        # Files were uploaded early. Remove trash if it exists. Count them.
        for path in target_paths:
            mime = _get_mime(path)
            if mime in ['video', 'archive', 'image']:
                counters[mime] += 1
            else:
                try:
                    os.remove(path)
                except:
                    os.rmdir(path)
    else:
        # Files are available via mount share. Count them and separate dirs.
        for source_path, target_path in zip(source_paths, target_paths):
            mime = _get_mime(source_path)
            if mime in ['directory', 'image', 'video', 'archive']:
                counters[mime] += 1
                if mime == 'directory':
                    share_dirs_mapping[source_path] = target_path
                else:
                    share_files_mapping[source_path] = target_path

        # Remove directories if other files from them exists in input paths
        exclude = []
        for dir_name in share_dirs_mapping.keys():
            for patch in share_files_mapping.keys():
                if dir_name in patch:
                    exclude.append(dir_name)
                    break

        for excluded_dir in exclude:
            del share_dirs_mapping[excluded_dir]

        counters['directory'] = len(share_dirs_mapping.keys())

    return (counters, share_dirs_mapping, share_files_mapping)


'''
    Check file set on valid
    Valid if:
        1 video, 0 images and 0 dirs (interpolation mode)
        1 archive, 0 images and 0 dirs (annotation mode)
        Many images or many dirs with images (annotation mode), 0 archives and 0 videos
'''
def _valid_file_set(counters):
    if (counters['image'] or counters['directory']) and (counters['video'] or counters['archive']):
        return False
    elif counters['video'] > 1 or (counters['video'] and (counters['archive'] or counters['image'] or counters['directory'])):
        return False
    elif counters['archive'] > 1 or (counters['archive'] and (counters['video'] or counters['image'] or counters['directory'])):
        return False

    return True


'''
    Copy data from share to local
'''
def _copy_data_from_share(share_files_mapping, share_dirs_mapping):
    for source_path in share_dirs_mapping:
        copy_tree(source_path, share_dirs_mapping[source_path])
    for source_path in share_files_mapping:
        target_path = share_files_mapping[source_path]
        target_dir = os.path.dirname(target_path)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
        shutil.copyfile(source_path, target_path)


'''
    Find and unpack archive in upload dir
'''
def _find_and_unpack_archive(upload_dir):
    archive = None
    for root, _, files in os.walk(upload_dir):
        fullnames = map(lambda f: os.path.join(root, f), files)
        archives = list(filter(lambda x: _get_mime(x) == 'archive', fullnames))
        if len(archives):
            archive = archives[0]
            break
    if archive:
        Archive(archive).extractall(upload_dir)
        os.remove(archive)
    else:
        raise Exception('Type defined as archive, but archives were not found.')

    return archive


'''
    Search a video in upload dir and split it by frames. Copy frames to target dirs
'''
def _find_and_extract_video(upload_dir, output_dir, db_task, compress_quality, flip_flag, job):
    video = None
    for root, _, files in os.walk(upload_dir):
        fullnames = map(lambda f: os.path.join(root, f), files)
        videos = list(filter(lambda x: _get_mime(x) == 'video', fullnames))
        if len(videos):
            video = videos[0]
            break

    if video:
        job.meta['status'] = 'Video is being extracted..'
        job.save_meta()
        extractor = _FrameExtractor(video, compress_quality, flip_flag)
        for frame, image_orig_path in enumerate(extractor):
            image_dest_path = _get_frame_path(frame, output_dir)
            db_task.size += 1
            dirname = os.path.dirname(image_dest_path)
            if not os.path.exists(dirname):
                os.makedirs(dirname)
            shutil.copyfile(image_orig_path, image_dest_path)
    else:
        raise Exception("Video files were not found")

    return video


'''
    Recursive search for all images in upload dir and compress it to RGB jpg with specified quality. Create symlinks for them.
'''
def _find_and_compress_images(upload_dir, output_dir, db_task, compress_quality, flip_flag, job):
    filenames = []
    for root, _, files in os.walk(upload_dir):
        fullnames = map(lambda f: os.path.join(root, f), files)
        images = filter(lambda x: _get_mime(x) == 'image', fullnames)
        filenames.extend(images)
    filenames.sort()

    if len(filenames):
        for idx, name in enumerate(filenames):
            job.meta['status'] = 'Images are being compressed.. {}%'.format(idx * 100 // len(filenames))
            job.save_meta()
            compressed_name = os.path.splitext(name)[0] + '.jpg'
            image = Image.open(name).convert('RGB')
            if flip_flag:
                image = image.transpose(Image.ROTATE_180)
            image.save(compressed_name, quality=compress_quality, optimize=True)
            image.close()
            if compressed_name != name:
                os.remove(name)
                # PIL::save uses filename in order to define image extension.
                # We need save it as jpeg for compression and after rename the file
                # Else annotation file will contain invalid file names (with other extensions)
                os.rename(compressed_name, name)

        for frame, image_orig_path in enumerate(filenames):
            image_dest_path = _get_frame_path(frame, output_dir)
            image_orig_path = os.path.abspath(image_orig_path)
            db_task.size += 1
            dirname = os.path.dirname(image_dest_path)
            if not os.path.exists(dirname):
                os.makedirs(dirname)
            os.symlink(image_orig_path, image_dest_path)
    else:
        raise Exception("Image files were not found")

    return filenames

def _save_task_to_db(db_task, task_params):
    db_task.overlap = min(db_task.size, task_params['overlap'])
    db_task.mode = task_params['mode']
    db_task.z_order = task_params['z_order']
    db_task.flipped = task_params['flip']
    db_task.source = task_params['data']

    segment_step = task_params['segment'] - db_task.overlap
    for x in range(0, db_task.size, segment_step):
        start_frame = x
        stop_frame = min(x + task_params['segment'] - 1, db_task.size - 1)
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

    parsed_labels = _parse_labels(task_params['labels'])
    for label in parsed_labels:
        db_label = models.Label()
        db_label.task = db_task
        db_label.name = label
        db_label.save()

        for attr in parsed_labels[label]:
            db_attrspec = models.AttributeSpec()
            db_attrspec.label = db_label
            db_attrspec.text = parsed_labels[label][attr]['text']
            db_attrspec.save()

    db_task.save()


@transaction.atomic
def _create_thread(tid, params):
    def raise_exception(images, dirs, videos, archives):
        raise Exception('Only one archive, one video or many images can be dowloaded simultaneously. \
            {} image(s), {} dir(s), {} video(s), {} archive(s) found'.format(images, dirs, videos, archives))

    slogger.glob.info("create task #{}".format(tid))
    job = rq.get_current_job()

    db_task = models.Task.objects.select_for_update().get(pk=tid)
    upload_dir = db_task.get_upload_dirname()
    output_dir = db_task.get_data_dirname()

    counters, share_dirs_mapping, share_files_mapping = _prepare_paths(
        params['SOURCE_PATHS'],
        params['TARGET_PATHS'],
        params['storage']
    )

    if (not _valid_file_set(counters)):
        raise Exception('Only one archive, one video or many images can be dowloaded simultaneously. \
            {} image(s), {} dir(s), {} video(s), {} archive(s) found'.format(
                counters['image'],
                counters['directory'],
                counters['video'],
                counters['archive']
            )
        )

    if params['storage'] == 'share':
        job.meta['status'] = 'Data are being copied from share..'
        job.save_meta()
        _copy_data_from_share(share_files_mapping, share_dirs_mapping)

    archive = None
    if counters['archive']:
        job.meta['status'] = 'Archive is being unpacked..'
        job.save_meta()
        archive = _find_and_unpack_archive(upload_dir)

    # Define task mode and other parameters
    task_params = {
        'mode': 'annotation' if counters['image'] or counters['directory'] or counters['archive'] else 'interpolation',
        'flip': params['flip_flag'].lower() == 'true',
        'z_order': params['z_order'].lower() == 'true',
        'compress': int(params.get('compress_quality', 50)),
        'segment': int(params.get('segment_size', sys.maxsize)),
        'labels': params['labels'],
    }
    task_params['overlap'] = int(params.get('overlap_size', 5 if task_params['mode'] == 'interpolation' else 0))
    task_params['overlap'] = min(task_params['overlap'], task_params['segment'] - 1)
    slogger.glob.info("Task #{} parameters: {}".format(tid, task_params))

    if task_params['mode'] == 'interpolation':
        video = _find_and_extract_video(upload_dir, output_dir, db_task,
            task_params['compress'], task_params['flip'], job)
        task_params['data'] = os.path.relpath(video, upload_dir)
    else:
        files =_find_and_compress_images(upload_dir, output_dir, db_task,
            task_params['compress'], task_params['flip'], job)
        if archive:
            task_params['data'] = os.path.relpath(archive, upload_dir)
        else:
            task_params['data'] = '{} images: {}, ...'.format(len(files),
                ", ".join([os.path.relpath(x, upload_dir) for x in files[0:2]]))

    slogger.glob.info("Founded frames {} for task #{}".format(db_task.size, tid))

    job.meta['status'] = 'Task is being saved in database'
    job.save_meta()
    _save_task_to_db(db_task, task_params)
