import os
import sys
import json
import argparse
import traceback

os.environ['DJANGO_SETTINGS_MODULE'] = 'cvat.settings.production'

import django
django.setup()

import numpy as np
import cv2

from cvat.apps.auto_annotation.model_manager import run_inference_engine_annotation


def _get_kwargs():
    parser = argparse.ArgumentParser()
    parser.add_argument('--py', required=True, help='Path to the python interpt file')
    parser.add_argument('--xml', required=True, help='Path to the xml file')
    parser.add_argument('--bin', required=True, help='Path to the bin file')
    parser.add_argument('--json', required=True, help='Path to the JSON mapping file')
    parser.add_argument('--restricted', dest='restricted', action='store_true')
    parser.add_argument('--unrestricted', dest='restricted', action='store_false')
    parser.add_argument('--image-files', nargs='*', help='Paths to image files you want to test')
    
    return vars(parser.parse_args())


class InterpreterError(Exception):
    pass


def main():
    kwargs = _get_kwargs()

    py_file = kwargs['py']
    bin_file = kwargs['bin']
    mapping_file = kwargs['json']
    xml_file = kwargs['xml']

    if not os.path.isfile(py_file):
        print('Py file not found! Check the path')
        return

    if not os.path.isfile(bin_file):
        print('Bin file is not found! Check path!')
        return

    if not os.path.isfile(xml_file):
        print('XML File not found! Check path!')
        return

    if not os.path.isfile(mapping_file):
        print('JSON file is not found! Check path!')
        return

    with open(mapping_file) as json_file:
        mapping = json.load(json_file)

    restricted = kwargs['restricted']
    image_files = kwargs.get('image_files')
    print(image_files, kwargs.keys())

    if image_files:
        image_data = [cv2.imread(f) for f in image_files]
    else:
        test_image = np.ones((1024, 1980, 3), np.uint8) * 255
        image_data = [test_image,]
    attribute_spec = {}
    results = run_inference_engine_annotation(image_data, xml_file, bin_file,mapping, attribute_spec, py_file, restricted=restricted)
    print('Program Worked!')

if __name__ == '__main__':
    main()
