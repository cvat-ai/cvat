
# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT


from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from rest_framework.decorators import api_view
from rules.contrib.views import permission_required, objectgetter
from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.auto_annotation.models import AnnotationModel
from cvat.apps.engine.frame_provider import FrameProvider

from cvat.apps.engine.annotation import put_task_data, patch_task_data
from tensorflow.python.client import device_lib
from cvat.settings.base import DATA_ROOT

from tensorflow.python.client import device_lib
import django_rq
import fnmatch
import json
import os
import rq

import numpy as np

from cvat.apps.engine.log import slogger
import sys
sys.path.append(os.environ.get('AUTO_SEGMENTATION_PATH')) 
from mrcnn.config import Config
import skimage.io
from skimage.measure import find_contours, approximate_polygon

class CocoConfig(Config):
	"""Configuration for training on MS COCO.
	Derives from the base Config class and overrides values specific
	to the COCO dataset.
   
	"""
	# Give the configuration a recognizable name
	NAME = "cvat"
	STEPS_PER_EPOCH = 200

def load_image_into_numpy(image):
	(im_width, im_height) = image.size
	return np.array(image.getdata()).reshape((im_height, im_width, 3)).astype(np.uint8)


def run_tensorflow_auto_segmentation(image_list, labels_mapping, treshold, model_path, num_c):
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
	# sys.path.append(os.path.join(ROOT_DIR, "samples/coco/"))  # To find local version
	# import coco

	# Directory to save logs and trained model
	MODEL_DIR = os.path.join(ROOT_DIR, "logs")
	slogger.glob.info("running segmentation infernece using {}".format(model_path))
	if "mask" in model_path.lower() and not model_path.endswith("h5"):
		model_path = os.path.join(model_path,"mask_rcnn_coco.h5")
	# Local path to trained weights file
	# COCO_MODEL_PATH = os.path.join(ROOT_DIR, "mask_rcnn_coco.h5")
	slogger.glob.info("final sementation model path {}".format(model_path))
	COCO_MODEL_PATH = model_path
	if COCO_MODEL_PATH is None:
		raise OSError('Model path env not found in the system.')
	job = rq.get_current_job()

	## CONFIGURATION
	#local_device_protos = device_lib.list_local_devices()
	#num_gpus = len([x.name for x in local_device_protos if x.device_type == 'GPU'])

	class InferenceConfig(CocoConfig):
		# Set batch size to 1 since we'll be running inference on
		# one image at a time. Batch size = GPU_COUNT * IMAGES_PER_GPU
		GPU_COUNT = 1
		IMAGES_PER_GPU = 1
		NUM_CLASSES = num_c
		local_device_protos = device_lib.list_local_devices()
		num_gpus = len([x.name for x in local_device_protos if x.device_type == 'GPU'])
		if num_gpus in [2,4,8]:
			GPU_COUNT = num_gpus

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
	image_num = 0
	slogger.glob.info("imagelist {}".format(image_list))
	for images in zip(*[iter(image_list)]*config.GPU_COUNT):
		job.refresh()
		if 'cancel' in job.meta:
			del job.meta['cancel']
			job.save()
			return None
		job.meta['progress'] = image_num * 100 / len(image_list)
		job.save_meta()
		images_org = []
		slogger.glob.info("images {}".format(images))

		
		for i in range(config.GPU_COUNT):
			images_org.append(skimage.io.imread(images[i]))
		
		slogger.glob.info("images_org {}".format(images_org))


		# for multiple image detection, "batch size" must be equal to number of images
		res = model.detect(images_org)

		# r = r[0]
		# "r['rois'][index]" gives bounding box around the object
		# temp_img_num = image_num
		slogger.glob.info("res {}".format(res))

		for r in res:
			for index, c_id in enumerate(r['class_ids']):
				slogger.glob.info("cid in for {}".format(c_id))
				if c_id in labels_mapping.keys():
					if r['scores'][index] >= treshold:
						mask = _convert_to_int(r['masks'][:,:,index])
						segmentation = _convert_to_segmentation(mask)
						label = labels_mapping[c_id]
						if label not in result:
							result[label] = []
						result[label].append(
							[image_num, segmentation])
			image_num += 1
		slogger.glob.info("result {}".format(result))
		slogger.glob.info("l;abel mapping {}".format(labels_mapping))


	return result


def make_image_list(path_to_data):
	def get_image_key(item):
		return int(os.path.splitext(os.path.basename(item))[0])

	image_list = []
	for root, dirnames, filenames in os.walk(path_to_data):
		for filename in fnmatch.filter(filenames, '*.png') + fnmatch.filter(filenames, '*.jpg') + fnmatch.filter(filenames, '*.jpeg'):
			image_list.append(os.path.join(root, filename))

	image_list.sort()
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

