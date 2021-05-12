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

# TODO: Need to update create.py because right now it does not support 3D data at all
# image_path is expected to be a list of absolute path to images
# root_path is expected to be a string (dataset root)
def detect_related_images(image_paths, root_path):
    def _append_to_related_images(related_images, related_image, image):
        if image is not None and image in image_paths:
            rel_image = os.path.relpath(image, root_path)
            rel_related_image = os.path.relpath(related_image, root_path)
            related_images[rel_image] = related_images[rel_image] if rel_image in related_images else []
            related_images[rel_image].append(rel_related_image)
            return True
        return False

    related_images = {}
    for root, _, filenames in os.walk(root_path):
        for filename in filenames:
            related_image_path = os.path.join(root, filename)
            is_possible_context_image = related_image_path not in image_paths and is_image(related_image_path)
            if not is_possible_context_image:
                continue

            # 3D VELODYNE DATA FORMAT
            # velodyne_points/
            #     data/
            #         image_01.bin
            # IMAGE_00 # any number?
            #     data/
            #         image_01.png
            name, ext = os.path.splitext(filename)
            # actually format contains .bin data, NOT .pcd, but .bin files were converted before this code execution to .pcd
            velodyne_path = os.path.normpath(
                os.path.join(root, '..', '..', 'velodyne_points', 'data', '{}.pcd'.format(name))
            ) if root.endswith('data') else None

            if _append_to_related_images(related_images, related_image_path, velodyne_path):
                continue

            try:
                name, ext = os.path.basename(root).rsplit('_', 1)
                # 3D POINTCLOUD DATA FORMAT
                # pointcloud/
                #     00001.pcd
                # related_images/
                #     00001_pcd/
                #         image_01.png # or other image
                pointcloud_path = os.path.normpath(
                    os.path.join(root, '..', '..', 'pointcloud', '{}.{}'.format(name, ext))
                ) if os.path.split(root)[0].endswith('related_images') else None

                if _append_to_related_images(related_images, related_image_path, pointcloud_path):
                    continue

                # 2D DATFORMAT
                # data/
                #     00001.png
                #     related_images/
                #         00001_png/
                #             context_image_1.jpeg
                #             context_image_2.png
                default_2d_path = os.path.normpath(
                    os.path.join(root, '..', '..', '{}.{}'.format(name, ext))
                ) if os.path.split(root)[0].endswith('related_images') else None

                if _append_to_related_images(related_images, related_image_path, default_2d_path):
                    continue
            except ValueError:
                # basename does not inlude extension
                pass

            name, ext = os.path.splitext(filename)
            # 3D, DEFAULT DATAFORMAT
            # Option 1
            # data/
            #     image.pcd
            #     image.png
            default_3d_1_path = os.path.join(root, '{}.pcd'.format(name))
            if _append_to_related_images(related_images, related_image_path, default_3d_1_path):
                continue

            # Option 2
            # data/
            #    image_1/
            #        image_1.pcd
            #        context_1.png
            #        context_2.jpg
            default_3d_2_path = os.path.join(root, '{}.pcd'.format(os.path.basename(root)))
            if _append_to_related_images(related_images, related_image_path, default_3d_2_path):
                continue

    return {k: sorted(v) for k, v in related_images.items()}
