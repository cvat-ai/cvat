
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import numpy as np


def load_image(path):
    """
    Reads an image in the HWC Grayscale/BGR(A) float [0; 255] format.
    """
    image = cv2.imread(path)
    image = image.astype(np.float32)

    assert len(image.shape) == 3
    assert image.shape[2] in [1, 3, 4]
    return image

class lazy_image:
    def __init__(self, path, loader=load_image):
        self.path = path
        self.loader = loader
        self.image = None

    def __call__(self):
        if self.image is None:
            self.image = self.loader(self.path)
        return self.image