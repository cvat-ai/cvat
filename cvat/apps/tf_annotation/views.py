# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
import ast
import datetime
import threading
import time
from zipfile import ZipFile

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, QueryDict
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render
from rules.contrib.views import permission_required, objectgetter
from cvat.apps.authentication.decorators import login_required
from cvat.apps.auto_annotation.models import AnnotationModel
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine import annotation, task
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.engine.annotation import put_task_data
from tensorflow.python.client import device_lib

import django_rq
import fnmatch
import logging
import json
import os
import rq

import tensorflow as tf
import numpy as np

from PIL import Image
from cvat.apps.engine.log import slogger
from cvat.settings.base import DATA_ROOT


def load_image_into_numpy(image):
    (im_width, im_height) = image.size
    return np.array(image.getdata()).reshape((im_height, im_width, 3)).astype(np.uint8)


def run_inference_engine_annotation(image_list, labels_mapping, treshold):
    from cvat.apps.auto_annotation.inference_engine import make_plugin, make_network

    def _normalize_box(box, w, h, dw, dh):
        xmin = min(int(box[0] * dw * w), w)
        ymin = min(int(box[1] * dh * h), h)
        xmax = min(int(box[2] * dw * w), w)
        ymax = min(int(box[3] * dh * h), h)
        return xmin, ymin, xmax, ymax

    result = {}
    MODEL_PATH = os.environ.get('TF_ANNOTATION_MODEL_PATH')
    if MODEL_PATH is None:
        raise OSError('Model path env not found in the system.')

    plugin = make_plugin()
    network = make_network('{}.xml'.format(MODEL_PATH), '{}.bin'.format(MODEL_PATH))
    input_blob_name = next(iter(network.inputs))
    output_blob_name = next(iter(network.outputs))
    executable_network = plugin.load(network=network)
    job = rq.get_current_job()

    del network

    try:
        for image_num, im_name in enumerate(image_list):

            job.refresh()
            if 'cancel' in job.meta:
                del job.meta['cancel']
                job.save()
                return None
            job.meta['progress'] = image_num * 100 / len(image_list)
            job.save_meta()

            Image.MAX_IMAGE_PIXELS = None
            image = Image.open(im_name)
            width, height = image.size
            image.thumbnail((600, 600), Image.ANTIALIAS)
            dwidth, dheight = 600 / image.size[0], 600 / image.size[1]
            image = image.crop((0, 0, 600, 600))
            image_np = load_image_into_numpy(image)
            image_np = np.transpose(image_np, (2, 0, 1))
            prediction = \
                executable_network.infer(inputs={input_blob_name: image_np[np.newaxis, ...]})[output_blob_name][0][0]
            for obj in prediction:
                obj_class = int(obj[1])
                obj_value = obj[2]
                if obj_class and obj_class in labels_mapping and obj_value >= treshold:
                    label = labels_mapping[obj_class]
                    if label not in result:
                        result[label] = []
                    xmin, ymin, xmax, ymax = _normalize_box(obj[3:7], width, height, dwidth, dheight)
                    result[label].append([image_num, xmin, ymin, xmax, ymax])
    finally:
        del executable_network
        del plugin

    return result


def run_thread(task_id, model_path, label_mapping, threshold, split,
               start_of_image_list, end_of_image_list, split_size, is_cpu_instance):
    # todo figure out a non-hardcoded path
    cmd = 'python /home/django/cvat/apps/tf_annotation/run_inference.py "{}::{}::{}::{}::{}::{}::{}::{}::{}"' \
        .format(task_id, model_path, label_mapping, threshold, split,
                start_of_image_list, end_of_image_list, split_size, is_cpu_instance)
    os.system(cmd)


def run_progress_thread(task_id, num_gpus):
    # todo figure out a non-hardcoded path
    cmd = 'python /home/django/cvat/apps/tf_annotation/progress_indicator_multi_gpu.py "{}::{}"' \
        .format(task_id, num_gpus)
    os.system(cmd)

