import csv
import os
import re
import sys
import shlex
import logging
import shutil
import tempfile
from io import StringIO
from PIL import Image
from traceback import print_exception

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
from .logging import task_logger, job_logger

global_logger = logging.getLogger(__name__)

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
        db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
        attributes = {}
        for db_label in db_labels:
            attributes[db_label.id] = {}
            for db_attrspec in db_label.attributespec_set.all():
                attributes[db_label.id][db_attrspec.id] = db_attrspec.text
        db_segments = list(db_task.segment_set.prefetch_related('job_set').all())
        segment_length = max(db_segments[0].stop_frame - db_segments[0].start_frame + 1, 1)
        job_indexes = [segment.job_set.first().id for segment in db_segments]

        response = {
            "status": db_task.status.capitalize(),
            "spec": {
                "labels": { db_label.id:db_label.name for db_label in db_labels },
                "attributes": attributes
            },
            "size": db_task.size,
            "blowradius": 0,
            "taskid": db_task.id,
            "name": db_task.name,
            "mode": db_task.mode,
            "segment_length": segment_length,
            "jobs": job_indexes,
            "overlap": db_task.overlap
        }
    else:
        raise Exception("Cannot find the task: {}".format(tid))

    return response

def get_job(jid):
    """Get the job as dictionary of attributes"""
    db_job = models.Job.objects.select_related("segment__task").get(id=jid)
    if db_job:
        db_segment = db_job.segment
        db_task = db_segment.task
        db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
        attributes = {}
        for db_label in db_labels:
            attributes[db_label.id] = {}
            for db_attrspec in db_label.attributespec_set.all():
                attributes[db_label.id][db_attrspec.id] = db_attrspec.text

        response = {
            "status": db_task.status.capitalize(),
            "labels": { db_label.id:db_label.name for db_label in db_labels },
            "stop": db_segment.stop_frame,
            "blowradius": 0,
            "taskid": db_task.id,
            "slug": db_task.name,
            "jobid": jid,
            "start": db_segment.start_frame,
            "mode": db_task.mode,
            "overlap": db_task.overlap,
            "attributes": attributes,
        }
    else:
        raise Exception("Cannot find the job: {}".format(jid))

    return response

def is_task_owner(user, tid):
    try:
        return user == models.Task.objects.get(pk=tid).owner or \
            user.groups.filter(name='admin').exists()
    except:
        return False

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
    parsed_labels = {}

    last_label = ""
    for token in shlex.split(labels):
        if token[0] != "~" and token[0] != "@":
            if token in parsed_labels:
                raise ValueError("labels string is not corect. " + 
                    "`{}` label is specified at least twice.".format(token))

            parsed_labels[token] = {}
            last_label = token
        else:
            match = re.match(r'^([~@])(\w+)=(\w+):(.+)$', token)
            prefix = match.group(1)
            atype = match.group(2)
            aname = match.group(3)
            values = list(csv.reader(StringIO(match.group(4)), quotechar="'"))[0]
            attr = {'prefix':prefix, 'name':aname, 'type':atype, 'values':values, 'text':token}

            if not attr['type'] in ['checkbox', 'radio', 'number', 'text', 'select']:
                raise ValueError("labels string is not corect. " +
                    "`{}` attribute has incorrect type {}.".format(
                    attr['name'], attr['type']))

            if attr['name'] in parsed_labels[last_label]:
                raise ValueError("labels string is not corect. " + 
                    "`{}` attribute is specified at least twice.".format(attr['name']))

            if attr['type'] == 'checkbox': # <prefix>checkbox=name:true/false
                if not (len(values) == 1 and values[0] in ['true', 'false']):
                    raise ValueError("labels string is not corect. " +
                        "`{}` attribute has incorrect value.".format(attr['name']))
            elif attr['type'] == 'number': # <prefix>number=name:min,max,step
                if not (len(values) == 3 and values[0].isdigit() and \
                    values[1].isdigit() and values[2].isdigit() and \
                    int(values[0]) < int(values[1])):
                    raise ValueError("labels string is not corect. " +
                        "`{}` attribute has incorrect format.".format(attr['name']))

            parsed_labels[last_label][attr['name']] = attr

    return parsed_labels

def _parse_db_labels(db_labels):
    result = []
    for db_label in db_labels:
        result += [db_label.name]
        result += [attr.text for attr in db_label.attributespec_set.all()]
    return _parse_labels(" ".join(result))

