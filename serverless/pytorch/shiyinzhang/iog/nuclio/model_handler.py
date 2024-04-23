# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import numpy as np
import os
import cv2
import torch
from networks.mainnetwork import Network
from dataloaders import helpers

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

    def handle(self, image, bbox, pos_points, neg_points, threshold):
        with torch.no_grad():
            # extract a crop with padding from the image
            crop_padding = 30
            crop_bbox = [
                max(bbox[0][0] - crop_padding, 0),
                max(bbox[0][1] - crop_padding, 0),
                min(bbox[1][0] + crop_padding, image.width - 1),
                min(bbox[1][1] + crop_padding, image.height - 1)
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

            def translate_points_to_crop(points):
                points = [
                    ((p[0] - crop_bbox[0]) * crop_scale[0], # x
                     (p[1] - crop_bbox[1]) * crop_scale[1]) # y
                    for p in points]

                return points

            pos_points = translate_points_to_crop(pos_points)
            neg_points = translate_points_to_crop(neg_points)

            # Create IOG image
            pos_gt = np.zeros(shape=input_crop.shape[:2], dtype=np.float64)
            neg_gt = np.zeros(shape=input_crop.shape[:2], dtype=np.float64)
            for p in pos_points:
                pos_gt = np.maximum(pos_gt, helpers.make_gaussian(pos_gt.shape, center=p))
            for p in neg_points:
                neg_gt = np.maximum(neg_gt, helpers.make_gaussian(neg_gt.shape, center=p))
            iog_image = np.stack((pos_gt, neg_gt), axis=2).astype(dtype=input_crop.dtype)

            # Convert iog_image to an image (0-255 values)
            cv2.normalize(iog_image, iog_image, 0, 255, cv2.NORM_MINMAX)

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
            pred = np.array(pred, dtype=np.uint8)
            pred = cv2.resize(pred, dsize=(crop_shape[0], crop_shape[1]),
                interpolation=cv2.INTER_CUBIC)
            cv2.normalize(pred, pred, 0, 255, cv2.NORM_MINMAX)

            mask = np.zeros((image.height, image.width), dtype=np.uint8)
            x = int(crop_bbox[0])
            y = int(crop_bbox[1])
            mask[y : y + crop_shape[1], x : x + crop_shape[0]] = pred

            return mask