def run_tensorflow_annotation(tid, image_list_length, labels_mapping, treshold, model_path):
    result = {}
    local_device_protos = device_lib.list_local_devices()
    num_gpus = len([x.name for x in local_device_protos if x.device_type == 'GPU'])
    if not os.path.isfile(model_path):
        raise OSError('TF Annotation Model path does not point to a file.')
    source_task_path = os.path.join(DATA_ROOT, str(tid))
    job = rq.get_current_job()
    threads = []
    is_cpu_instance = 'no'
    if num_gpus == 0:
        split_size = image_list_length
        is_cpu_instance = 'yes'
    else:
        split_size = image_list_length // num_gpus
    start = 0
    end = split_size
    if num_gpus == 0:
        end = -1
        t = threading.Thread(target=run_thread, args=(tid, model_path, labels_mapping, treshold, 0,
                                                      start, end, split_size, is_cpu_instance))
        t.start()
        threads.append(t)
    else:
        for i in range(num_gpus):
            if i == num_gpus - 1:
                end = -1
                t = threading.Thread(target=run_thread, args=(tid, model_path, labels_mapping, treshold, i,
                                                              start, end, split_size, is_cpu_instance))
            else:
                t = threading.Thread(target=run_thread, args=(tid, model_path, labels_mapping, treshold, i,
                                                              start, end, split_size, is_cpu_instance))
            start += split_size
            end += split_size
            t.start()
            threads.append(t)
    # Fire off progress tracking
    progress_thread = threading.Thread(target=run_progress_thread, args=(tid, num_gpus))
    progress_thread.start()
    threads.append(progress_thread)
    for t in threads:
        t.join()

    output_files_paths = {}
    if num_gpus == 0:
        i = 0
        output_filename = 'output_{}.txt'.format(i)
        output_file_path = os.path.join(source_task_path, output_filename)
        while not os.path.isfile(output_file_path):
            time.sleep(3)
            slogger.glob.info("run_tensorflow_annotation, waiting for file {}".format(output_file_path))
        data = ast.literal_eval(open(output_file_path, "r").read())
        for key, val in data.items():
            if key in result:
                result[key].extend(val)
            else:
                result[key] = val
        output_files_paths[output_filename] = output_file_path
    else:
        for i in range(num_gpus):
            output_filename = 'output_{}.txt'.format(i)
            output_file_path = os.path.join(source_task_path, output_filename)
            while not os.path.isfile(output_file_path):
                time.sleep(3)
                slogger.glob.info("run_tensorflow_annotation, waiting for file {}".format(output_file_path))
            data = ast.literal_eval(open(output_file_path, "r").read())
            for key, val in data.items():
                if key in result:
                    result[key].extend(val)
                else:
                    result[key] = val
            output_files_paths[output_filename] = output_file_path
    job.refresh()
    job.meta['progress'] = 97
    job.save_meta()
    job.save()
    job.refresh()
    if 'cancel' in job.meta:
        job.save()
        for _, output_file_path_for_zip in output_files_paths.items():
            os.remove(output_file_path_for_zip)
        return None
    time_now = datetime.datetime.today()
    zip_filename = "TF Annotation Results - " + time_now.strftime("%b %d %Y %H_%M_%S %p")
    output_files_zip_path = os.path.join(source_task_path, '{}.zip'.format(zip_filename))
    with ZipFile(output_files_zip_path, 'w') as output_zip:
        for output_filename, output_file_path_for_zip in output_files_paths.items():
            output_zip.write(filename=output_file_path_for_zip, arcname=output_filename)
    job.refresh()
    job.meta['progress'] = 98
    job.save_meta()
    # Remove output files once zipped
    for _, output_file_path_for_zip in output_files_paths.items():
        os.remove(output_file_path_for_zip)
    job.refresh()
    job.meta['progress'] = 99
    job.save_meta()

    continue_reading_progress = True
    progress_files_gone = {}
    while continue_reading_progress:
        # Clean up progress indicator files
        if num_gpus == 0:
            i = 0
            progress_filename = 'progress_{}.txt'.format(i)
            progress_file_path = os.path.join(source_task_path, progress_filename)
            if os.path.isfile(progress_file_path):
                file_lines = open(progress_file_path, "r").readlines()
                progress_status = file_lines[0].strip()
                if progress_status == 'FINISHED':
                    if os.path.isfile(progress_file_path):
                        os.remove(progress_file_path)
                        progress_files_gone[i] = True
                else:
                    time.sleep(1)
        else:
            for i in range(num_gpus):
                progress_filename = 'progress_{}.txt'.format(i)
                progress_file_path = os.path.join(source_task_path, progress_filename)
                if os.path.isfile(progress_file_path):
                    file_lines = open(progress_file_path, "r").readlines()
                    progress_status = file_lines[0].strip()
                    if progress_status == 'FINISHED':
                        if os.path.isfile(progress_file_path):
                            os.remove(progress_file_path)
                            progress_files_gone[i] = True
                    else:
                        time.sleep(1)
        continue_reading_progress = False
        for index, file_removed in progress_files_gone.items():
            if file_removed == False:
                continue_reading_progress = True
    return result


