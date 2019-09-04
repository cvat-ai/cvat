
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, QueryDict
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render
from rules.contrib.views import permission_required, objectgetter
from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine import annotation, task
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.engine.annotation import put_task_data

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

import sys
import math
import skimage.io
from pycocotools import mask
from skimage.measure import find_contours, approximate_polygon


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
    MODEL_PATH = os.environ.get('Auto_Segmentation_MODEL_PATH')
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

            image = Image.open(im_name)
            width, height = image.size
            image.thumbnail((600, 600), Image.ANTIALIAS)
            dwidth, dheight = 600 / image.size[0], 600 / image.size[1]
            image = image.crop((0, 0, 600, 600))
            image_np = load_image_into_numpy(image)
            image_np = np.transpose(image_np, (2, 0, 1))
            prediction = executable_network.infer(inputs={input_blob_name: image_np[np.newaxis, ...]})[output_blob_name][0][0]
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


def run_tensorflow_auto_segmentation(image_list, labels_mapping, treshold):
    def _convert_to_int(boolean_mask):
        return boolean_mask.astype(np.uint8)

    def _convert_to_segmentation(mask):
        contours = find_contours(mask, 0.5)
        # only one contour exist in our case
        contour = contours[0]
        contour = np.flip(contour, axis=1)
        # Approximate the contour and reduce the number of points
        contour = approximate_polygon(contour, tolerance=2.5)
        segmentation = contour.ravel().tolist()
        return segmentation

    ## INITIALIZATION

    # Root directory of the project
    ROOT_DIR = os.environ.get('AUTO_SEGMENTATIONL_PATH')
    # Import Mask RCNN
    sys.path.append(ROOT_DIR)  # To find local version of the library
    from mrcnn import utils
    import mrcnn.model as modellib

    # Import COCO config
    sys.path.append(os.path.join(ROOT_DIR, "samples/coco/"))  # To find local version
    import coco

    # Directory to save logs and trained model
    MODEL_DIR = os.path.join(ROOT_DIR, "logs")

    # Local path to trained weights file
    COCO_MODEL_PATH = os.path.join(ROOT_DIR, "mask_rcnn_coco.h5")
    if COCO_MODEL_PATH is None:
        raise OSError('Model path env not found in the system.')
    job = rq.get_current_job()

    # Download COCO trained weights from Releases if needed
    if not os.path.exists(COCO_MODEL_PATH):
        utils.download_trained_weights(COCO_MODEL_PATH)
    job = rq.get_current_job()

    ## CONFIGURATION

    class InferenceConfig(coco.CocoConfig):
        # Set batch size to 1 since we'll be running inference on
        # one image at a time. Batch size = GPU_COUNT * IMAGES_PER_GPU
        GPU_COUNT = 1
        IMAGES_PER_GPU = 1

    # Print config details
    config = InferenceConfig()
    config.display()

    ## CREATE MODEL AND LOAD TRAINED WEIGHTS

    # Create model object in inference mode.
    model = modellib.MaskRCNN(mode="inference", model_dir=MODEL_DIR, config=config)
    # Load weights trained on MS-COCO
    model.load_weights(COCO_MODEL_PATH, by_name=True)

    ## RUN OBJECT DETECTION
    result = {}
    for image_num, image_path in enumerate(image_list):
        job.refresh()
        if 'cancel' in job.meta:
            del job.meta['cancel']
            job.save()
            return None
        job.meta['progress'] = image_num * 100 / len(image_list)
        job.save_meta()

        # for multiple image detection, "batch size" must be equal to number of images
        image = skimage.io.imread(image_path)
        r = model.detect([image], verbose=1)

        r = r[0]
        # "r['rois'][i]" gives bounding box around the object
        for i in range(len(r['class_ids'])):
            if r['class_ids'][i] in labels_mapping.keys():
                if r['scores'][i] >= treshold:
                    # xmin, ymin, xmax, ymax = _normalize_box(
                    #     boxes[0][i], width, height)
                    mask = _convert_to_int(r['masks'][:,:,i])
                    segmentation = _convert_to_segmentation(mask)
                    label = labels_mapping[r['class_ids'][i]]
                    if label not in result:
                        result[label] = []
                    result[label].append(
                        [image_num, segmentation])
        # break  # remove

    return result


