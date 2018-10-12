
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, QueryDict
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render
from django.contrib.auth.decorators import permission_required
from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine import annotation, task

import django_rq
import fnmatch
import logging
import json
import os
import rq

import tensorflow as tf
import numpy as np
from PIL import Image
from .log import slogger

def load_image_into_numpy(image):
    (im_width, im_height) = image.size
    return np.array(image.getdata()).reshape((im_height, im_width, 3)).astype(np.uint8)


def normalize_box(box, w, h):
    xmin = int(box[1] * w)
    ymin = int(box[0] * h)
    xmax = int(box[3] * w)
    ymax = int(box[2] * h)
    return xmin, ymin, xmax, ymax


def run_annotation(image_list, labels_mapping, treshold):
    result = {}
    model_path = os.environ.get('TF_ANNOTATION_MODEL_PATH')
    if model_path is None:
        raise OSError('Model path env not found in the system. Please check the installation manual.')
    job = rq.get_current_job()

    detection_graph = tf.Graph()
    with detection_graph.as_default():
        od_graph_def = tf.GraphDef()
        with tf.gfile.GFile(model_path, 'rb') as fid:
            serialized_graph = fid.read()
            od_graph_def.ParseFromString(serialized_graph)
            tf.import_graph_def(od_graph_def, name='')

        try:
            config = tf.ConfigProto()
            config.gpu_options.allow_growth=True
            sess = tf.Session(graph=detection_graph,config=config)
            for image_num, image_path in enumerate(image_list):
                job.refresh()
                if 'cancel' in job.meta:
                    del job.meta['cancel']
                    job.save()
                    return None
                job.meta['progress'] = image_num * 100 / len(image_list)
                job.save_meta()
                image = Image.open(image_path)
                width, height = image.size
                if width > 1920 or height > 1080:
                    image = image.resize((width // 2, height // 2), Image.ANTIALIAS)
                image_np = load_image_into_numpy(image)
                image_np_expanded = np.expand_dims(image_np, axis=0)

                image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
                boxes = detection_graph.get_tensor_by_name('detection_boxes:0')
                scores = detection_graph.get_tensor_by_name('detection_scores:0')
                classes = detection_graph.get_tensor_by_name('detection_classes:0')
                num_detections = detection_graph.get_tensor_by_name('num_detections:0')
                (boxes, scores, classes, num_detections) = sess.run([boxes, scores, classes, num_detections], feed_dict={image_tensor: image_np_expanded})

                for i in range(len(classes[0])):
                    if classes[0][i] in labels_mapping.keys():
                        if scores[0][i] >= treshold:
                            xmin, ymin, xmax, ymax = normalize_box(boxes[0][i], width, height)
                            label = labels_mapping[classes[0][i]]
                            if label not in result:
                                result[label] = []
                            result[label].append([image_num, xmin, ymin, xmax, ymax])
        finally:
            sess.close()
            del sess
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
        "boxes": [],
        "polygons": [],
        "polylines": [],
        "points": [],
        "box_paths": [],
        "polygon_paths": [],
        "polyline_paths": [],
        "points_paths": [],
    }
    for label in data:
        boxes = data[label]
        for box in boxes:
            result['boxes'].append({
                "label_id": label,
                "frame": box[0],
                "xtl": box[1],
                "ytl": box[2],
                "xbr": box[3],
                "ybr": box[4],
                "z_order": 0,
                "group_id": 0,
                "occluded": False,
                "attributes": []
            })

    return result


def create_thread(id, labels_mapping):
    try:
        TRESHOLD = 0.5
        # Init rq job
        job = rq.get_current_job()
        job.meta['progress'] = 0
        job.save_meta()
        # Get job indexes and segment length
        db_task = TaskModel.objects.get(pk=id)
        db_segments = list(db_task.segment_set.prefetch_related('job_set').all())
        segment_length = max(db_segments[0].stop_frame - db_segments[0].start_frame + 1, 1)
        job_indexes = [segment.job_set.first().id for segment in db_segments]
        # Get image list
        image_list = make_image_list(db_task.get_data_dirname())

        # Run auto annotation by tf
        result = run_annotation(image_list, labels_mapping, TRESHOLD)
        if result is None:
            slogger.glob.info('tf annotation for task {} canceled by user'.format(id))
            return

        # Modify data format and save
        result = convert_to_cvat_format(result)
        annotation.save_task(id, result)
        db_task.status = "Annotation"
        db_task.save()
        slogger.glob.info('tf annotation for task {} done'.format(id))
    except Exception:
        slogger.glob.exception('exception was occured during tf annotation of the task {}'.format(id))
        db_task.status = "TF Annotation Fault"
        db_task.save()

@login_required
@permission_required(perm=['engine.view_task', 'engine.change_annotation'], raise_exception=True)
def create(request, tid):
    slogger.glob.info('tf annotation create request for task {}'.format(tid))
    try:
        db_task = TaskModel.objects.get(pk=tid)
    except ObjectDoesNotExist:
        slogger.glob.exception('task with id {} not found'.format(tid))
        return HttpResponseBadRequest("A task with this ID was not found")

    if not task.is_task_owner(request.user, tid):
        slogger.glob.error('not enought of permissions for tf annotation of the task {}'.format(tid))
        return HttpResponseBadRequest("You don't have permissions to tf annotation of the task.")

    queue = django_rq.get_queue('low')
    job = queue.fetch_job('tf_annotation.create/{}'.format(tid))
    if job is not None and (job.is_started or job.is_queued):
        slogger.glob.error('tf annotation for task {} already running'.format(tid))
        return HttpResponseBadRequest("The process is already running")
    db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
    db_labels = {db_label.id:db_label.name for db_label in db_labels}

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

    if not len(labels_mapping.values()):
        slogger.glob.error('no labels found for task {} tf annotation'.format(tid))
        return HttpResponseBadRequest("No labels found for tf annotation")

    db_task.status = "TF Annotation"
    db_task.save()

    # Run tf annotation job
    queue.enqueue_call(func=create_thread,
        args=(tid, labels_mapping),
        job_id='tf_annotation.create/{}'.format(tid),
        timeout=604800)     # 7 days
    slogger.glob.info('tf annotation job enqueued for task {} with labels {}'.format(tid, labels_mapping))

    return HttpResponse()

@login_required
@permission_required(perm='engine.view_task', raise_exception=True)
def check(request, tid):
    queue = django_rq.get_queue('low')
    job = queue.fetch_job('tf_annotation.create/{}'.format(tid))
    if job is not None and 'cancel' in job.meta:
        return JsonResponse({'status': 'finished'})
    data = {}
    try:
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
            job.delete()
    except Exception:
        data['status'] = 'unknown'

    return JsonResponse(data)


@login_required
@permission_required(perm='engine.view_task', raise_exception=True)
def cancel(request, tid):
    try:
        queue = django_rq.get_queue('low')
        job = queue.fetch_job('tf_annotation.create/{}'.format(tid))
        if job is None or job.is_finished or job.is_failed:
            raise Exception('Task is not in tf annotation process')
        elif 'cancel' not in job.meta:
            job.meta['cancel'] = True
            job.save()
            db_task = TaskModel.objects.get(pk=tid)
            db_task.status = "Annotation"
            db_task.save()

    except Exception as ex:
        return HttpResponseBadRequest("TF annotation cancel error: {}".format(str(ex)))
    return HttpResponse()
