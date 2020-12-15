#!/bin/bash
# Sample commands to deploy nuclio functions on GPU

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

nuctl create project cvat

nuctl deploy --project-name cvat \
    --path "$SCRIPT_DIR/tensorflow/faster_rcnn_inception_v2_coco/nuclio" \
    --platform local --base-image tensorflow/tensorflow:2.1.1-gpu \
    --desc "Faster RCNN from Tensorflow Object Detection GPU API" \
    --image cvat/tf.faster_rcnn_inception_v2_coco_gpu \
    --resource-limit nvidia.com/gpu=1

nuctl get function
