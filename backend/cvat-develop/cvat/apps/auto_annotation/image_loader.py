
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2

class ImageLoader():
    def __init__(self, image_list):
        self.image_list = image_list

    def __getitem__(self, i):
        return self.image_list[i]

    def __iter__(self):
        for imagename in self.image_list:
            yield self._load_image(imagename)

    def __len__(self):
        return len(self.image_list)

    @staticmethod
    def _load_image(path_to_image):
        return cv2.imread(path_to_image)