def run_tensorflow_annotation(image_list, labels_mapping, treshold):
    def _normalize_box(box, w, h):
        xmin = int(box[1] * w)
        ymin = int(box[0] * h)
        xmax = int(box[3] * w)
        ymax = int(box[2] * h)
        return xmin, ymin, xmax, ymax

    result = {}
    model_path = os.environ.get('Auto_Segmentation_MODEL_PATH')
    if model_path is None:
        raise OSError('Model path env not found in the system.')
    job = rq.get_current_job()

    detection_graph = tf.Graph()
    with detection_graph.as_default():
        od_graph_def = tf.GraphDef()
        with tf.gfile.GFile(model_path + '.pb', 'rb') as fid:
            serialized_graph = fid.read()
            od_graph_def.ParseFromString(serialized_graph)
            tf.import_graph_def(od_graph_def, name='')

        try:
            config = tf.ConfigProto()
            config.gpu_options.allow_growth=True
            sess = tf.Session(graph=detection_graph, config=config)
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
                            xmin, ymin, xmax, ymax = _normalize_box(boxes[0][i], width, height)
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
        "tracks": [],
        "shapes": [],
        "tags": [],
        "version": 0,
    }

    for label in data:
        segments = data[label]
        for segment in segments:
            result['shapes'].append({
                "type": "polygon",
                "label_id": label,
                "frame": segment[0],
                "points": segment[1],
                "z_order": 0,
                "group": None,
                "occluded": False,
                "attributes": [],
            })

    return result

def create_thread(tid, labels_mapping, user):
    try:
        # If detected object accuracy bigger than threshold it will returend
        TRESHOLD = 0.5
        # Init rq job
        job = rq.get_current_job()
        job.meta['progress'] = 0
        job.save_meta()
        # Get job indexes and segment length
        db_task = TaskModel.objects.get(pk=tid)
        # Get image list
        image_list = make_image_list(db_task.get_data_dirname())

        # Run auto segmentation by tf
        result = None
        slogger.glob.info("auto segmentation with tensorflow framework for task {}".format(tid))
        result = run_tensorflow_auto_segmentation(image_list, labels_mapping, TRESHOLD)

        if result is None:
            slogger.glob.info('auto segmentation for task {} canceled by user'.format(tid))
            return

        # Modify data format and save
        result = convert_to_cvat_format(result)
        serializer = LabeledDataSerializer(data = result)
        if serializer.is_valid(raise_exception=True):
            put_task_data(tid, user, result)
        slogger.glob.info('auto segmentation for task {} done'.format(tid))
    except Exception as ex:
        try:
            slogger.task[tid].exception('exception was occured during auto segmentation of the task', exc_info=True)
        except:
            slogger.glob.exception('exception was occured during auto segmentation of the task {}'.format(tid), exc_into=True)
        raise ex

@login_required
def get_meta_info(request):
    try:
        queue = django_rq.get_queue('low')
        tids = json.loads(request.body.decode('utf-8'))
        result = {}
        for tid in tids:
            job = queue.fetch_job('auto_segmentation.create/{}'.format(tid))
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
def create(request, tid):
    slogger.glob.info('auto segmentation create request for task {}'.format(tid))
    try:
        db_task = TaskModel.objects.get(pk=tid)
        queue = django_rq.get_queue('low')
        job = queue.fetch_job('auto_segmentation.create/{}'.format(tid))
        if job is not None and (job.is_started or job.is_queued):
            raise Exception("The process is already running")

        db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
        db_labels = {db_label.id:db_label.name for db_label in db_labels}

        # COCO Labels
        auto_segmentation_labels = { "BG": 0,
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
            if labels in auto_segmentation_labels.keys():
                labels_mapping[auto_segmentation_labels[labels]] = key

        if not len(labels_mapping.values()):
            raise Exception('No labels found for auto segmentation')

        # Run auto segmentation job
        queue.enqueue_call(func=create_thread,
            args=(tid, labels_mapping, request.user),
            job_id='auto_segmentation.create/{}'.format(tid),
            timeout=604800)     # 7 days

        slogger.task[tid].info('tensorflow segmentation job enqueued with labels {}'.format(labels_mapping))

    except Exception as ex:
        try:
            slogger.task[tid].exception("exception was occured during tensorflow segmentation request", exc_info=True)
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
        job = queue.fetch_job('auto_segmentation.create/{}'.format(tid))
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
        job = queue.fetch_job('auto_segmentation.create/{}'.format(tid))
        if job is None or job.is_finished or job.is_failed:
            raise Exception('Task is not being segmented currently')
        elif 'cancel' not in job.meta:
            job.meta['cancel'] = True
            job.save()

    except Exception as ex:
        try:
            slogger.task[tid].exception("cannot cancel tensorflow segmentation for task #{}".format(tid), exc_info=True)
        except:
            pass
        return HttpResponseBadRequest(str(ex))

    return HttpResponse()
