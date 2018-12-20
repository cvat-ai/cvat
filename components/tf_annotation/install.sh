#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#
set -e

cd ${HOME} && \
wget -O model.tar.gz http://download.tensorflow.org/models/object_detection/faster_rcnn_inception_resnet_v2_atrous_coco_2018_01_28.tar.gz && \
tar -xzf model.tar.gz && rm model.tar.gz && \
mv faster_rcnn_inception_resnet_v2_atrous_coco_2018_01_28 ${HOME}/rcnn && cd ${HOME} && \
mv rcnn/frozen_inference_graph.pb rcnn/inference_graph.pb

if [[ "$CUDA_SUPPORT" = "yes" ]]
then
    pip3 install --no-cache-dir tensorflow-gpu==1.7.0
else
    if [[ "$OPENVINO_TOOLKIT" = "yes" ]]
    then
        pip3 install -r ${INTEL_CVSDK_DIR}/deployment_tools/model_optimizer/requirements.txt && \
        cd ${HOME}/rcnn/ && \
        ${INTEL_CVSDK_DIR}/deployment_tools/model_optimizer/mo.py --framework tf \
        --data_type FP32 --input_shape [1,600,600,3] \
        --input image_tensor --output detection_scores,detection_boxes,num_detections \
        --tensorflow_use_custom_operations_config ${INTEL_CVSDK_DIR}/deployment_tools/model_optimizer/extensions/front/tf/faster_rcnn_support.json \
        --tensorflow_object_detection_api_pipeline_config pipeline.config --input_model inference_graph.pb && \
        rm inference_graph.pb
    else
        pip3 install --no-cache-dir tensorflow==1.7.0
    fi
fi
