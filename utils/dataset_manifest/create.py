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
from pathlib import Path

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
        type=Path,
        help="Directory where the manifest file will be saved",
        default=Path.cwd(),
    )
    parser.add_argument(
        "--sorting",
        choices=[v[0] for v in SortingMethod.choices()],
        type=str,
        default=SortingMethod.LEXICOGRAPHICAL.value,
    )
    parser.add_argument("source", type=Path, help="Source paths")
    return parser.parse_args()


def main():
    args = get_args()

    manifest_directory: Path = args.output_dir.resolve()
    manifest_directory.mkdir(parents=True, exist_ok=True)
    source: Path = args.source.expanduser().resolve()

    if not source.is_file():  # directory/pattern with images
        data_dir = None
        if source.is_dir():
            data_dir = source
            pattern = "**/*"
        else:
            items = source.parts
            position = 0
            try:
                for item in items:
                    if set(item) & {"*", "?", "[", "]"}:
                        break
                    position += 1
                else:
                    raise Exception("Wrong positional argument")

                data_dir = Path(*items[:position])

                assert data_dir.parents, "Wrong pattern: there must be a common root"
            except Exception as ex:
                sys.exit(str(ex))

            pattern = os.fspath(source.relative_to(data_dir))

        sources = list(filter(is_image, data_dir.glob(pattern)))

        # If the source is a glob expression, we need additional processing
        abs_root = source
        while re.search(r"[*?\[\]]", os.fspath(abs_root)):
            abs_root = abs_root.parent

        scene_paths, related_images = find_related_images(
            sources,
            root_path=abs_root,
            # backward compatibility, deprecated in https://github.com/cvat-ai/cvat/pull/9757
            is_scene_path=(lambda p: not "related_images" in p.parts),
        )
        sources = [p for p in sources if p.relative_to(abs_root) in scene_paths]
        meta = {
            os.fspath(k): {"related_images": [ri.as_posix() for ri in related_images[k]]}
            for k in related_images
        }
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
