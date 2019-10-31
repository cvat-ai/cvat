#!/bin/bash
#

set -e

cd ${HOME} && \
git clone https://github.com/matterport/Mask_RCNN.git && \
wget https://github.com/matterport/Mask_RCNN/releases/download/v2.0/mask_rcnn_coco.h5 && \
mv mask_rcnn_coco.h5 Mask_RCNN/mask_rcnn_coco.h5

# TODO remove useless files
# tensorflow and Keras are installed globally
