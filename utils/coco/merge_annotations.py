import argparse
import cv2
import glog
import json
import numpy as np
import os

from difflib import SequenceMatcher
from tqdm import tqdm

from pycocotools import coco as coco_loader


def parse_args():
    """Parse arguments of command line"""
    parser = argparse.ArgumentParser(
        description='Merge annotations in COCO representation into one'
    )
    parser.add_argument(
        '--input-dir', required=True,
        help='directory with input annotations in *.json format'
    )
    parser.add_argument(
        '--output', required=True,
        help='output annotation file'
    )
    parser.add_argument(
        '--images-map', required=True,
        help='file with map of datasets and its images path (json format)'
    )
    parser.add_argument(
        '--draw', default=None,
        help='directory to save images with its segments. By default is disabled'
    )
    return parser.parse_args()


def draw_bboxes_and_masks(img, annotations, input_dir):
    """ Draw bounding boxes and contours of masks on image and save it.
    :param img: file name of image (is getting from the same field in annotation)
    :param annotations: list of bonding boxes and segments on the image
    :param input_dir: base directory to save images
    """
    input_file = os.path.join(input_dir, img['file_name'])
    save_path = os.path.join(os.path.dirname(input_file), 'draw')
    if not os.path.exists(save_path):
        os.makedirs(save_path)
    output_file = os.path.join(save_path, os.path.basename(input_file))

    img = cv2.imread(input_file)

    yellow = (0, 255, 255)
    red = (0, 0, 255)

    for ann in annotations:
        cat_id = str(ann['category_id'])
        bbox = [int(ann['bbox'][0]), int(ann['bbox'][1]),
                int(ann['bbox'][0] + ann['bbox'][2]), int(ann['bbox'][1] + ann['bbox'][3])]
        masks = ann['segmentation']

        for mask in masks:
            i = 0
            points = []
            while i < len(mask):
                x = int(mask[i])
                y = int(mask[i + 1])
                points.append([x, y])
                i += 2
            img = cv2.polylines(img, np.int32([points]), True, yellow, 1)

        img = cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), red, 1)
        x = bbox[0] + (bbox[2] - bbox[0]) // 4
        y = bbox[1] + (bbox[3] - bbox[1]) // 2
        cv2.putText(img, cat_id, (x, y), cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, red, 1)
    cv2.imwrite(output_file, img)


def is_json_file(filename):
    """ Check if file has a *.json type (just check an extension)
    :param filename: name of file
    :return: True if file has a *.json type
    """
    return True if filename.lower().endswith('.json') else False


def get_anno_list(directory):
    """ Get list of files in directory
    :param directory: directory to parse
    :return: list of files in the directory in format [name1.ext, name2.ext, ...]
    """
    files = []
    for file in os.listdir(directory):
        if is_json_file(file):
            files.append(file)
    return files


def common_path_images(images_map):
    """ Define which part of paths to images is common for all of them
    :param images_map: dictionary of matched datasets and its images paths. Format:
                       {
                           'dataset1.json': '/path/to/images/for/dataset1',
                           'dataset2.json': '/path/to/images/for/dataset2',
                            ...
                        }
    :return: string with a common part of the images paths
    """
    common_path = ''
    for _, path in images_map.items():
        if common_path == '':
            common_path = path
        else:
            match = SequenceMatcher(None, common_path, path).find_longest_match(0, len(common_path), 0, len(path))
            common_path = common_path[match.a: match.a + match.size]
    return common_path


def merge_annotations(directory, anno_list, images_map):
    """ Merge several annotations in COCO representation into one
    :param directory: base directory where is saved all datasets which is needed to merge
    :param anno_list: list of annotations to merge. [dataset1.json, dataset2.json, ...]
    :param images_map: dictionary of matched datasets and its images paths
    :return: merged annotation
    """
    merged_anno = None
    first_step = True
    reference_classes = None
    common_path = common_path_images(images_map)
    for anno_file in tqdm(anno_list, 'Parsing annotations...'):
        if anno_file not in images_map:
            glog.warning('Dataset <{}> is absent in images-map file and will be ignored!'.format(anno_file))
            continue
        img_prefix = images_map[anno_file].replace(common_path, '')
        with open(os.path.join(directory, anno_file)) as f:
            data = json.load(f)
            for img in data['images']:
                img['file_name'] = os.path.join(img_prefix, img['file_name'])
            if first_step:
                merged_anno = data
                reference_classes = data['categories']
                first_step = False
            else:
                classes = data['categories']
                if classes != reference_classes:
                    glog.warning('Categories field in dataset <{}> has another classes and will be ignored!'
                                 .format(anno_file))
                    continue
                add_img_id = len(merged_anno['images'])
                add_obj_id = len(merged_anno['annotations'])
                for img in data['images']:
                    img['id'] += add_img_id
                for ann in data['annotations']:
                    ann['id'] += add_obj_id
                    ann['image_id'] += add_img_id
                merged_anno['images'].extend(data['images'])
                merged_anno['annotations'].extend(data['annotations'])
    return merged_anno


def main():
    args = parse_args()
    anno_list = get_anno_list(args.input_dir)
    with open(args.images_map) as f:
        images_map = json.load(f)

    result_annotation = merge_annotations(args.input_dir, anno_list, images_map)

    # Save created annotation
    glog.info('Saving annotation...')
    with open(args.output, 'w') as outfile:
        json.dump(result_annotation, outfile)
    glog.info('Annotation was saved in <{}> successfully'.format(args.output))

    # Try to load created annotation via cocoapi
    try:
        glog.info('Trying to load annotation <{}> via cocoapi...'.format(args.output))
        coco_loader.COCO(args.output)
    except:
        raise
    else:
        glog.info('Annotation in COCO representation <{}> created from \n<{}> \nsuccessfully!'
                  .format(args.output, anno_list))

    if args.draw:
        for img in tqdm(result_annotation['images'], 'Drawing and saving images...'):
            ann_for_img = []
            for ann in result_annotation['annotations']:
                if ann['image_id'] == img['id']:
                    ann_for_img.append(ann)
            draw_bboxes_and_masks(img, ann_for_img, args.draw)


if __name__ == "__main__":
    main()