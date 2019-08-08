# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "COCO",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "JSON",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
    ],
}

def dump(file_object, annotations):
    import numpy as np
    import json
    from skimage import measure
    from pycocotools import mask as mask_util
    from pycocotools import coco as coco_loader

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
                for rcontour in reshaped_contour:
                    if rcontour < 0:
                        rcontour = 0
                # Check if area of a polygon is enough
                rle = mask_util.frPyObjects([reshaped_contour], mask.shape[0], mask.shape[1])
                area = mask_util.area(rle)
                if sum(area) > area_threshold:
                    polygons.append(reshaped_contour)
        return polygons

    def fix_segments_intersections(polygons, height, width, img_name,
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
        empty_polygon = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

        for i, _ in enumerate(polygons):
            rle_bottom = mask_util.frPyObjects([polygons[i]['points']], height, width)
            segment_overlapped = False
            for j in range(i + 1, len(polygons)):
                rle_top = mask_util.frPyObjects([polygons[j]['points']], height, width)
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
                    polygons[i]['points'] = mask_to_polygon(bottom_mask, area_threshold=area_threshold)
                    # If some segment is empty, do small fix to avoid error in cocoapi function
                    if len(polygons[i]['points']) == 0:
                        polygons[i]['points'] = [empty_polygon]
                    rle_bottom = mask_util.frPyObjects(polygons[i]['points'], height, width)
            if not segment_overlapped:
                polygons[i]['points'] = [polygons[i]['points']]

        output_polygons = []
        for polygon in polygons:
            poly_len = len(polygon['points'])
            if poly_len != 0 and polygon['points'] != [empty_polygon]:
                output_polygons.append(polygon)

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


    def insert_info_data(annotations, result_annotation):
        """Fill available information of annotation
        Args:
            xml_root: root for xml parser
            result_annotation: output annotation in COCO representation
        """
        version = annotations.data.version
        description = annotations.meta['task']['name']
        date = annotations.meta['dumped']
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


    def insert_categories_data(annotations, result_annotation):
        """Get labels from input annotation and fill categories field in output annotation
        Args:
            xml_root: root for xml parser
            result_annotation: output annotation in COCO representation
            labels_file: path to file with labels names.
                        If not defined, parse annotation to get labels names
        """
        def get_categories(names, sort=False):
            category_map = {}
            categories = []
            # Sort labels by its names to make the same order of ids for different annotations
            if sort:
                names.sort()
            cat_id = 0
            for name in names:
                category_map[name] = cat_id
                categories.append({'id': cat_id, 'name': name, 'supercategory': ''})
                cat_id += 1
            return category_map, categories

        categories = []
        category_map = {}
        label_names = [label[1]["name"] for label in annotations.meta['task']['labels']]

        category_map, categories = get_categories(label_names, sort=True)

        result_annotation['categories'] = categories
        return category_map


    def insert_image_data(image, result_annotation):
        """Get data from input annotation for image and fill fields for this image in output annotation
        Args:
            image: dictionary with data for image from original annotation
            result_annotation: output annotation in COCO representation
        """
        new_img = {}
        new_img['coco_url'] = ''
        new_img['date_captured'] = ''
        new_img['flickr_url'] = ''
        new_img['license'] = 0
        new_img['id'] = image.frame
        new_img['file_name'] = image.name
        new_img['height'] = image.height
        new_img['width'] = image.width
        result_annotation['images'].append(new_img)


    def insert_annotation_data(image, category_map, segm_id, obj, result_annotation):
        """Get data from input annotation for object and fill fields for this object in output annotation
        Args:
            image: dictionary with data for image from input CVAT annotation
            category_map: map for categories represented in the annotation {name: id}
            segm_id: identificator of current object
            obj: includes data for the object [label, polygon]
            result_annotation: output annotation in COCO representation
        """
        new_anno = {}
        new_anno['category_id'] = category_map[obj['label']]
        new_anno['id'] = segm_id
        new_anno['image_id'] = image.frame
        new_anno['iscrowd'] = 0
        new_anno['segmentation'] = obj['points']
        area, bbox = polygon_area_and_bbox(obj['points'], image.height, image.width)
        new_anno['area'] = float(np.sum(area))
        new_anno['bbox'] = bbox
        result_annotation['annotations'].append(new_anno)

    result_annotation = {
        'licenses': [],
        'info': {},
        'categories': [],
        'images': [],
        'annotations': []
    }

    insert_license_data(result_annotation)
    insert_info_data(annotations, result_annotation)
    category_map = insert_categories_data(annotations, result_annotation)

    segm_id = 0
    for img in annotations.group_by_frame():
        polygons = []

        for shape in img.labeled_shapes:
            if shape.type == 'polygon' or shape.type == 'rectangle':
                polygon = {
                    'label': shape.label,
                    'points': shape.points,
                    'z_order': shape.z_order,
                }

                if shape.type == 'rectangle':
                    xtl = polygon['points'][0]
                    ytl = polygon['points'][1]
                    xbr = polygon['points'][2]
                    ybr = polygon['points'][3]
                    polygon['points'] = [xtl, ytl, xbr, ytl, xbr, ybr, xtl, ybr]
                polygons.append(polygon)

        polygons.sort(key=lambda x: int(x['z_order']))

        # Create new image
        insert_image_data(img, result_annotation)
        polygons = fix_segments_intersections(polygons, img.height, img.width, img.name)

        # Create new annotation for this image
        for poly in polygons:
            insert_annotation_data(img, category_map, segm_id, poly, result_annotation)
            segm_id += 1

    file_object.write(json.dumps(result_annotation, indent=2).encode())
    file_object.flush()

    # Try to load created annotation via cocoapi
    try:
        coco_loader.COCO(file_object.name)
    except:
        raise
