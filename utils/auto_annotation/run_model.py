import os
import sys
import json
import argparse
import random
import logging

import numpy as np
import cv2

work_dir = os.path.dirname(os.path.abspath(__file__))
cvat_dir = os.path.join(work_dir, '..', '..')

sys.path.insert(0, cvat_dir)

from cvat.apps.auto_annotation.inference import run_inference_engine_annotation


def _get_kwargs():
    parser = argparse.ArgumentParser()
    parser.add_argument('--py', required=True, help='Path to the python interpt file')
    parser.add_argument('--xml', required=True, help='Path to the xml file')
    parser.add_argument('--bin', required=True, help='Path to the bin file')
    parser.add_argument('--json', required=True, help='Path to the JSON mapping file')
    parser.add_argument('--restricted', dest='restricted', action='store_true')
    parser.add_argument('--unrestricted', dest='restricted', action='store_false')
    parser.add_argument('--image-files', nargs='*', help='Paths to image files you want to test')

    parser.add_argument('--show-images', action='store_true', help='Show the results of the annotation in a window')
    parser.add_argument('--show-image-delay', default=0, type=int, help='Displays the images for a set duration in milliseconds, default is until a key is pressed')
    
    return vars(parser.parse_args())


def random_color():
    rgbl=[255,0,0]
    random.shuffle(rgbl)
    return tuple(rgbl)


def pairwise(iterable):
    result = []
    for i in range(0, len(iterable) - 1, 2):
        result.append((iterable[i], iterable[i+1]))
    return np.array(result, dtype=np.int32)


def main():
    kwargs = _get_kwargs()

    py_file = kwargs['py']
    bin_file = kwargs['bin']
    mapping_file = kwargs['json']
    xml_file = kwargs['xml']

    if not os.path.isfile(py_file):
        logging.critical('Py file not found! Check the path')
        return

    if not os.path.isfile(bin_file):
        logging.critical('Bin file is not found! Check path!')
        return

    if not os.path.isfile(xml_file):
        logging.critical('XML File not found! Check path!')
        return

    if not os.path.isfile(mapping_file):
        logging.critical('JSON file is not found! Check path!')
        return

    with open(mapping_file) as json_file:
        mapping = json.load(json_file)

    try:
        mapping = mapping['label_map']
    except KeyError:
        logging.critical("JSON Mapping file must contain key `label_map`!")
        logging.critical("Exiting")
        return

    mapping = {int(k): v for k, v in mapping.items()}

    restricted = kwargs['restricted']
    image_files = kwargs.get('image_files')

    if image_files:
        image_data = [cv2.imread(f) for f in image_files]
    else:
        test_image = np.ones((1024, 1980, 3), np.uint8) * 255
        image_data = [test_image,]
    attribute_spec = {}

    results = run_inference_engine_annotation(image_data,
                                              xml_file,
                                              bin_file,
                                              mapping,
                                              attribute_spec,
                                              py_file,
                                              restricted=restricted)

    logging.warning('Program didn\'t have any errors.')
    show_images = kwargs.get('show_images', False)

    if show_images:
        if image_files is None:
            logging.critical("Warning, no images provided!")
            logging.critical('Exiting without presenting results')
            return

        if not results['shapes']:
            logging.warning(str(results))
            logging.critical("No objects detected!")
            return

        show_image_delay = kwargs['show_image_delay']
        for index, data in enumerate(image_data):
            for detection in results['shapes']:
                if not detection['frame'] == index:
                    continue
                points = detection['points']
                # Cv2 doesn't like floats for drawing
                points = [int(p) for p in points]
                color = random_color()
                if detection['type'] == 'rectangle':
                    cv2.rectangle(data, (points[0], points[1]), (points[2], points[3]), color, 3)
                elif detection['type'] in ('polygon', 'polyline'):
                    # polylines is picky about datatypes
                    points = pairwise(points)
                    cv2.polylines(data, [points], 1, color)
            cv2.imshow(str(index), data)
            cv2.waitKey(show_image_delay)
            cv2.destroyWindow(str(index))

if __name__ == '__main__':
    main()
