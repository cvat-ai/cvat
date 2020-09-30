# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT
import argparse
import sys
import os

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('video_file',
        type=str,
        help='Path to video file')
    parser.add_argument('meta_directory',
        type=str,
        help='Directory where the file with meta information will be saved')
    parser.add_argument('-chunk_size',
        type=int,
        help='Chunk size that will be specified when creating the task with specified video and generated meta information')

    return parser.parse_args()

def main():
    args = get_args()
    try:
        smooth_decoding = prepare_meta_for_upload(prepare_meta, args.video_file, None, args.meta_directory, args.chunk_size)
        print('Meta information for video has been prepared')

        if smooth_decoding != None and not smooth_decoding:
            print('NOTE: prepared meta information contains too few key frames for smooth decoding.')
    except Exception:
        print('Impossible to prepare meta information')

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.append(base_dir)
    from cvat.apps.engine.prepare import prepare_meta, prepare_meta_for_upload
    main()