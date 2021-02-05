# Copyright (C) 2020 Intel Corporation
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

    if args.type == 'video':
        try:
            assert len(args.sources) == 1, 'Unsupporting prepare manifest file for several video files'
            meta_info, smooth_decoding = prepare_meta(
                data_type=args.type, media_file=args.sources[0], chunk_size=args.chunk_size
            )
            manifest = VManifestManager(manifest_path=args.manifest_directory)
            manifest.create(meta_info)
            if smooth_decoding != None and not smooth_decoding:
                print('NOTE: prepared manifest file contains too few key frames for smooth decoding.')
            print('A manifest file had been prepared ')
        except Exception as ex:
            print(ex)
    else:
        meta_info = prepare_meta(data_type=args.type, sources=args.sources, is_sorted=False)
        manifest = IManifestManager(manifest_path=args.manifest_directory)
        manifest.create(meta_info)
if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(base_dir)
    from dataset_manifest.core import prepare_meta, VManifestManager, IManifestManager
    main()