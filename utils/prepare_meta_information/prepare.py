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

    return parser.parse_args()

def main():
    args = get_args()
    try:
        prepare_meta_for_upload(prepare_meta, args.video_file, None, args.meta_directory)
    except Exception:
        print('Impossible to prepare meta information')

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.append(base_dir)
    from cvat.apps.engine.prepare import prepare_meta, prepare_meta_for_upload
    main()