def create_thread(tid, labels_mapping, user, model_path, num_c, reset):
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
		# image_list = make_image_list(db_task.get_data_dirname())
		# image_list = FrameProvider(db_task.data)
		slogger.glob.info("getting data from DATA_ROOT: {}".format(DATA_ROOT))
		path_to_task_data = os.path.join(DATA_ROOT,"data",str(tid),'raw')
		image_list = make_image_list(path_to_task_data)
		# Run auto segmentation by tf
		result = None
		slogger.glob.info("auto segmentation with tensorflow framework for task {}".format(tid))
		result = run_tensorflow_auto_segmentation(image_list, labels_mapping, TRESHOLD, model_path, num_c)

		if result is None:
			slogger.glob.info('auto segmentation for task {} canceled by user'.format(tid))
			return

		# Modify data format and save
		result = convert_to_cvat_format(result)
		serializer = LabeledDataSerializer(data = result)
		slogger.glob.info("serializer valid segmentation {}".format(serializer.is_valid(raise_exception=True)))
		if serializer.is_valid(raise_exception=True):
			if reset:
				put_task_data(tid, user, result)
			else:
				patch_task_data(tid, user, result, "create")
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
def create(request, tid, mid):
	slogger.glob.info('auto segmentation create request for task {}'.format(tid))
	try:
		data = json.loads(request.body.decode('utf-8'))
		slogger.glob.info("segmentation model id {}".format(mid))
		slogger.glob.info("payload from the request {}".format(data))
		user_label_mapping = data["labels"]	
		should_reset = data['reset']
		slogger.glob.info("user label mapping {}".format(user_label_mapping))	

		db_task = TaskModel.objects.get(pk=tid)
		db_labels = db_task.label_set.prefetch_related('attributespec_set').all()
		db_labels = {db_label.id:db_label.name for db_label in db_labels}
		slogger.glob.info("db labels {}".format(db_labels))

		#load model and classes
		if int(mid) == 989898:
			should_reset = True
			seg_model_file_path = os.getenv('AUTO_SEGMENTATION_PATH')
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
		else:
			dl_model = AnnotationModel.objects.get(pk=mid)
			classes_file_path = dl_model.labelmap_file.name
			seg_model_file_path = dl_model.model_file.name
			slogger.glob.info("reading segmentation label file {}".format(classes_file_path))
			auto_segmentation_labels = {"BG":0}
			with open(classes_file_path, "r") as f:
				data = f.readlines()
				# slogger.glob.info("class file data {}".format(data))
				for line in data[1:]:
					if "," not in line:
						continue
					# slogger.glob.info("classes line {}".format(line))
					label, num = line.strip().split(',')
					auto_segmentation_labels[label] = int(num.strip())
			labels_mapping = {}
			for auto_segmentation_label, mapped_task_label in user_label_mapping.items():
				for task_label_id, task_label_name in db_labels.items():
					if task_label_name == mapped_task_label:
						if auto_segmentation_label in auto_segmentation_labels.keys():
							labels_mapping[auto_segmentation_labels[auto_segmentation_label]] = task_label_id

		queue = django_rq.get_queue('low')
		job = queue.fetch_job('auto_segmentation.create/{}'.format(tid))
		slogger.glob.info("seg job {}".format(job))
		if job is not None and (job.is_started or job.is_queued):
			raise Exception("The process is already running")

		
		num_c = len(auto_segmentation_labels.keys())
		
		slogger.glob.info("label mapping {}".format(labels_mapping))
		if not len(labels_mapping.values()):
			raise Exception('No labels found for auto segmentation')

		# Run auto segmentation job
		queue.enqueue_call(func=create_thread,
			args=(tid, labels_mapping, request.user, seg_model_file_path, num_c, should_reset),
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
		# jobold = queue.fetch_job('auto_segmentation.createold/{}'.format(tid))
		if job is not None and 'cancel' in job.meta:
			return JsonResponse({'status':'finished'})
		# if jobold is not None and 'cancel' in jobold.meta:
		# 	return JsonResponse({'status': 'finished'})
		# if job is None:
		# 	job = jobold
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
		# jobold = queue.fetch_job('auto_segmentation.createold/{}'.format(tid))
		slogger.glob.info("cancel semgnet job {}".format(job))
		# slogger.glob.info("cancel semgnet old job {}".format(jobold))
		if job is None or job.is_finished or job.is_failed:
			# if jobold is None or jobold.is_finished or jobold.is_failed:
			raise Exception('Task is not being segmented currently')
		elif 'cancel' not in job.meta:
			slogger.glob.info("semgnet custom model request cancelled")
			job.meta['cancel'] = True
			job.save()
		# elif jobold is not None and 'cancel' not in jobold.meta:
		# 	slogger.glob.info("segment default model request cancelled")
		# 	jobold.meta['cancel'] = True
		# 	jobold.save()

	except Exception as ex:
		try:
			slogger.task[tid].exception("cannot cancel tensorflow segmentation for task #{}".format(tid), exc_info=True)
		except Exception:
			pass
		return HttpResponseBadRequest(str(ex))

	return HttpResponse()