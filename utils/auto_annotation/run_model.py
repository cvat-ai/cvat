import os
import sys
import json
import argparse
import random
import logging
import fnmatch
from operator import xor

import numpy as np
import cv2

work_dir = os.path.dirname(os.path.abspath(__file__))
cvat_dir = os.path.join(work_dir, '..', '..')

sys.path.insert(0, cvat_dir)

from cvat.apps.auto_annotation.inference import run_inference_engine_annotation


def _get_kwargs():
    parser = argparse.ArgumentParser()
    parser.add_argument('--py', help='Path to the python interpt file')
    parser.add_argument('--xml', help='Path to the xml file')
    parser.add_argument('--bin', help='Path to the bin file')
    parser.add_argument('--json', help='Path to the JSON mapping file')

    parser.add_argument('--model-name', help='Name of the model in the Model Manager')
    parser.add_argument('--task-id', type=int, help='ID task used to test the model')

    parser.add_argument('--restricted', dest='restricted', action='store_true')
    parser.add_argument('--unrestricted', dest='restricted', action='store_false')
    parser.add_argument('--image-files', nargs='*', help='Paths to image files you want to test')

    parser.add_argument('--show-images', action='store_true', help='Show the results of the annotation in a window')
    parser.add_argument('--show-image-delay', default=0, type=int, help='Displays the images for a set duration in milliseconds, default is until a key is pressed')
    parser.add_argument('--serialize', default=False, action='store_true', help='Try to serialize the result')
    parser.add_argument('--show-labels', action='store_true', help='Show the labels on the window')
    
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

def find_min_y(array):
    min_ = sys.maxsize
    index = None
    for i, pair in enumerate(array):
        if pair[1] < min_:
            min_ = pair[1]
            index = i

    return array[index]

def _get_docker_files(model_name: str, task_id: int):
    os.environ['DJANGO_SETTINGS_MODULE'] = 'cvat.settings.development'

    import django
    django.setup()

    from cvat.apps.auto_annotation.models import AnnotationModel
    from cvat.apps.engine.models import Task as TaskModel

    task = TaskModel(pk=task_id)
    model = AnnotationModel.objects.get(name=model_name)

    images_dir = task.get_data_dirname()

    py_file = model.interpretation_file.name
    mapping_file = model.labelmap_file.name
    xml_file = model.model_file.name
    bin_file = model.weights_file.name

    image_files = []
    for root, _, filenames in os.walk(images_dir):
        for filename in fnmatch.filter(filenames, '*.jpg'):
            image_files.append(os.path.join(root, filename))

    return py_file, mapping_file, bin_file, xml_file, image_files


def main():
    kwargs = _get_kwargs()

    py_file = kwargs.get('py')
    bin_file = kwargs.get('bin')
    mapping_file = kwargs.get('json')
    xml_file = kwargs.get('xml')

    model_name = kwargs.get('model_name')
    task_id = kwargs.get('task_id')

    is_docker = model_name and task_id

    # xor is `exclusive or`. English is: if one or the other but not both
    if xor(bool(model_name), bool(task_id)):
        logging.critical('Must provide both `--model-name` and `--task-id` together!')
        return

    if is_docker:
        files = _get_docker_files(model_name, task_id)
        py_file = files[0]
        mapping_file = files[1]
        bin_file = files[2]
        xml_file = files[3]
        image_files = files[4]
    else:
        return_ = False
        if not py_file:
            logging.critical('Must provide --py file!')
            return_ = True
        if not bin_file:
            logging.critical('Must provide --bin file!')
            return_ = True
        if not xml_file:
            logging.critical('Must provide --xml file!')
            return_ = True
        if not mapping_file:
            logging.critical('Must provide --json file!')
            return_ = True

        if return_:
            return

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
        try:
            mapping = json.load(json_file)
        except json.decoder.JSONDecodeError:
            logging.critical('JSON file not able to be parsed! Check file')
            return

    try:
        mapping = mapping['label_map']
    except KeyError:
        logging.critical("JSON Mapping file must contain key `label_map`!")
        logging.critical("Exiting")
        return

    mapping = {int(k): v for k, v in mapping.items()}

    restricted = kwargs['restricted']

    if not is_docker:
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


    logging.warning('Inference didn\'t have any errors.')
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
        show_labels = kwargs.get('show_labels')

        for index, data in enumerate(image_data):
            for detection in results['shapes']:
                if not detection['frame'] == index:
                    continue
                points = detection['points']
                label_str = detection['label_id']

                # Cv2 doesn't like floats for drawing
                points = [int(p) for p in points]
                color = random_color()

                if detection['type'] == 'rectangle':
                    cv2.rectangle(data, (points[0], points[1]), (points[2], points[3]), color, 3)

                    if show_labels:
                        cv2.putText(data, label_str, (points[0], points[1] - 7), cv2.FONT_HERSHEY_COMPLEX, 0.6, color, 1)

                elif detection['type'] in ('polygon', 'polyline'):
                    # polylines is picky about datatypes
                    points = pairwise(points)
                    cv2.polylines(data, [points], 1, color)

                    if show_labels:
                        min_point = find_min_y(points)
                        cv2.putText(data, label_str, (min_point[0], min_point[1] - 7), cv2.FONT_HERSHEY_COMPLEX, 0.6, color, 1)

            cv2.imshow(str(index), data)
            cv2.waitKey(show_image_delay)
            cv2.destroyWindow(str(index))

    if kwargs['serialize']:
        os.environ['DJANGO_SETTINGS_MODULE'] = 'cvat.settings.production'
        import django
        django.setup()

        from cvat.apps.engine.serializers import LabeledDataSerializer

        # NOTE: We're actually using `run_inference_engine_annotation`
        # incorrectly here. The `mapping` dict is supposed to be a mapping
        # of integers -> integers and represents the transition from model
        # integers to the labels in the database. We're using a mapping of
        # integers -> strings. For testing purposes, this shortcut is fine.
        # We just want to make sure everything works. Until, that is....
        # we want to test using the label serializer. Then we have to transition
        # back to integers, otherwise the serializer complains about have a string
        # where an integer is expected. We'll just brute force that.

        for shape in results['shapes']:
            # Change the english label to an integer for serialization validation
            shape['label_id'] = 1

        serializer = LabeledDataSerializer(data=results)

        if not serializer.is_valid():
            logging.critical('Data unable to be serialized correctly!')
            serializer.is_valid(raise_exception=True)

if __name__ == '__main__':
    main()