def make_image_list(path_to_data):
    def get_image_key(item):
        return int(os.path.splitext(os.path.basename(item))[0])

    image_list = []
    for root, dirnames, filenames in os.walk(path_to_data):
        for filename in fnmatch.filter(filenames, '*.jpg'):
            image_list.append(os.path.join(root, filename))

    image_list.sort(key=get_image_key)
    return image_list


def convert_to_cvat_format(data):
    result = {
        "tracks": [],
        "shapes": [],
        "tags": [],
        "version": 0,
    }

    for label in data:
        boxes = data[label]
        for box in boxes:
            result['shapes'].append({
                "type": "rectangle",
                "label_id": label,
                "frame": box[0],
                "points": [box[1], box[2], box[3], box[4]],
                "z_order": 0,
                "group": None,
                "occluded": False,
                "attributes": [],
            })

    return result


def create_thread(tid, labels_mapping, user, tf_annotation_model_path):
    try:
        TRESHOLD = 0.5
        # Init rq job
        job = rq.get_current_job()
        job.meta['progress'] = 0
        job.save_meta()
        # Get job indexes and segment length
        db_task = TaskModel.objects.get(pk=tid)
        # Get image list
        image_list = make_image_list(db_task.get_data_dirname())

        # Run auto annotation by tf
        result = None
        slogger.glob.info("tf annotation with tensorflow framework for task {}".format(tid))
        result = run_tensorflow_annotation(tid, len(image_list), labels_mapping, TRESHOLD, tf_annotation_model_path)
        if result is None:
            slogger.glob.info('tf annotation for task {} canceled by user'.format(tid))
            return
        # Modify data format and save
        result = convert_to_cvat_format(result)
        serializer = LabeledDataSerializer(data=result)
        if serializer.is_valid(raise_exception=True):
            put_task_data(tid, user, result)
        slogger.glob.info('tf annotation for task {} done'.format(tid))
    except Exception as ex:
        try:
            slogger.task[tid].exception('exception was occured during tf annotation of the task', exc_info=True)
        except:
            slogger.glob.exception('exception was occured during tf annotation of the task {}'.format(tid),
                                   exc_into=True)
        raise ex


@login_required
def get_meta_info(request):
    try:
        queue = django_rq.get_queue('low')
        tids = json.loads(request.body.decode('utf-8'))
        result = {}
        for tid in tids:
            job = queue.fetch_job('tf_annotation.create/{}'.format(tid))
            if job is not None:
                result[tid] = {
                    "active": job.is_queued or job.is_started,
                    "success": not job.is_failed
                }

        return JsonResponse(result)
    except Exception as ex:
        slogger.glob.exception('exception was occured during tf meta request', exc_into=True)
        return HttpResponseBadRequest(str(ex))


