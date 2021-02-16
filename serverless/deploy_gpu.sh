#!/bin/bash
# Sample commands to deploy nuclio functions on GPU

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

nuctl create project cvat

nuctl deploy --project-name cvat \
    --path "$SCRIPT_DIR/tensorflow/faster_rcnn_inception_v2_coco/nuclio" \
    --platform local --base-image tensorflow/tensorflow:2.1.1-gpu \
    --desc "GPU based Faster RCNN from Tensorflow Object Detection API" \
    --image cvat/tf.faster_rcnn_inception_v2_coco_gpu \
    --triggers '{"myHttpTrigger": {"maxWorkers": 1}}' \
    --resource-limit nvidia.com/gpu=1 --verbose

nuctl deploy --project-name cvat \
    --path "$SCRIPT_DIR/tensorflow/matterport/mask_rcnn/nuclio" \
    --platform local --base-image tensorflow/tensorflow:1.15.5-gpu-py3 \
    --desc "GPU based implementation of Mask RCNN on Python 3, Keras, and TensorFlow." \
    --image cvat/tf.matterport.mask_rcnn_gpu\
    --triggers '{"myHttpTrigger": {"maxWorkers": 1}}' \
    --resource-limit nvidia.com/gpu=1 --verbose


nuctl get function
