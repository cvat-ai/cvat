#!/usr/bin/env python3

# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import sys

if __name__ == "__main__":
    # fix types.py import

    # Remove the script directory from the path, it can be appended by the interpreter
    script_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        sys.path.remove(script_dir)
    except ValueError:
        ...

    # Make the component visible as dataset_manifest module
    base_dir = os.path.dirname(script_dir)
    sys.path.append(base_dir)


import argparse
import re
from glob import glob

from dataset_manifest.core import ImageManifestManager, VideoManifestManager
from dataset_manifest.utils import SortingMethod, find_related_images, is_image, is_video
from tqdm import tqdm


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force",
        action="store_true",
        help="Use this flag to prepare the manifest file for video data "
        "if by default the video does not meet the requirements and a manifest file is not prepared",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        help="Directory where the manifest file will be saved",
        default=os.getcwd(),
    )
    parser.add_argument(
        "--sorting",
        choices=[v[0] for v in SortingMethod.choices()],
        type=str,
        default=SortingMethod.LEXICOGRAPHICAL.value,
    )
    parser.add_argument("source", type=str, help="Source paths")
    return parser.parse_args()


def main():
    args = get_args()

    manifest_directory = os.path.abspath(args.output_dir)
    if not os.path.exists(manifest_directory):
        os.makedirs(manifest_directory)
    source = os.path.abspath(os.path.expanduser(args.source))

    sources = []
    if not os.path.isfile(source):  # directory/pattern with images
        data_dir = None
        if os.path.isdir(source):
            data_dir = source
            for root, _, files in os.walk(source):
                sources.extend([os.path.join(root, f) for f in files if is_image(f)])
        else:
            items = source.lstrip("/").split("/")
            position = 0
            try:
                for item in items:
                    if set(item) & {"*", "?", "[", "]"}:
                        break
                    position += 1
                else:
                    raise Exception("Wrong positional argument")
                assert position != 0, "Wrong pattern: there must be a common root"
                data_dir = source.split(items[position])[0]
            except Exception as ex:
                sys.exit(str(ex))
            sources = list(filter(is_image, glob(source, recursive=True)))

        # If the source is a glob expression, we need additional processing
        abs_root = source
        while abs_root and re.search(r"[*?\[\]]", abs_root):
            abs_root = os.path.split(abs_root)[0]

        scene_paths, related_images = find_related_images(
            sources,
            root_path=abs_root,
            scene_paths=(
                lambda p: not re.search(r"(^|{0})related_images{0}".format(os.sep), p)
                # backward compatibility, deprecated in https://github.com/cvat-ai/cvat/pull/9757
            ),
        )
        sources = [p for p in sources if os.path.relpath(p, abs_root) in scene_paths]
        meta = {k: {"related_images": related_images[k]} for k in related_images}
        try:
            assert len(sources), "A images was not found"
            manifest = ImageManifestManager(manifest_path=manifest_directory)
            manifest.link(
                sources=sources,
                meta=meta,
                sorting_method=args.sorting,
                use_image_hash=True,
                data_dir=data_dir,
            )
            manifest.create(_tqdm=tqdm)
        except Exception as ex:
            sys.exit(str(ex))
    else:  # video
        try:
            assert is_video(
                source
            ), "You can specify a video path or a directory/pattern with images"
            manifest = VideoManifestManager(manifest_path=manifest_directory)
            manifest.link(media_file=source, force=args.force)
            try:
                manifest.create(_tqdm=tqdm)
            except AssertionError as ex:
                if str(ex) == "Too few keyframes":
                    msg = (
                        "NOTE: prepared manifest file contains too few key frames for smooth decoding.\n"
                        "Use --force flag if you still want to prepare a manifest file."
                    )
                    print(msg)
                    sys.exit(2)
                else:
                    raise
        except Exception as ex:
            sys.exit(str(ex))

    print("The manifest file has been prepared")


if __name__ == "__main__":
    main()
