# Copyright (C) 2023-2026 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import os
import torch
import numpy as np

from scripts.export_encoder import find_model
from segment_anything.build_encoder import SAMEncoder

CKPT  = os.environ.get("CKPT" , "")
MODE  = os.environ.get("MODE" , "pth")
MODEL = os.environ.get("MODEL", "sam_vit_h")
CKPTS = os.environ.get("CKPTS", "weights")


class ModelHandler:
    def __init__(self):
        sam_encoder_checkpoint = CKPT if CKPT else find_model(MODEL, CKPTS, MODE)
        device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self.model = SAMEncoder(sam_encoder_checkpoint, device)
        self.model(np.random.randint(0, 255, (1024, 1024, 3), np.uint8))  # warmup

    def handle(self, image) -> torch.Tensor:
        features = self.model(image if isinstance(image, np.ndarray) else np.array(image))
        return features
