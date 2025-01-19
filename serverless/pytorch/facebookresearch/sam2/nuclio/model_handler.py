# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import torch
from PIL.Image import Image
from sam2.build_sam import build_sam2
from sam2.utils.transforms import SAM2Transforms

from image_encoder import SAM2Encoder


class ModelHandler:
    def __init__(self):
        self.device = torch.device('cpu')
        if torch.cuda.is_available():
            self.device = torch.device('cuda')
            if torch.cuda.get_device_properties(0).major >= 8:
                # turn on tfloat32 for Ampere GPUs
                # (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True

        self.sam2_checkpoint = "/opt/nuclio/sam2/sam2.1_hiera_large.pt"
        self.sam2_model_cfg = "configs/sam2.1/sam2.1_hiera_l.yaml"
        sam2_model = build_sam2(self.sam2_model_cfg, self.sam2_checkpoint, device=self.device)
        self.sam2_encoder = SAM2Encoder(sam2_model) if torch.cuda.is_available() else SAM2Encoder(sam2_model).cpu()
        self._transforms = SAM2Transforms(resolution=sam2_model.image_size, mask_threshold=0.0)

    def handle(self, image):
        with torch.inference_mode():
            assert isinstance(image, Image)
            input_image = self._transforms(image)
            input_image = input_image[None, ...].to(self.device)
            assert (
                len(input_image.shape) == 4 and input_image.shape[1] == 3
            ), f"input_image must be of size 1x3xHxW, got {input_image.shape}"
            high_res_feats_0, high_res_feats_1, image_embed = self.sam2_encoder(input_image)
            return high_res_feats_0, high_res_feats_1, image_embed, input_image