@login_required
@permission_required(perm=['engine.task.change'],
                     fn=objectgetter(TaskModel, 'tid'), raise_exception=True)
@permission_required(perm=["auto_annotation.model.access"],
                     fn=objectgetter(AnnotationModel, "mid"), raise_exception=True)
def create(request, tid, mid):
    slogger.glob.info('tf annotation create request for task {}'.format(tid))
    try:
        # format: {'car': 'automobile', 'truck': 'automobile'}
        # {tf_class_label_1: user_task_label_1, tf_class_label2: user_task_label_1}
        user_label_mapping = json.loads(request.body.decode('utf-8'))
        db_task = TaskModel.objects.get(pk=tid)
        dl_model = AnnotationModel.objects.get(pk=mid)

        classes_file_path = dl_model.classes_file.name
        tf_model_file_path = dl_model.tf_model_file.name

        queue = django_rq.get_queue('low')
        job_id = 'tf_annotation.create/{}'.format(str(tid))
        job = queue.fetch_job(job_id)
        if job is not None and (job.is_started or job.is_queued):
            raise Exception("The process is already running")
        db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
        db_labels = {db_label.id: db_label.name for db_label in db_labels}
        # Load and generate the tf annotation labels
        tf_annotation_labels = {}
        with open(classes_file_path, "r") as f:
            f.readline()  # First line is header
            line = f.readline().rstrip()
            cnt = 1
            while line:
                tf_annotation_labels[line] = cnt
                line = f.readline().rstrip()
                cnt += 1

        if len(tf_annotation_labels) == 0:
            raise Exception("No classes found in classes file.")

        labels_mapping = {}
        for tf_class_label, mapped_task_label in user_label_mapping.items():
            for task_label_id, task_label_name in db_labels.items():
                if task_label_name == mapped_task_label:
                    if tf_class_label in tf_annotation_labels.keys():
                        labels_mapping[tf_annotation_labels[tf_class_label]] = task_label_id
        if not len(labels_mapping.values()):
            raise Exception('No labels found for tf annotation')

        # Run tf annotation job
        queue.enqueue_call(func=create_thread,
                           args=(tid, labels_mapping, request.user, tf_model_file_path),
                           job_id=job_id,
                           timeout=604800)  # 7 days

        slogger.task[tid].info('tensorflow annotation job enqueued with labels {}'.format(labels_mapping))

    except Exception as ex:
        try:
            slogger.task[tid].exception("exception was occured during tensorflow annotation request", exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))

    return HttpResponse()


@login_required
@permission_required(perm=['engine.task.access'],
                     fn=objectgetter(TaskModel, 'tid'), raise_exception=True)
def check(request, tid):
    try:
        queue = django_rq.get_queue('low')
        job = queue.fetch_job('tf_annotation.create/{}'.format(tid))
        if job is not None and 'cancel' in job.meta:
            return JsonResponse({'status': 'finished'})
        data = {}
        if job is None:
            data['status'] = 'unknown'
        elif job.is_queued:
            data['status'] = 'queued'
        elif job.is_started:
            data['status'] = 'started'
            data['progress'] = job.meta['progress']
        elif job.is_finished:
            data['status'] = 'finished'
            job.delete()
        else:
            data['status'] = 'failed'
            data['stderr'] = job.exc_info
            job.delete()

    except Exception:
        data['status'] = 'unknown'

    return JsonResponse(data)


@login_required
@permission_required(perm=['engine.task.change'],
                     fn=objectgetter(TaskModel, 'tid'), raise_exception=True)
def cancel(request, tid):
    try:
        queue = django_rq.get_queue('low')
        job = queue.fetch_job('tf_annotation.create/{}'.format(tid))
        if job is None or job.is_finished or job.is_failed:
            raise Exception('Task is not being annotated currently')
        elif 'cancel' not in job.meta:
            job.meta['cancel'] = True
            job.save()

    except Exception as ex:
        try:
            slogger.task[tid].exception("cannot cancel tensorflow annotation for task #{}".format(tid), exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))

    return HttpResponse()