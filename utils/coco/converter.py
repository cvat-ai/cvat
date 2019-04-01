#!/usr/bin/env python
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import absolute_import, division, print_function

import argparse
import glog as log
import numpy as np
import os.path as osp
import json
import cv2
import sys
from lxml import etree
from tqdm import tqdm
from skimage import measure
from pycocotools import mask as mask_util
from pycocotools import coco as coco_loader


def parse_args():
    """Parse arguments of command line"""
    parser = argparse.ArgumentParser(
        description='Convert CVAT annotation with instance segmentation ''to COCO representation'
    )
    parser.add_argument(
        '--cvat-xml', required=True,
        help='input file with CVAT annotation in *.xml format'
    )
    parser.add_argument(
        '--output', default=None,
        help='output annotation file. If not defined, the output file name will be created from input file name'
    )
    parser.add_argument(
        '--image-dir', required=True,
        help='directory with images from annotation'
    )
    parser.add_argument(
        '--labels', default=None,
        help='path to file with labels'
    )
    parser.add_argument(
        '--draw', default=None,
        help='directory to save images with its segments. By default is disabled'
    )
    parser.add_argument(
        '--draw_labels', action='store_true',
        help='insert in output images labels of objects. By default is false'
    )
    parser.add_argument(
        '--use_background_label', action='store_true',
        help='insert in output annotation objects with label \'background\'. By default is false'
    )
    parser.add_argument(
        '--polygon-area-threshold', type=int, default=1,
        help='polygons with area less than this value will be ignored. By default set to 1'
    )
    return parser.parse_args()


def mask_to_polygon(mask, tolerance=1.0, area_threshold=1):
    """Convert object's mask to polygon [[x1,y1, x2,y2 ...], [...]]
    Args:
        mask: object's mask presented as 2D array of 0 and 1
        tolerance: maximum distance from original points of polygon to approximated
        area_threshold: if area of a polygon is less than this value, remove this small object
    """
    polygons = []
    # pad mask with 0 around borders
    padded_mask = np.pad(mask, pad_width=1, mode='constant', constant_values=0)
    contours = measure.find_contours(padded_mask, 0.5)
    # Fix coordinates after padding
    contours = np.subtract(contours, 1)
    for contour in contours:
        if not np.array_equal(contour[0], contour[-1]):
            contour = np.vstack((contour, contour[0]))
        contour = measure.approximate_polygon(contour, tolerance)
        if len(contour) > 2:
            contour = np.flip(contour, axis=1)
            reshaped_contour = []
            for xy in contour:
                reshaped_contour.append(xy[0])
                reshaped_contour.append(xy[1])
            for i in range(0, len(reshaped_contour)):
                if reshaped_contour[i] < 0:
                    reshaped_contour[i] = 0
            # Check if area of a polygon is enough
            rle = mask_util.frPyObjects([reshaped_contour], mask.shape[0], mask.shape[1])
            area = mask_util.area(rle)
            if sum(area) > area_threshold:
                polygons.append(reshaped_contour)
    return polygons


def draw_polygons(polygons, img_name, input_dir, output_dir, draw_labels):
    """Draw on image contours of its objects and save
    Args:
        polygons: all objects on image represented as 2D array of objects' contours
        img_name: name of image file
        input_dir: path to directory with images from annotation
        output_dir: directory to save images
    """
    name = osp.basename(img_name)
    input_file = osp.join(input_dir, name)
    output_file = osp.join(output_dir, name)
    img = cv2.imread(input_file)
    yellow = (0, 255, 255)
    red = (0, 0, 255)
    for poly in polygons:
        label = poly['label']
        _, bbox = polygon_area_and_bbox(poly['points'], img.shape[0], img.shape[1])
        for j in range(0, len(poly['points'])):
            i = 0
            points = []
            while i < len(poly['points'][j]):
                x = int(poly['points'][j][i])
                y = int(poly['points'][j][i + 1])
                points.append([x, y])
                i += 2
            bbox = [int(value) for value in bbox]
            img = cv2.polylines(img, np.int32([points]), True, yellow, 1)
            img = cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[0] + bbox[2], bbox[1] + bbox[3]), red, 2)
            if draw_labels:
                x = bbox[0] + bbox[2] // 4
                y = bbox[1] + bbox[3] // 2
                cv2.putText(img, label, (x, y), cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, red, 1)
    cv2.imwrite(output_file, img)


