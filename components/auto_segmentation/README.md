## [Keras+Tensorflow Mask R-CNN Segmentation](https://github.com/matterport/Mask_RCNN)

### What is it?
-   This application allows you automatically to segment many various objects on images.
-   It's based on Feature Pyramid Network (FPN) and a ResNet101 backbone.

-   It uses a pre-trained model on MS COCO dataset
-   It supports next classes (use them in "labels" row):
```python
'BG', 'person', 'bicycle', 'car', 'motorcycle', 'airplane',
'bus', 'train', 'truck', 'boat', 'traffic light',
'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird',
'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear',
'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie',
'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
'kite', 'baseball bat', 'baseball glove', 'skateboard',
'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza',
'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
'keyboard', 'cell phone', 'microwave', 'oven', 'toaster',
'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors',
'teddy bear', 'hair drier', 'toothbrush'.
```
-  Component adds "Run Auto Segmentation" button into dashboard.

### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/auto_segmentation/docker-compose.auto_segmentation.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/auto_segmentation/docker-compose.auto_segmentation.yml up -d
```
