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
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.data_manager import TrackManager
from cvat.apps.engine.models import (Job, TrackedShape)
from cvat.apps.engine.serializers import (TrackedShapeSerializer)
from .tracker import RectangleTracker

from cvat.apps.engine import annotation, task
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.engine.annotation import put_task_data,patch_task_data
from tensorflow.python.client import device_lib

import django_rq
import fnmatch
import logging
import copy
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


def run_thread(task_id, model_path, label_mapping, threshold, split,
               start_of_image_list, end_of_image_list, split_size, is_cpu_instance,image_list):
    cmd = 'python3 /home/rush/cvat/cvat/apps/tf_annotation/run_inference.py "{}::{}::{}::{}::{}::{}::{}::{}::{}::{}"' \
        .format(task_id, model_path, label_mapping, threshold, split,
                start_of_image_list, end_of_image_list, split_size, is_cpu_instance, image_list)
    os.system(cmd)


def run_progress_thread(task_id, num_gpus):
    cmd = 'python3 /home/rush/cvat/cvat/apps/tf_annotation/progress_indicator_multi_gpu.py "{}::{}"' \
        .format(task_id, num_gpus)
    os.system(cmd)

def run_tensorflow_annotation(tid, image_list_length, labels_mapping, treshold, model_path):
    result = {}
    local_device_protos = device_lib.list_local_devices()
    num_gpus = len([x.name for x in local_device_protos if x.device_type == 'GPU'])
    print("model path",model_path)
    if "inference" in model_path:
        print("inside")
        model_path += ".pb"
    print("final", model_path)
    if not os.path.isfile(model_path):
        raise OSError('TF Annotation Model path does not point to a file.')
    # if not model_path.endswith("pb"):
    #     model_path += ""
    source_task_path = os.path.join(DATA_ROOT,"data", str(tid))
    job = rq.get_current_job()
    threads = []
    is_cpu_instance = 'no'
    db_task = TaskModel.objects.get(pk=tid)
        # Get image list
    image_list = FrameProvider(db_task.data)
    slogger.glob.info("images list run {}".format(image_list))
    if num_gpus == 0:
        # todo check if this supports multi cpus
        split_size = image_list_length
        is_cpu_instance = 'yes'
    else:
        split_size = image_list_length // num_gpus
    start = 0
    end = split_size
    if num_gpus == 0:
        end = -1
        t = threading.Thread(target=run_thread, args=(tid, model_path, labels_mapping, treshold, 0,
                                                      start, end, split_size, is_cpu_instance, image_list))
        t.start()
        threads.append(t)
    else:
        for i in range(num_gpus):
            if i == num_gpus - 1:
                end = -1
                t = threading.Thread(target=run_thread, args=(tid, model_path, labels_mapping, treshold, i,
                                                              start, end, split_size, is_cpu_instance, image_list))
            else:
                t = threading.Thread(target=run_thread, args=(tid, model_path, labels_mapping, treshold, i,
                                                              start, end, split_size, is_cpu_instance,image_list))
            start += split_size
            end += split_size
            t.start()
            threads.append(t)
    # Fire off progress tracking
    progress_thread = threading.Thread(target=run_progress_thread, args=(tid, num_gpus))
    progress_thread.start()
    for t in threads:
        t.join()

    # Once the GPUs are done, kill the progress indicator thread
    progress_thread.join(1)
    job.refresh()
    job.meta['progress'] = 96
    job.save_meta()
    job.save()

    output_files_paths = {}
    if num_gpus == 0:
        i = 0
        output_filename = 'output_{}.txt'.format(i)
        output_file_path = os.path.join(source_task_path, output_filename)
        while not os.path.isfile(output_file_path):
            time.sleep(3)
            # slogger.glob.info("run_tensorflow_annotation, waiting for file {}".format(output_file_path))
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
                # slogger.glob.info("run_tensorflow_annotation, waiting for file {}".format(output_file_path))
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
    slogger.glob.info("resulot: {}".format(result))
    slogger.glob.info("label mapping {}".format(labels_mapping))
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


