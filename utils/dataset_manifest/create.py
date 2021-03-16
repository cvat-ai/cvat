# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT
import argparse
import mimetypes
import os
import sys
from glob import glob

def _define_data_type(media):
    media_type, _ = mimetypes.guess_type(media)
    if media_type:
        return media_type.split('/')[0]

def _is_video(media_file):
    return _define_data_type(media_file) == 'video'

def _is_image(media_file):
    return _define_data_type(media_file) == 'image'

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true',
        help='Use this flag to prepare the manifest file for video data '
             'if by default the video does not meet the requirements and a manifest file is not prepared')
    parser.add_argument('manifest_directory',type=str, help='Directory where the manifest file will be saved')
    parser.add_argument('source', type=str, help='Source paths')
    return parser.parse_args()

def main():
    args = get_args()

    manifest_directory = os.path.abspath(args.manifest_directory)
    os.makedirs(manifest_directory, exist_ok=True)
    source = os.path.abspath(args.source)

    sources = []
    if not os.path.isfile(source): # directory/pattern with images
        data_dir = None
        if os.path.isdir(source):
            data_dir = source
            for root, _, files in os.walk(source):
                sources.extend([os.path.join(root, f) for f in files if _is_image(f)])
        else:
            items = source.lstrip('/').split('/')
            position = 0
            try:
                for item in items:
                    if set(item) & {'*', '?', '[', ']'}:
                        break
                    position += 1
                else:
                    raise Exception('Wrong positional argument')
                assert position != 0, 'Wrong pattern: there must be a common root'
                data_dir = source.split(items[position])[0]
            except Exception as ex:
                sys.exit(str(ex))
            sources = list(filter(_is_image, glob(source, recursive=True)))
        try:
            assert len(sources), 'A images was not found'
            meta_info = prepare_meta(data_type='images', sources=sources,
                is_sorted=False, use_image_hash=True, data_dir=data_dir)
            manifest = ImageManifestManager(manifest_path=manifest_directory)
            manifest.create(meta_info)
        except Exception as ex:
            sys.exit(str(ex))
    else: # video
        try:
            assert _is_video(source), 'You can specify a video path or a directory/pattern with images'
            meta_info, smooth_decoding = prepare_meta(
                data_type='video', media_file=source, chunk_size=36
            )
            if smooth_decoding is not None and not smooth_decoding:
                if not args.force:
                    msg = 'NOTE: prepared manifest file contains too few key frames for smooth decoding.\n' \
                        'Use --force flag if you still want to prepare a manifest file.'
                    print(msg)
                    sys.exit(0)
            manifest = VideoManifestManager(manifest_path=manifest_directory)
            manifest.create(meta_info)
        except Exception as ex:
            sys.exit(str(ex))

    print('The manifest file has been prepared')
if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(base_dir)
    from dataset_manifest.core import prepare_meta, VideoManifestManager, ImageManifestManager
    main()