@transaction.atomic
def _create_thread(tid, params):
    # TODO: Improve a function logic. Need filter paths from a share storage before their copy to the server
    db_task = db_task = models.Task.objects.select_for_update().get(pk=tid)

    upload_dir = db_task.get_upload_dirname()
    output_dir = db_task.get_data_dirname()

    with open(db_task.get_log_path(), 'w') as log_file:
        storage = params['storage']
        mode = 'annotation'

        for source_path, target_path in zip(params['SOURCE_PATHS'], params['TARGET_PATHS']):
            filepath = target_path if storage == 'local' else source_path
            mime = _get_mime(filepath)
            if mime == 'empty':
                continue

            if mime == 'video':
                mode = 'interpolation'
            else:
                mode = 'annotation'

            if len(params['TARGET_PATHS']) > 1 and (mime == 'video' or mime == 'archive'):
                for tmp_path in params['SOURCE_PATHS']:
                    if tmp_path not in filepath:
                        raise Exception('Only images can be loaded in plural quantity. {} was found'.format(mime.capitalize()))

            if storage == 'share' and not os.path.exists(target_path):
                if mime == 'directory':
                    copy_tree(source_path, os.path.join(upload_dir, os.path.basename(source_path)))
                else:
                    dirname = os.path.dirname(target_path)
                    if not os.path.exists(dirname):
                        os.makedirs(dirname)
                    shutil.copyfile(source_path, target_path)

            if mime == 'archive':
                Archive(target_path).extractall(upload_dir)
                os.remove(target_path)

        flip_flag = params['flip_flag'].lower() == 'true'
        compress_quality = int(params.get('compress_quality', 50))

        if mode == 'interpolation':
            # Last element in params['TARGET_PATHS'] must contain video due to a sort by path len above
            # Early elements (if exist) contain parent dirs for video
            extractor = _FrameExtractor(params['TARGET_PATHS'][-1], compress_quality, flip_flag)
            for frame, image_orig_path in enumerate(extractor):
                image_dest_path = _get_frame_path(frame, output_dir)
                db_task.size += 1
                dirname = os.path.dirname(image_dest_path)
                if not os.path.exists(dirname):
                    os.makedirs(dirname)
                shutil.copyfile(image_orig_path, image_dest_path)
        else:
            extensions = ['.jpg', '.png', '.bmp', '.jpeg']
            filenames = []
            for root, _, files in os.walk(upload_dir):
                fullnames = map(lambda f: os.path.join(root, f), files)
                filtnames = filter(lambda f: os.path.splitext(f)[1].lower() \
                    in extensions, fullnames)
                filenames.extend(filtnames)
            filenames.sort()

            # Compress input images
            compressed_names = []
            for name in filenames:
                compressed_name = os.path.splitext(name)[0] + '.jpg'
                image = Image.open(name)
                image = image.convert('RGB')
                image.save(compressed_name, quality=compress_quality, optimize=True)
                compressed_names.append(compressed_name)
                if compressed_name != name:
                    os.remove(name)
            filenames = compressed_names

            if not filenames:
                raise Exception("No files ending with {}".format(extensions))
            for frame, image_orig_path in enumerate(filenames):
                image_dest_path = _get_frame_path(frame, output_dir)
                image_orig_path = os.path.abspath(image_orig_path)
                if flip_flag:
                    image = Image.open(image_orig_path)
                    image = image.transpose(Image.ROTATE_180)
                    image.save(image_orig_path)
                db_task.size += 1
                dirname = os.path.dirname(image_dest_path)
                if not os.path.exists(dirname):
                    os.makedirs(dirname)
                os.symlink(image_orig_path, image_dest_path)
            log_file.write("Formatted {0} images\n".format(len(filenames)))

        default_segment_length = sys.maxsize    # greather then any task size. Default split by segments disabled.
        segment_length = int(params.get('segment_size', default_segment_length))
        global_logger.info("segment length for task #{} is {}".format(db_task.id, segment_length))

        if mode == 'interpolation':
            default_overlap = 5
        else:
            default_overlap = 0

        overlap = min(int(params.get('overlap_size', default_overlap)), segment_length - 1)
        db_task.overlap = min(db_task.size, overlap)
        global_logger.info("segment overlap for task #{} is {}".format(db_task.id, db_task.overlap))

        segment_step = segment_length - db_task.overlap
        for x in range(0, db_task.size, segment_step):
            start_frame = x
            stop_frame = min(x + segment_length - 1, db_task.size - 1)
            global_logger.info("new segment for task #{}: start_frame = {}, stop_frame = {}".format(db_task.id, start_frame, stop_frame))
            db_segment = models.Segment()
            db_segment.task = db_task
            db_segment.start_frame = start_frame
            db_segment.stop_frame = stop_frame
            db_segment.save()

            db_job = models.Job()
            db_job.segment = db_segment
            db_job.save()

        global_logger.info("labels with attributes for task #{} is {}".format(
            db_task.id, params['labels']))
        parsed_labels = _parse_labels(params['labels'])
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

    db_task.mode = mode
    db_task.save()
