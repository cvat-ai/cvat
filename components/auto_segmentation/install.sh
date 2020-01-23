#!/bin/bash
#

set -e

MASK_RCNN_URL=https://github.com/matterport/Mask_RCNN

cd ${HOME} && \
git clone ${MASK_RCNN_URL}.git && \
curl -L ${MASK_RCNN_URL}/releases/download/v2.0/mask_rcnn_coco.h5 -o Mask_RCNN/mask_rcnn_coco.h5

# TODO remove useless files
# tensorflow and Keras are installed globally
