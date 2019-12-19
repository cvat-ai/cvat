
# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT


from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from rest_framework.decorators import api_view
from rules.contrib.views import permission_required, objectgetter
from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.engine.annotation import put_task_data

import django_rq
import fnmatch
import json
import os
import rq

import numpy as np

from cvat.apps.engine.log import slogger

import sys
import skimage.io
from skimage.measure import find_contours, approximate_polygon


def load_image_into_numpy(image):
    (im_width, im_height) = image.size
    return np.array(image.getdata()).reshape((im_height, im_width, 3)).astype(np.uint8)


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
    ROOT_DIR = os.environ.get('AUTO_SEGMENTATION_PATH')
    # Import Mask RCNN
    sys.path.append(ROOT_DIR)  # To find local version of the library
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

        image = skimage.io.imread(image_path)

        # for multiple image detection, "batch size" must be equal to number of images
        r = model.detect([image], verbose=1)

        r = r[0]
        # "r['rois'][index]" gives bounding box around the object
        for index, c_id in enumerate(r['class_ids']):
            if c_id in labels_mapping.keys():
                if r['scores'][index] >= treshold:
                    mask = _convert_to_int(r['masks'][:,:,index])
                    segmentation = _convert_to_segmentation(mask)
                    label = labels_mapping[c_id]
                    if label not in result:
                        result[label] = []
                    result[label].append(
                        [image_num, segmentation])

    return result


def make_image_list(path_to_data):
    def get_image_key(item):
        return int(os.path.splitext(os.path.basename(item))[0])

    image_list = []
    for root, _, filenames in os.walk(path_to_data):
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
        except Exception:
            slogger.glob.exception('exception was occured during auto segmentation of the task {}'.format(tid), exc_info=True)
        raise ex

@api_view(['POST'])
@login_required
def get_meta_info(request):
    try:
        queue = django_rq.get_queue('low')
        tids = request.data
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
        slogger.glob.exception('exception was occured during tf meta request', exc_info=True)
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
            "fire_hydrant": 11, "stop_sign": 12, "parking_meter": 13, "bench": 14,
            "bird": 15, "cat": 16, "dog": 17, "horse": 18, "sheep": 19, "cow": 20,
            "elephant": 21, "bear": 22, "zebra": 23, "giraffe": 24, "backpack": 25,
            "umbrella": 26, "handbag": 27, "tie": 28, "suitcase": 29, "frisbee": 30,
            "skis": 31, "snowboard": 32, "sports_ball": 33, "kite": 34, "baseball_bat": 35,
            "baseball_glove": 36, "skateboard": 37, "surfboard": 38, "tennis_racket": 39,
            "bottle": 40, "wine_glass": 41, "cup": 42, "fork": 43, "knife": 44, "spoon": 45,
            "bowl": 46, "banana": 47, "apple": 48, "sandwich": 49, "orange": 50, "broccoli": 51,
            "carrot": 52, "hot_dog": 53, "pizza": 54, "donut": 55, "cake": 56, "chair": 57,
            "couch": 58, "potted_plant": 59, "bed": 60, "dining_table": 61, "toilet": 62,
            "tv": 63, "laptop": 64, "mouse": 65, "remote": 66, "keyboard": 67, "cell_phone": 68,
            "microwave": 69, "oven": 70, "toaster": 71, "sink": 72, "refrigerator": 73,
            "book": 74, "clock": 75, "vase": 76, "scissors": 77, "teddy_bear": 78, "hair_drier": 79,
            "toothbrush": 80
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
        except Exception:
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
        except Exception:
            pass
        return HttpResponseBadRequest(str(ex))

    return HttpResponse()