def create_thread(tid, labels_mapping, user, tf_annotation_model_path, reset):
    try:
        TRESHOLD = 0.5
        # Init rq job
        job = rq.get_current_job()
        job.meta['progress'] = 0
        job.save_meta()
        # Get job indexes and segment length
        db_task = TaskModel.objects.get(pk=tid)
        # Get image list
        image_list = FrameProvider(db_task.data)

        # Run auto annotation by tf
        result = None
        slogger.glob.info("tf annotation with tensorflow framework for task {}".format(tid))
        result = run_tensorflow_annotation(tid, len(image_list), labels_mapping, TRESHOLD, tf_annotation_model_path)
        slogger.glob.info("tf annotations result {}".format(result))
        if result is None:
            slogger.glob.info('tf annotation for task {} canceled by user'.format(tid))
            return
        # Modify data format and save
        result = convert_to_cvat_format(result)
        serializer = LabeledDataSerializer(data=result)
        slogger.glob.info("serializer valid {}".format(serializer.is_valid(raise_exception=True)))
        if serializer.is_valid(raise_exception=True):
            if reset:
                put_task_data(tid, user, result)
            else:
                patch_task_data(tid, user, result, "create")
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
        print(request.body)
        print(request.body.decode('utf-8'))
        tids = json.loads(request.body.decode('utf-8'))
        print("tods",tids)
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

def create(request, tid, mid):
    slogger.glob.info('tf annotation create request for task {}'.format(tid))
    try:
        # format: {'car': 'automobile', 'truck': 'automobile'}
        # {tf_class_label_1: user_task_label_1, tf_class_label2: user_task_label_1}
        data = json.loads(request.body.decode('utf-8'))

        user_label_mapping = data["labels"]
        should_reset = data['reset']
        slogger.glob.info("user defined mapping {}".format(user_label_mapping))
        db_task = TaskModel.objects.get(pk=tid)

         
        db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
        db_labels = {db_label.id: db_label.name for db_label in db_labels}
        slogger.glob.info("db labels {}".format(db_labels))

        slogger.glob.info("tensorflow model id {} and type {}".format(mid, type(mid)))
        if int(mid) == 989898:
            should_reset = True
            tf_model_file_path = os.getenv('TF_ANNOTATION_MODEL_PATH')
            tf_annotation_labels = {
            "person": 1, "bicycle": 2, "car": 3, "motorcycle": 4, "airplane": 5,
            "bus": 6, "train": 7, "truck": 8, "boat": 9, "traffic_light": 10,
            "fire_hydrant": 11, "stop_sign": 13, "parking_meter": 14, "bench": 15,
            "bird": 16, "cat": 17, "dog": 18, "horse": 19, "sheep": 20, "cow": 21,
            "elephant": 22, "bear": 23, "zebra": 24, "giraffe": 25, "backpack": 27,
            "umbrella": 28, "handbag": 31, "tie": 32, "suitcase": 33, "frisbee": 34,
            "skis": 35, "snowboard": 36, "sports_ball": 37, "kite": 38, "baseball_bat": 39,
            "baseball_glove": 40, "skateboard": 41, "surfboard": 42, "tennis_racket": 43,
            "bottle": 44, "wine_glass": 46, "cup": 47, "fork": 48, "knife": 49, "spoon": 50,
            "bowl": 51, "banana": 52, "apple": 53, "sandwich": 54, "orange": 55, "broccoli": 56,
            "carrot": 57, "hot_dog": 58, "pizza": 59, "donut": 60, "cake": 61, "chair": 62,
            "couch": 63, "potted_plant": 64, "bed": 65, "dining_table": 67, "toilet": 70,
            "tv": 72, "laptop": 73, "mouse": 74, "remote": 75, "keyboard": 76, "cell_phone": 77,
            "microwave": 78, "oven": 79, "toaster": 80, "sink": 81, "refrigerator": 83,
            "book": 84, "clock": 85, "vase": 86, "scissors": 87, "teddy_bear": 88, "hair_drier": 89,
            "toothbrush": 90
            }

            labels_mapping = {}
            for key, labels in db_labels.items():
                if labels in tf_annotation_labels.keys():
                    labels_mapping[tf_annotation_labels[labels]] = key
        else:
            
            dl_model = AnnotationModel.objects.get(pk=mid)

            classes_file_path = dl_model.labelmap_file.name
            tf_model_file_path = dl_model.model_file.name
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

        queue = django_rq.get_queue('low')
        job_id = 'tf_annotation.create/{}'.format(str(tid))
        slogger.glob.info("tf custom job {}".format(job_id))
        job = queue.fetch_job(job_id)
        # slogger.glob.info("job enqueued {} status: {} is finished {} {}".format(job, job.is_started, job.is_finished,job.is_queued))
        # if job is not None
        if job is not None and (job.is_started or job.is_queued):
            raise Exception("The process is already running")
       
       
        if not len(labels_mapping.values()):
            raise Exception('No labels found for tf annotation')

        # Run tf annotation job
        queue.enqueue_call(func=create_thread,
                           args=(tid, labels_mapping, request.user, tf_model_file_path, should_reset),
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
        # jobold = queue.fetch_job('tf_annotation.createold/{}'.format(tid))
        if job is not None and 'cancel' in job.meta:
            return JsonResponse({'status':'finished'})
        # if jobold is not None and 'cancel' in jobold.meta:
        #     return JsonResponse({'status': 'finished'})
        # if job is None:
        #     job = jobold
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
        slogger.glob.info("cancel tf custom job {}".format(job))
        # slogger.glob.info("job info {} {}".format(job.meta, job.is_finished))
        # jobold = queue.fetch_job('tf_annotation.createold/{}'.format(tid))
        # slogger.glob.info("jcancel job  tfold {}".format(jobold))
        # slogger.glob.info("job old meta {}".format(jobold.meta))
        if job is None or job.is_finished or job.is_failed:
            # if jobold is None or jobold.is_finished or jobold.is_failed:
            raise Exception('Task is not being annotated currently')
        elif 'cancel' not in job.meta:
            slogger.glob.info("canceling annotation for custom model")
            job.meta['cancel'] = True
            # job.meta['status'] = 'unknown'
            slogger.glob.info("updated job status {}  meta: {}".format( job.is_finished, job.meta))
            job.save()
        # elif jobold is not None and 'cancel' not in jobold.meta:
        #     slogger.glob.info("canceling inference for default model")
        #     jobold.meta['cancel'] = True
        #     # jobold.meta['status'] = 'unknown'
        #     slogger.glob.info("updated job status {}: meta {}".format( jobold.is_finished, jobold.meta))

        #     jobold.save()

    except Exception as ex:
        try:
            slogger.task[tid].exception("cannot cancel tensorflow annotation for task #{}".format(tid), exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))

    return HttpResponse()


