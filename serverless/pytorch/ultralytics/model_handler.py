# Copyright (C) 2026 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
import cv2
import base64
import numpy as np
import PIL.Image as Image
import torch
import time
from pathlib import Path
from ultralytics import YOLO

USE_SEGMENT = bool(int(os.environ.get("USE_SEGMENT", "0")))
SEGMENT_PAD = int(os.environ.get("SEGMENT_PAD", "144"))
BATCH_SIZES = int(os.environ.get("BATCH_SIZES", "1"))
THRESHOLD = float(os.environ.get("THRESHOLD", "0.6"))

class Profile:
    """Context manager and decorator for profiling code execution time"""

    def __init__(self, t=0.0):
        """Initializes a profiling context for Model inference with optional timing threshold."""
        self.t = t

    def __enter__(self):
        """Initializes timing at the start of a profiling context block for performance measurement."""
        self.start = time.time()
        return self

    def __exit__(self, type_, value, traceback):
        """Concludes timing, updating duration for profiling upon exiting a context block."""
        self.dt = time.time() - self.start  # delta-time
        self.t += self.dt  # accumulate dt

    @property
    def elapsed(self):
        return self.dt

class ModelHandler:
    def __init__(self, logger):
        """Initialize Model"""
        self.logger = logger
        # weight = Path(__file__).parent / "weights/yolov8m-cls.pt"
        weight = "yolov8m-cls.yaml"  # verify custom YOLO model for your annotation project
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.logger.info("model %s loaded on device %s", weight.name, device)
        self.model = YOLO(weight, task="classify").to(device)
        self.model.predict([np.zeros((96, 96, 3), np.uint8)] * 2, verbose=False)  # warmup

    @staticmethod
    def base642PIL2ndarray(image_string) -> np.ndarray:
        """
        convert PIL base64 image string 2 np.ndarray
        Args:
            image_string: PIL base64 image
                format:
                    PIL: base64string contains size information.
                    openCV: base64string just contains value of each pixel.
        Returns:

        """
        image = np.array(Image.open(io.BytesIO(base64.b64decode(image_string))), np.uint8)
        image[:, :, :3] = image[:, :, [2, 1, 0]]  # RGB2BGR
        return image

    def batch_generate(self, data: dict, batch: int) -> tuple[list[np.ndarray], list[int]]:
        """load batch image from request body data"""
        with Profile() as profile:
            if data["image"] is not None:
                image = self.base642PIL2ndarray(data["image"])
                for i in range(len(data["objects"])):
                    shape = data["objects"][i]
                    x0, y0, x1, y1 = shape["xyxy"]
                    shape["image"] = image[y0: y1, x0: x1]
            else:
                for i in range(len(data["objects"])):
                    shape = data["objects"][i]
                    image = self.base642PIL2ndarray(shape["image"])
                    shape["image"] = image
        self.logger.debug("reqst body image convert elapsed: %sms", round(profile.elapsed * 1000))

        batch_imgs, batch_clientID = [], []
        for i, shape in enumerate(data["objects"]):
            image = shape["image"]

            if USE_SEGMENT:  # Predict after masked
                with Profile() as profile:
                    mask = np.zeros(shape["image"].shape[:2], dtype=np.uint8)
                    if shape["shapeType"] in ("polygon", "rectangle", "cuboid"):
                        if shape["shapeType"] == "polygon":
                            """x0, y0, x1, y1, ..., xi, yi"""
                            points = np.array(shape["points"]).reshape(-1, 2).astype(np.int32)
                        elif shape["shapeType"] == "rectangle":
                            """x0, y0, x1, y1"""
                            rotation = shape.get("rotation", 0)
                            x0, y0, x1, y1 = list(map(round, shape["points"]))
                            cx, cy, bw, bh = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0), (y1 - y0)
                            points = np.round(cv2.boxPoints(((cx, cy), (bw, bh), rotation))).astype(np.int32)
                        else:
                            """    6-----4
                                0-----2  |
                                |  7  |--5
                                1-----3   """
                            points = np.array(shape["points"]).reshape(-1, 2).astype(np.int32)
                            points = points[[0, 1, 3, 5, 4, 6]]
                        cv2.drawContours(mask, [points], 0, 1, -1)
                    elif shape["shapeType"] == "mask":
                        """mask points format rle"""
                        mask, idx = mask.reshape(-1), 0
                        for j, v in enumerate(shape["points"][:-4]):
                            mask[idx: idx + v] = [j % 2] * v
                            idx += v
                        mask = mask.reshape(image.shape[:2])
                    elif shape["shapeType"] == "ellipse":
                        """mask points ellipse"""
                        cx, cy, rx, ry = shape["points"]
                        cx, cy, rx, ry = list(map(round, [cx, cy, rx - cx, cy - ry]))
                        rotation = shape.get("rotation", 0)
                        cv2.ellipse(mask, (cx, cy), (rx, ry), rotation, 0, 360, 1, -1)
                    else:  # use origin rect ROI image
                        mask += 1
                    image[mask == 0] = SEGMENT_PAD  # background to (144, 144, 144) 144 default
                self.logger.debug("shape segment transform elapsed: %sms", round(profile.elapsed * 1000))

            batch_imgs.append(image)
            batch_clientID.append(shape["clientID"])
            if len(batch_imgs) >= batch:
                yield batch_imgs, batch_clientID
                batch_imgs.clear()
                batch_clientID.clear()

        if len(batch_imgs):
            yield batch_imgs, batch_clientID
            batch_imgs.clear()
            batch_clientID.clear()

    def handle(self, data: dict, threshold: float = None):
        """
        Inference Image to Get Output
        Args:

            data: {
                # np.ndarray or None, depends on compressed or not. if objects areas > image size x 0.8, image=not None
                "image": "base64",
                # Annotations objects, if image compressed, ROI image will save in objects item key "image"
                "objects": [{
                    "image": np.ndarray,                  # if image have
                    "points": [p0, p1, p2, p3, p4, ...],  # polygons or bboxes
                    "label": "",                          # origin label
                    "shapeType": type,                    # annotation type
                        "rectangle", "polygon", "polyline", "points", "ellipse", "cuboid", "skeleton", "mask"
                    "clientID": annotationId, # annotation object unique ID
                }, ...]
            }
            threshold: class threshold
        Returns:

        """
        results = []
        for batch, clientIDs in self.batch_generate(data, BATCH_SIZES):
            with Profile() as profile:
                outputs = self.model.predict(batch, verbose=False)
            self.logger.debug("model inference batch(%s) elapsed: %sms", len(batch), round(profile.elapsed * 1000))
            for output, clientID in zip(outputs, clientIDs):
                threshold = threshold or THRESHOLD
                confidence = float(output.probs.top1conf)
                label = self.model.names[output.probs.top1] if confidence > threshold else "Null"
                results.append({"conf": confidence, "label": label, "clientID": clientID})
        return results