def fix_segments_intersections(polygons, height, width, img_name, use_background_label,
                               threshold=0.0, ratio_tolerance=0.001, area_threshold=1):
    """Find all intersected regions and crop contour for back object by objects which
        are in front of the first one. It is related to a specialty of segmentation
        in CVAT annotation. Intersection is calculated via function 'iou' from cocoapi
    Args:
        polygons: all objects on image represented as 2D array of objects' contours
        height: height of image
        width: width of image
        img_name: name of image file
        threshold: threshold of intersection over union of two objects.
            By default is set to 0 and processes any two intersected objects
        ratio_tolerance: used for situation when one object is fully or almost fully
            inside another one and we don't want make "hole" in one of objects
    """
    converted_polygons = []
    empty_polygon = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    # Convert points of polygons from string to coco's array.
    # All polygons must be sorted in order from bottom to top
    for polygon in polygons:
        label = polygon['label']
        points = polygon['points'].split(';')
        new_polygon = []
        for xy in points:
            x = float(xy.split(',')[0])
            y = float(xy.split(',')[1])
            new_polygon.append(x)
            new_polygon.append(y)
        converted_polygons.append({'label': label, 'points': new_polygon})

    for i in range(0, len(converted_polygons)):
        rle_bottom = mask_util.frPyObjects([converted_polygons[i]['points']], height, width)
        segment_overlapped = False
        for j in range(i + 1, len(converted_polygons)):
            rle_top = mask_util.frPyObjects([converted_polygons[j]['points']], height, width)
            iou = mask_util.iou(rle_bottom, rle_top, [0, 0])
            area_top = sum(mask_util.area(rle_top))
            area_bottom = sum(mask_util.area(rle_bottom))
            if area_bottom == 0:
                continue
            area_ratio = area_top / area_bottom
            sum_iou = sum(iou)

            # If segment is fully inside another one, save this segment as is
            if area_ratio - ratio_tolerance < sum_iou[0] < area_ratio + ratio_tolerance:
                continue
            # Check situation when bottom segment is fully inside top.
            # It means that in annotation is mistake. Save this segment as is
            if 1 / area_ratio - ratio_tolerance < sum_iou[0] < 1 / area_ratio + ratio_tolerance:
                continue

            if sum_iou[0] > threshold:
                segment_overlapped = True
                bottom_mask = np.array(mask_util.decode(rle_bottom), dtype=np.uint8)
                top_mask = np.array(mask_util.decode(rle_top), dtype=np.uint8)

                bottom_mask = np.subtract(bottom_mask, top_mask)
                bottom_mask[bottom_mask > 1] = 0

                bottom_mask = np.sum(bottom_mask, axis=2)
                bottom_mask = np.array(bottom_mask > 0, dtype=np.uint8)
                converted_polygons[i]['points'] = mask_to_polygon(bottom_mask, area_threshold=area_threshold)
                # If some segment is empty, do small fix to avoid error in cocoapi function
                if len(converted_polygons[i]['points']) == 0:
                    converted_polygons[i]['points'] = [empty_polygon]
                rle_bottom = mask_util.frPyObjects(converted_polygons[i]['points'], height, width)
        if not segment_overlapped:
            converted_polygons[i]['points'] = [converted_polygons[i]['points']]

    output_polygons = []
    for i in range(0, len(converted_polygons)):
        if not use_background_label and converted_polygons[i]['label'] == 'background':
            continue
        poly_len = len(converted_polygons[i]['points'])
        if poly_len == 0 or converted_polygons[i]['points'] == [empty_polygon]:
            log.warning('Image <{}> has an empty polygon with label <{}>. '
                        'Perhaps there is a mistake in annotation'.
                        format(img_name, converted_polygons[i]['label']))
        else:
            output_polygons.append(converted_polygons[i])

    return output_polygons


def polygon_area_and_bbox(polygon, height, width):
    """Calculate area of object's polygon and bounding box around it
    Args:
        polygon: objects contour represented as 2D array
        height: height of object's region (use full image)
        width: width of object's region (use full image)
    """
    rle = mask_util.frPyObjects(polygon, height, width)
    area = mask_util.area(rle)
    bbox = mask_util.toBbox(rle)
    bbox = [min(bbox[:, 0]),
            min(bbox[:, 1]),
            max(bbox[:, 0] + bbox[:, 2]) - min(bbox[:, 0]),
            max(bbox[:, 1] + bbox[:, 3]) - min(bbox[:, 1])]
    return area, bbox


