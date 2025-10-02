# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from glass.glass import GLASS
from glass.backbones import load as load_backbone


import torch
import cv2 as cv
import numpy as np
import torchvision.transforms as T


import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"


def to_cvat_mask(box: list, mask):
    xtl, ytl, xbr, ybr = box
    flattened = mask[ytl:ybr + 1, xtl:xbr + 1].flat[:].tolist()
    flattened.extend([xtl, ytl, xbr, ybr])
    return flattened


class ModelHandler:
    def __init__(self):
        # Setup device
        backbone = load_backbone("wideresnet50")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = GLASS(self.device)
        self.model.load(
            backbone=backbone,
            layers_to_extract_from=['layer2', 'layer3'],
            device=self.device,
            input_shape=(3, 288, 288),
            pretrain_embed_dimension=1536,
            target_embed_dimension=1536,
            patchsize=3,
            meta_epochs=640,
            eval_epochs=1,
            dsc_layers=2,
            dsc_hidden=1024,
            pre_proj=1,
            mining=1,
            noise=0.015,
            radius=0.75,
            p=0.5,
            step=20,
            limit=392
        )
        # Original value: "ckpt_best_568.pth"
        self.pth_path = "glass_leather_v1_0_0.pth"

    def resize_mask(self, mask, image):
        target_size = image.size
        return cv.resize(mask, target_size, interpolation=cv.INTER_NEAREST)

    def infer(self, image, threshold=0.5, ckpt_path=None):

        if ckpt_path is not None:
            self.pth_path = ckpt_path
            print(f'Using checkpoint path: {self.pth_path}')
        else:
            print('No checkpoint path provided, using default.')


        transform = T.Compose([
            T.Resize(288),
            T.CenterCrop(288),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        img_tensor = transform(image).unsqueeze(0).to(self.device)

        # Check if checkpoint file exists and provide helpful error message
        if not os.path.exists(self.pth_path):
            available_files = [f for f in os.listdir('.') if f.endswith('.pth')]
            error_msg = f"Model checkpoint file '{self.pth_path}' not found."
            if available_files:
                error_msg += f" Available .pth files: {', '.join(available_files)}"
            else:
                error_msg += " No .pth files found in the current directory."
            error_msg += f" Current working directory: {os.getcwd()}"
            raise FileNotFoundError(error_msg)

        try:
            checkpoint = torch.load(self.pth_path, map_location=self.device)
        except Exception as e:
            raise RuntimeError(f"Failed to load checkpoint '{self.pth_path}': {str(e)}")

        self.model.discriminator.load_state_dict(checkpoint['discriminator'])
        self.model.pre_projection.load_state_dict(checkpoint['pre_projection'])
        self.model.eval()

        # --- Run inference ---
        with torch.no_grad():

            score, masks = self.model._predict(img_tensor)

        if masks is not None:
            for mask in masks:
                pred_mask = (mask > threshold).astype(np.uint8)
                resized_mask = self.resize_mask(pred_mask, image)

        contours, _  = cv.findContours(resized_mask, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        results = []
        for contour in contours:
            contour = np.flip(contour, axis=1)
            if len(contour) < 3:
                continue

            x_min = max(0, int(np.min(contour[:,:,0])))
            x_max = max(0, int(np.max(contour[:,:,0])))
            y_min = max(0, int(np.min(contour[:,:,1])))
            y_max = max(0, int(np.max(contour[:,:,1])))

            box = (x_min, y_min, x_max, y_max)

            cvat_mask = to_cvat_mask(box, resized_mask)

            results.append({
                "confidence": None,
                "label": "anomaly",
                "points": contour.ravel().tolist(),
                "mask": cvat_mask,
                "type": "mask",
            })

        print('So far so good! Results obtained.')

        return results

# os.chdir("/home/ssilva/Documents/cvat/serverless/pytorch/anomalib/uflow/nuclio/")
# model_handler = ModelHandler()
# image = Image.open("debug_images/000.png")
# resized_mask = model_handler.infer(image)*255
