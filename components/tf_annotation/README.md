## [Tensorflow Object Detector](https://github.com/tensorflow/models/tree/master/research/object_detection)

### What is it?
* This application allows you automatically to annotate many various objects on images.
* It uses [Faster RCNN Inception Resnet v2 Atrous Coco Model](http://download.tensorflow.org/models/object_detection/faster_rcnn_inception_resnet_v2_atrous_coco_2018_01_28.tar.gz) from [tensorflow detection model zoo](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md)
* It can work on CPU (with Tensorflow or OpenVINO) or GPU (with Tensorflow GPU).
* It supports next classes (just specify them in "labels" row):
```
'surfboard', 'car', 'skateboard', 'boat', 'clock',
'cat', 'cow', 'knife', 'apple', 'cup', 'tv',
'baseball_bat', 'book', 'suitcase', 'tennis_racket',
'stop_sign', 'couch', 'cell_phone', 'keyboard',
'cake', 'tie', 'frisbee', 'truck', 'fire_hydrant',
'snowboard', 'bed', 'vase', 'teddy_bear',
'toaster', 'wine_glass', 'traffic_light',
'broccoli', 'backpack', 'carrot', 'potted_plant',
'donut', 'umbrella', 'parking_meter', 'bottle',
'sandwich', 'motorcycle', 'bear', 'banana',
'person', 'scissors', 'elephant', 'dining_table',
'toothbrush', 'toilet', 'skis', 'bowl', 'sheep',
'refrigerator', 'oven', 'microwave', 'train',
'orange', 'mouse', 'laptop', 'bench', 'bicycle',
'fork', 'kite', 'zebra', 'baseball_glove', 'bus',
'spoon', 'horse', 'handbag', 'pizza', 'sports_ball',
'airplane', 'hair_drier', 'hot_dog', 'remote',
'sink', 'dog', 'bird', 'giraffe', 'chair'.
```
* Component adds "Run TF Annotation" button into dashboard.


### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/tf_annotation/docker-compose.tf_annotation.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/tf_annotation/docker-compose.tf_annotation.yml up -d
```
