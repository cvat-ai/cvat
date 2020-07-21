#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

nuctl create project cvat
nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/omz/public/faster_rcnn_inception_v2_coco/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/omz/public/mask_rcnn_inception_resnet_v2_atrous_coco/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/omz/public/yolo-v3-tf/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/omz/intel/text-detection-0004/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/omz/intel/semantic-segmentation-adas-0001/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/omz/intel/person-reidentification-retail-300/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/openvino/dextr/nuclio \
    --volume $SCRIPT_DIR/openvino/common:/opt/nuclio/common

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/tensorflow/matterport/mask_rcnn/nuclio

nuctl deploy --project-name cvat \
    --path $SCRIPT_DIR/tensorflow/faster_rcnn_inception_v2_coco/nuclio

nuctl get function
