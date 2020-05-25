import glob
import tensorflow as tf
from PIL import Image
import os, subprocess, sys
import threading
import numpy as np
import json
import ast
import cv2
import fnmatch
import django_rq
from cvat.settings.base import DATA_ROOT




def load_image_into_numpy(image):
		(im_width, im_height) = image.size
		return np.array(image.getdata()).reshape((im_height, im_width, 3)).astype(np.uint8)


def run_tf_model(task_id_tf, model_path_tf, label_mapping_tf, threshold_tf,
								 split_tf, start_of_image_list_tf, end_of_image_list_tf, split_size):
		def _normalize_box(box, w, h):
				xmin = int(box[1] * w)
				ymin = int(box[0] * h)
				xmax = int(box[3] * w)
				ymax = int(box[2] * h)
				return xmin, ymin, xmax, ymax
		print("running run_infrence")
		# from cvat.apps.engine.frame_provider import FrameProvider

		# from cvat.apps.engine.models import Task as TaskModel
	 
		source_task_path = os.path.join(DATA_ROOT,"data", str(task_id_tf))
		path_to_task_data = os.path.join(DATA_ROOT,"data",task_id_tf,'raw')
		image_list_all = make_image_list(path_to_task_data)
	
		print("images list inside run inference", image_list_all)
		# image_list_all = images_list
		start_of_image_list_tf = int(start_of_image_list_tf)
		end_of_image_list_tf = int(end_of_image_list_tf)
		detection_graph = tf.Graph()
		with detection_graph.as_default():
				od_graph_def = tf.GraphDef()
				with tf.gfile.GFile(model_path_tf, 'rb') as fid:
						serialized_graph = fid.read()
						od_graph_def.ParseFromString(serialized_graph)
						tf.import_graph_def(od_graph_def, name='')

				try:
						config = tf.ConfigProto()
						config.gpu_options.allow_growth=True
						sess = tf.Session(graph=detection_graph, config=config)
						result = {}
						# print(start_of_image_list, end_of_image_list)
						image_list_chunk = image_list_all[start_of_image_list_tf:]
						# slogger.glob.info("image list chunk")
						if end_of_image_list_tf > 0:
								image_list_chunk = image_list_all[start_of_image_list_tf:end_of_image_list_tf]
						progress_indicator_start = 0
						progress_indicator_end = len(image_list_chunk)
						# print(image_list_chunk)
						for image_num, image_path in enumerate(image_list_chunk):
								
								if int(split_tf) > 0:
										image_num = image_num + split_tf * int(split_size)
								if image_path in image_list_all:

										queue = django_rq.get_queue('low')
										job = queue.fetch_job('tf_annotation.create/{}'.format(task_id_tf))
										if 'cancel' in job.meta:
												job.save()
												break
										Image.MAX_IMAGE_PIXELS = None
										# print("reading image {}".format(image_path))
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
										(boxes, scores, classes, num_detections) = sess.run([boxes, scores, classes, num_detections], feed_dict={image_tensor:image_np_expanded})
										for i in range(len(classes[0])):
												if classes[0][i] in label_mapping_tf.keys():
														if scores[0][i] >= threshold_tf:
																xmin, ymin, xmax, ymax = _normalize_box(boxes[0][i], width, height)
																label = label_mapping_tf[classes[0][i]]
																if label not in result:
																		result[label] = []
																result[label].append([image_num, xmin, ymin, xmax, ymax])
										# Write the first progress file
										if progress_indicator_start == 0:
												progress_indicator_file_path = os.path.join(source_task_path, 'progress_{}.txt'.format(split_tf))
												with open(progress_indicator_file_path, 'w') as outfile:
														outfile.writelines(['PROGRESS\n' '0\n'])
										progress_indicator_start += 1
										if progress_indicator_start % 50:
												progress_indicator_file_path = os.path.join(source_task_path,
																																		'progress_{}.txt'.format(split_tf))
												with open(progress_indicator_file_path, 'w') as outfile:
														outfile.writelines(['PROGRESS\n',
																								str(progress_indicator_start / progress_indicator_end * 100) + '\n'])
						# Finish progress indicator. Being here means got through all the images
						progress_indicator_file_path = os.path.join(source_task_path,
																												'progress_{}.txt'.format(split_tf))
						with open(progress_indicator_file_path, 'w') as outfile:
								outfile.writelines(['FINISHED\n', str(100) + '\n'])
						output_file_path = os.path.join(source_task_path, 'output_{}.txt'.format(split_tf))
						with open(output_file_path, 'w+') as outfile:
								outfile.write(str(result))
				finally:
						sess.close()
						del sess

def generate_frames(path_to_data, file):
		# Opens the Video file
		print("opening file", os.path.join(path_to_data, file))
		cap= cv2.VideoCapture(os.path.join(path_to_data, file))
		i=0
		path = os.path.join(path_to_data, "frames/")
		os.mkdir(path)
		
		while(cap.isOpened()):
				ret, frame = cap.read()
				if ret == False:
						break
				cv2.imwrite(path+str(i)+'.jpg',frame)
				i+=1
		print("found following number of frames", i)
		cap.release()
		cv2.destroyAllWindows()


def make_image_list(path_to_data):
		def get_image_key(item):
				return int(os.path.splitext(os.path.basename(item))[0])
		files = os.listdir(path_to_data)
		image_list = []

		if len(files) == 1 and (files[0].endswith("mp4") or files[0].endswith("avi") or files[0].lower().endswith("MOV")):
				generate_frames(path_to_data, files[0])
				path_to_data = os.path.join(path_to_data, "frames/")
				
		for root, dirnames, filenames in os.walk(path_to_data):
				for filename in fnmatch.filter(filenames, '*.png') + fnmatch.filter(filenames, '*.jpg') + fnmatch.filter(filenames, '*.jpeg'):
						image_list.append(os.path.join(root, filename))

		image_list.sort()
		return image_list


if __name__ == "__main__":
		import sys
		data = sys.argv[1].split("::")
		task_id = data[0]
		model_path = data[1]
		label_mapping = ast.literal_eval(data[2])
		threshold = float(data[3])
		split = int(data[4])
		start_of_image_list = data[5]
		end_of_image_list = data[6]
		split_size = data[7]
		is_cpu_workspace = data[8]
		# images_list = data[9]
		if is_cpu_workspace == 'no':
				os.environ['CUDA_VISIBLE_DEVICES'] = str(split)
		run_tf_model(task_id, model_path, label_mapping, threshold, split,
								 start_of_image_list, end_of_image_list, split_size)