@login_required
@permission_required(perm=['engine.task.access'],
                     fn=objectgetter(TaskModel, 'tid'), raise_exception=True)
def tracking(request, tid):
    data = json.loads(request.body.decode('utf-8'))
    # slogger.glob.info("data {}".format(data))
    slogger.glob.info("tracking payload {}".format(data))
    tracking_job = data['trackinJob']
    job_id = data['jobId']
    track = tracking_job['track'] #already in server model
    # Start the tracking with the bounding box in this frame
    start_frame = tracking_job['startFrame']
    # Until track this bounding box until this frame (excluded)
    stop_frame = tracking_job['stopFrame']
    # Track the bounding boxes in images from this track
    # task = Job.objects.get(pk=job_id).segment.task
    slogger.glob.info("task {}".format(task))
    slogger.glob.info("temp task test")
    # If we in a large task this creates unnessary many shapes
    # We only need them between start_frame and stop_frame
    # tracking_job['track']['attributes'] = []
    # tracking_job['track']['shapes'][0]['attributes'] = []
    # shapes_of_track = TrackManager([tracking_job['track']]).to_shapes(
        # stop_frame)
    # first_frame_in_track = shapes_of_track[0]['frame']
    # slogger.glob.info("shapes of track {}".format(shapes_of_track))
    def shape_to_db(tracked_shape_on_wire):
        s = copy.copy(tracked_shape_on_wire)
        s.pop('group', 0)
        s.pop('attributes', 0)
        s.pop('label_id', 0)
        s.pop('byMachine', 0)
        s.pop('keyframe')
        return TrackedShape(**s)

    # This bounding box is used as a reference for tracking
    # start_shape = shape_to_db(shapes_of_track[start_frame-first_frame_in_track])
    # slogger.glob.info("start shape {}".format(start_shape))
    # Do the actual tracking and serializee back
    tracker = RectangleTracker()
    new_shapes, result = tracker.track_rectangles(job_id, track['shapes'][0]['points'], start_frame, stop_frame, track['label_id'])
    # new_shapes = [TrackedShapeSerializer(s).data for s in new_shapes]

    # Pack recognized shape in a track onto the wire
    track_with_new_shapes = copy.copy(track)
    track_with_new_shapes['shapes'] = new_shapes
    reset= False
    result = convert_to_cvat_format(result)
    serializer = LabeledDataSerializer(data=result)
    print("serializing tracked points")
    print(serializer.is_valid(raise_exception=True))
    if serializer.is_valid(raise_exception=True):
        if reset:
            put_task_data(tid, request.user, result)
        else:
            patch_task_data(tid, request.user, result, "create")
    print("tracking done")
    return HttpResponse()