def insert_license_data(result_annotation):
    """Fill license fields in annotation by blank data
    Args:
        result_annotation: output annotation in COCO representation
    """
    result_annotation['licenses'].append({
        'name': '',
        'id': 0,
        'url': ''
    })


def insert_info_data(xml_root, result_annotation):
    """Fill available information of annotation
    Args:
        xml_root: root for xml parser
        result_annotation: output annotation in COCO representation
    """
    log.info('Reading information data...')
    version = ''
    date = ''
    description = ''
    year = ''
    for child in xml_root:
        if child.tag == 'version':
            version = child.text
        if child.tag == 'meta':
            for task in child:
                for entry in task:
                    if entry.tag == 'name':
                        description = entry.text
                    if entry.tag == 'created':
                        date = entry.text
    date = date.split(' ')[0]
    year = date.split('-')[0]
    result_annotation['info'] = {
        'contributor': '',
        'date_created': date,
        'description': description,
        'url': '',
        'version': version,
        'year': year
    }
    log.info('Found the next information data: {}'.format(result_annotation['info']))


def insert_categories_data(xml_root, use_background_label, result_annotation, labels_file=None):
    """Get labels from input annotation and fill categories field in output annotation
    Args:
        xml_root: root for xml parser
        use_background_label: key to enable using label background
        result_annotation: output annotation in COCO representation
        labels_file: path to file with labels names.
                     If not defined, parse annotation to get labels names
    """
    def get_categories(names, bg_found, use_background_label, sort=False):
        bg_used = False
        category_map = {}
        categories = []
        # Sort labels by its names to make the same order of ids for different annotations
        if sort:
            names.sort()
        # Always use id = 0 for background
        if bg_found and use_background_label:
            category_map['background'] = 0
            bg_used = True
        cat_id = 1
        # Define id for all labels beginning from 1
        for name in names:
            if name == 'background':
                continue
            category_map[name] = cat_id
            categories.append({'id': cat_id, 'name': name, 'supercategory': ''})
            cat_id += 1
        return category_map, categories, bg_used

    categories = []
    category_map = {}
    label_names = []
    bg_found = False
    bg_used = False

    if labels_file is None:
        log.info('Reading labels from annotation...')
        for label in xml_root.iter('label'):
            for name in label.findall("./name"):
                if name.text == 'background':
                    bg_found = True
                    continue
                label_names.append(name.text)
        if len(label_names) == 0:
            log.info('Labels in annotation were not found. Please use \'--labels\' argument to define file with labels.')
        else:
            category_map, categories, bg_used = get_categories(label_names, bg_found, use_background_label, sort=True)
    else:
        log.info('Parsing labels from file <{}>...'.format(labels_file))
        with open(labels_file, 'r') as file:
            string = '  '
            while string != '' and string != '\n':
                string = file.readline()
                labels = string.split(' ')
                for label in labels:
                    if label == '\n' or label == '':
                        continue
                    label = label.replace('\n', '')
                    if label == 'background':
                        bg_found = True
                        continue
                    label_names.append(label)
            category_map, categories, bg_used = get_categories(label_names, bg_found, use_background_label)

    if len(categories) == 0:
        raise ValueError('Categories list is empty. Something wrong.')

    result_annotation['categories'] = categories
    log.info('Found the next labels: {}'.format(category_map))
    if bg_found and not bg_used:
        log.warning('Label <background> was found but not used. '
                    'To enable it should use command line argument [--use_background_label]')
    return category_map


def insert_image_data(image, result_annotation):
    """Get data from input annotation for image and fill fields for this image in output annotation
    Args:
        image: dictionary with data for image from original annotation
        path_to_images: path to directory with images from annotation
        result_annotation: output annotation in COCO representation
    """
    new_img = {}
    new_img['coco_url'] = ''
    new_img['date_captured'] = ''
    new_img['flickr_url'] = ''
    new_img['license'] = 0
    new_img['id'] = image['id']
    new_img['file_name'] = osp.basename(image['name'])
    new_img['height'] = int(image['height'])
    new_img['width'] = int(image['width'])
    result_annotation['images'].append(new_img)


