# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT
import os
import hashlib
import mimetypes
import cv2 as cv
from av import VideoFrame

def rotate_image(image, angle):
    height, width = image.shape[:2]
    image_center = (width/2, height/2)
    matrix = cv.getRotationMatrix2D(image_center, angle, 1.)
    abs_cos = abs(matrix[0,0])
    abs_sin = abs(matrix[0,1])
    bound_w = int(height * abs_sin + width * abs_cos)
    bound_h = int(height * abs_cos + width * abs_sin)
    matrix[0, 2] += bound_w/2 - image_center[0]
    matrix[1, 2] += bound_h/2 - image_center[1]
    matrix = cv.warpAffine(image, matrix, (bound_w, bound_h))
    return matrix

def md5_hash(frame):
    if isinstance(frame, VideoFrame):
        frame = frame.to_image()
    return hashlib.md5(frame.tobytes()).hexdigest() # nosec

def _define_data_type(media):
    media_type, _ = mimetypes.guess_type(media)
    if media_type:
        return media_type.split('/')[0]

def is_video(media_file):
    return _define_data_type(media_file) == 'video'

def is_image(media_file):
    return _define_data_type(media_file) == 'image'

# image_path is expected to be a list of absolute path to images
# root_path is expected to be a string (dataset root)
def detect_related_images(image_paths, root_path):
    related_images = {}
    for path in image_paths:
        name, ext = os.path.splitext(os.path.basename(path))
        converted_name = '_'.join((name, ext[1:])) if ext else name
        related_images_dir = os.path.join(os.path.dirname(path), 'related_images', converted_name)
        if os.path.isdir(related_images_dir):
            rel_image_path = os.path.relpath(path, root_path)
            base_related_path = os.path.relpath(related_images_dir, root_path)

            related_images[rel_image_path] = sorted(
                filter(is_image, map(lambda x: os.path.join(base_related_path, x), os.listdir(related_images_dir)))
            )
    return related_images

# TODO, find related images pointcloud
# TODO, find related images pcd
# TODO, find related images 3D default
# TODO, find related images 2D default