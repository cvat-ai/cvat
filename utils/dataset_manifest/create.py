# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT
import argparse
import os
import sys

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', type=str, choices=('video', 'images'), help='Type of datset data', required=True)
    parser.add_argument('manifest_directory',type=str, help='Directory where the manifest file will be saved')
    parser.add_argument('--chunk_size', type=int,
        help='Chunk size that will be specified when creating the task with specified video and generated manifest file')
    parser.add_argument('sources', nargs='+', help='Source paths')
    return parser.parse_args()

def main():
    args = get_args()

    manifest_directory = os.path.abspath(args.manifest_directory)
    os.makedirs(manifest_directory, exist_ok=True)
    try:
        for source in args.sources:
            assert os.path.exists(source), 'A file {} not found'.format(source)
    except AssertionError as ex:
        sys.exit(str(ex))
    if args.type == 'video':
        try:
            assert len(args.sources) == 1, 'Unsupporting prepare manifest file for several video files'
            meta_info, smooth_decoding = prepare_meta(
                data_type=args.type, media_file=args.sources[0], chunk_size=args.chunk_size
            )
            manifest = VideoManifestManager(manifest_path=manifest_directory)
            manifest.create(meta_info)
            if smooth_decoding is not None and not smooth_decoding:
                print('NOTE: prepared manifest file contains too few key frames for smooth decoding.')
        except Exception as ex:
            print(ex)
    else:
        meta_info = prepare_meta(data_type=args.type, sources=args.sources,
            is_sorted=False, use_image_hash=True)
        manifest = ImageManifestManager(manifest_path=manifest_directory)
        manifest.create(meta_info)
    print('A manifest file has been prepared ')
if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(base_dir)
    from dataset_manifest.core import prepare_meta, VideoManifestManager, ImageManifestManager
    main()