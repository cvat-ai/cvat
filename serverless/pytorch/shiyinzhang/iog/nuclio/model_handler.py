# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import numpy as np
import os
import cv2
import torch
from torchvision import transforms
from dataloaders import custom_transforms as tr
from networks.mainnetwork import Network
from PIL import Image
from dataloaders import helpers
import os

def convert_mask_to_polygon(mask):
    mask = np.array(mask, dtype=np.uint8)
    cv2.normalize(mask, mask, 0, 255, cv2.NORM_MINMAX)
    contours = None
    if int(cv2.__version__.split('.')[0]) > 3:
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0]
    else:
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[1]

    contours = max(contours, key=lambda arr: arr.size)
    if contours.shape.count(1):
        contours = np.squeeze(contours)
    if contours.size < 3 * 2:
        raise Exception('Less then three point have been detected. Can not build a polygon.')

    polygon = []
    for point in contours:
        polygon.append([int(point[0]), int(point[1])])

    return polygon

class ModelHandler:
    def __init__(self):
        base_dir = os.environ.get("MODEL_PATH", "/opt/nuclio/iog")
        model_path = os.path.join(base_dir, "IOG_PASCAL_SBD.pth")
        self.device = torch.device("cpu")

        # Number of input channels (RGB + heatmap of IOG points)
        self.net = Network(nInputChannels=5, num_classes=1, backbone='resnet101',
            output_stride=16, sync_bn=None, freeze_bn=False)

        pretrain_dict = torch.load(model_path)
        self.net.load_state_dict(pretrain_dict)
        self.net.to(self.device)
        self.net.eval()

    def handle(self, image, pos_points, neg_points, threshold):
        with torch.no_grad():
            x, y = np.split(np.transpose(np.array(neg_points)), 2)
            bbox = [np.min(x), np.min(y), np.max(x), np.max(y)]
            # extract a crop from the image
            crop_padding = 30
            crop_bbox = [
                max(bbox[0] - crop_padding, 0),
                max(bbox[1] - crop_padding, 0),
                min(bbox[2] + crop_padding, image.width - 1),
                min(bbox[3] + crop_padding, image.height - 1)
            ]
            crop_shape = (
                int(crop_bbox[2] - crop_bbox[0] + 1), # width
                int(crop_bbox[3] - crop_bbox[1] + 1), # height
            )

            # try to use crop_from_bbox(img, bbox, zero_pad) here
            input_crop = np.array(image.crop(crop_bbox)).astype(np.float32)

            # resize the crop
            input_crop = cv2.resize(input_crop, (512, 512), interpolation=cv2.INTER_NEAREST)
            crop_scale = (512 / crop_shape[0], 512 / crop_shape[1])

            def translate_points(points):
                points = [
                    ((p[0] - crop_bbox[0]) * crop_scale[0], # x
                     (p[1] - crop_bbox[1]) * crop_scale[1]) # y
                    for p in points]

                return points

            pos_points = translate_points(pos_points)
            neg_points = translate_points(neg_points)

            # FIXME: need to constract correct gt (pos_points can be more than 1)
            iog_image = helpers.make_gt(input_crop, pos_points + neg_points)

            # Convert iog_image to an image (0-255 values)
            iog_image = 255. * (iog_image - iog_image.min()) / (iog_image.max() - iog_image.min() + 1e-10)

            # Concatenate input crop and IOG image
            input_blob = np.concatenate((input_crop, iog_image), axis=2)

            # numpy image: H x W x C
            # torch image: C X H X W
            input_blob = input_blob.transpose((2, 0, 1))
            # batch size is 1
            input_blob = np.array([input_blob])
            input_tensor = torch.from_numpy(input_blob)

            input_tensor = input_tensor.to(self.device)
            output_mask = self.net.forward(input_tensor)[4]
            output_mask = output_mask.to(self.device)
            pred = np.transpose(output_mask.data.numpy()[0, :, :, :], (1, 2, 0))
            pred = pred > threshold
            pred = np.squeeze(pred)

            # Convert a mask to a polygon
            polygon = convert_mask_to_polygon(pred)
            polygon = [
                (int(p[0] + crop_bbox[0]), int(p[1] + crop_bbox[1]))
                for p in polygon
            ]

            return polygon

