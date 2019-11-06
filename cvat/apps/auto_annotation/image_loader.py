
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2

class ImageLoader():
    def __init__(self, frame_provider):
        self._frame_provider = frame_provider

    def __iter__(self):
        for imagename in self._frame_provider:
            yield self._load_image(imagename)

    def __len__(self):
        return len(self._frame_provider)

    @staticmethod
    def _load_image(path_to_image):
        return cv2.imread(path_to_image)
