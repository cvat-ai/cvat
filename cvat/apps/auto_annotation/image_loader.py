
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import numpy as np

class ImageLoader():
    def __init__(self, frame_provider):
        self._frame_provider = frame_provider

    def __iter__(self):
        for frame, _ in self._frame_provider.get_frames(self._frame_provider.Quality.ORIGINAL):
            yield self._load_image(frame)

    def __len__(self):
        return len(self._frame_provider)

    @staticmethod
    def _load_image(image):
        return cv2.imdecode(np.fromstring(image.read(), np.uint8), cv2.IMREAD_COLOR)