def insert_annotation_data(image, category_map, segm_id, object, img_dims, result_annotation):
    """Get data from input annotation for object and fill fields for this object in output annotation
    Args:
        image: dictionary with data for image from input CVAT annotation
        category_map: map for categories represented in the annotation {name: id}
        segm_id: identificator of current object
        object: includes data for the object [label, polygon]
        img_dims: dimensions of image [height, width]
        result_annotation: output annotation in COCO representation
    """
    new_anno = {}
    new_anno['category_id'] = category_map[object['label']]
    new_anno['id'] = segm_id
    new_anno['image_id'] = image['id']
    new_anno['iscrowd'] = 0
    new_anno['segmentation'] = object['points']
    area, bbox = polygon_area_and_bbox(object['points'], img_dims[0], img_dims[1])
    new_anno['area'] = float(np.sum(area))
    new_anno['bbox'] = bbox
    result_annotation['annotations'].append(new_anno)


def main():
    args = parse_args()
    xml_file_name = args.cvat_xml
    if args.output is not None:
        output_file_name = args.output
    else:
        output_file_name = args.cvat_xml.split('.xml')[0] + '.json'
        log.info('Output file name set to: {}'.format(output_file_name))
    root = etree.parse(xml_file_name).getroot()

    if args.draw is not None:
        log.info('Draw key was enabled. Images will be saved in directory <{}>'.format(args.draw))

    result_annotation = {
        'licenses': [],
        'info': {},
        'categories': [],
        'images': [],
        'annotations': []
    }

    insert_license_data(result_annotation)
    insert_info_data(root, result_annotation)
    category_map = insert_categories_data(root, args.use_background_label, result_annotation, labels_file=args.labels)

    if len(category_map) == 0:
        sys.exit('Labels were not found. Be sure that annotation <{}> includes field <labels> or '
                 'annotation directory includes file <labels.txt>'.format(xml_file_name))

    segm_id = 0
    z_order_off_counter = 0
    # Parse original annotation
    for img in tqdm(root.iter('image'), desc='Processing images from ' + xml_file_name):
        image = {}
        for key, value in img.items():
            image[key] = value
        img_name = osp.join(args.image_dir, osp.basename(image['name']))
        if not osp.isfile(img_name):
            log.warning('Image <{}> is not available'.format(img_name))
        image['polygon'] = []
        z_order_on_counter = 0
        polygon_counter = 0
        for poly in img.iter('polygon'):
            polygon = {}
            for key, value in poly.items():
                polygon[key] = value
                if key == 'z_order':
                    z_order_on_counter += 1
            polygon_counter += 1
            image['polygon'].append(polygon)
        # If at least one of polygons on image does not have field 'z_order' do not sort them
        if z_order_on_counter == polygon_counter:
            image['polygon'].sort(key=lambda x: int(x['z_order']))
        else:
            z_order_off_counter += 1

        # Create new image
        image['id'] = int(image['id'])
        insert_image_data(image, result_annotation)
        height = result_annotation['images'][-1]['height']
        width = result_annotation['images'][-1]['width']
        image['polygon'] = fix_segments_intersections(image['polygon'], height, width,
                                                      image['name'], args.use_background_label,
                                                      area_threshold=args.polygon_area_threshold)

        # Create new annotation for this image
        for poly in image['polygon']:
            insert_annotation_data(image, category_map, segm_id, poly, [height, width], result_annotation)
            segm_id += 1

        # Draw contours of objects on image
        if args.draw is not None:
            draw_polygons(image['polygon'], image['name'], args.image_dir, args.draw, args.draw_labels)

    log.info('Processed images: {}'.format(len(result_annotation['images'])))
    log.info('Processed objects: {}'.format(len(result_annotation['annotations'])))
    if z_order_off_counter > 0:
        log.warning('Annotation does not have a field \'z_order\' for {} image(s). '
                    'Overlapped objects may be cropped incorrectly!'. format(z_order_off_counter))

    # Save created annotation
    log.info('Saving annotation...')
    with open(output_file_name, 'w') as outfile:
        json.dump(result_annotation, outfile)
    log.info('Annotation was saved in <{}> successfully'.format(output_file_name))

    # Try to load created annotation via cocoapi
    try:
        log.info('Trying to load annotation <{}> via cocoapi...'.format(output_file_name))
        coco_loader.COCO(output_file_name)
    except:
        raise
    else:
        log.info('Conversion <{}> --> <{}> has finished successfully!'.format(xml_file_name, output_file_name))


if __name__ == "__main__":
    main()
