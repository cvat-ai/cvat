# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import jsonpickle
import numpy as np
import torch
import cv2

from model.network import XMem
from inference.inference_core import InferenceCore
from inference.data.mask_mapper import MaskMapper


def convert_polygon_to_mask(image, points):
    h, w = image.shape[:2]
    points = np.array(points).reshape(-1, 2).astype(np.int32)
    mask = np.zeros((h, w), dtype=np.int32)
    mask = cv2.fillPoly(mask, [points], 1)[None, :, :]
    return mask


def convert_mask_to_polygon(mask):
    if int(cv2.__version__.split(".")[0]) > 3:
        contours = cv2.findContours(
            mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS
        )[0]
    else:
        contours = cv2.findContours(
            mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS
        )[1]

    if len(contours) == 0:
        return []

    contours = max(contours, key=lambda arr: arr.size)

    if contours.shape.count(1):
        contours = np.squeeze(contours)

    if contours.size < 3 * 2:
        return []

    else:
        return contours.reshape(-1).tolist()


class ModelHandler:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # self.device = torch.device("cpu")
        self.weight_path = "/xmem.pth"  # Absolute path of the model
        self.config = {
            "mem_every": 5,
            "deep_update_every": -1,
            "enable_long_term": True,
            "enable_long_term_count_usage": True,
            "disable_long_term": False,
            "max_mid_term_frames": 10,
            "min_mid_term_frames": 5,
            "max_long_term_elements": 1000,
            "num_prototypes": 128,
            "top_k": 30,
            "key_dim": 64,
            "value_dim": 512,
            "hidden_dim": 64,
        }

        self.model = XMem(
            self.config, model_path=self.weight_path, map_location=self.device
        )
        self.model = self.model.eval()
        self.model = self.model.to(self.device)

        weights = torch.load(self.weight_path, map_location=self.device)
        self.model.load_weights(weights, init_as_zero_if_needed=True)

        self.mask_mapper = MaskMapper()
        self.tracker = InferenceCore(self.model, self.config)

    def encode_state(self):
        state = {}
        state["curr_ti"] = jsonpickle.encode(self.tracker.curr_ti)
        state["last_mem_ti"] = jsonpickle.encode(self.tracker.last_mem_ti)
        state["last_deep_update_ti"] = jsonpickle.encode(
            self.tracker.last_deep_update_ti
        )
        state["memory"] = jsonpickle.encode(self.tracker.memory)
        return state

    def decode_state(self, state):
        self.tracker.curr_ti = jsonpickle.decode(state["curr_ti"])
        self.tracker.last_mem_ti = jsonpickle.decode(state["last_mem_ti"])
        self.tracker.last_deep_update_ti = jsonpickle.decode(
            state["last_deep_update_ti"]
        )
        self.tracker.memory = jsonpickle.decode(state["memory"])

    def init_tracker(self, img, masks):
        if masks is not None:
            masks, labels = self.mask_mapper.convert_mask(masks[0], exhaustive=True)
            masks = torch.Tensor(masks).to(self.device)
            self.tracker.set_all_labels(list(self.mask_mapper.remappings.values()))
        else:
            labels = None
        self.tracker.step(img, masks, labels)

    def track(self, img):
        prob = self.tracker.step(img)
        mask = torch.max(prob, dim=0).indices
        mask = mask.numpy(force=True)
        return mask

    def infer(self, image, shape, state):
        with torch.autograd.set_grad_enabled(False):
            with torch.autocast(self.device.type, enabled=True if torch.cuda.is_available() else False):
                mask = convert_polygon_to_mask(image, shape)
                image = (
                    torch.from_numpy(image)
                    .float()
                    .permute(2, 0, 1)
                    .to(device=self.device)
                )
                image = image / 255.0
                if state is None:
                    with torch.inference_mode():
                        self.init_tracker(image, mask)
                    state = self.encode_state()

                else:
                    self.decode_state(state)
                    with torch.inference_mode():
                        mask = self.track(image)
                    state = self.encode_state()
                    shape = convert_mask_to_polygon(mask)
                self.tracker.clear_memory()
        # if torch.cuda.is_available():
        #     torch.cuda.synchronize()
        #     torch.cuda.empty_cache()

        return shape, state
