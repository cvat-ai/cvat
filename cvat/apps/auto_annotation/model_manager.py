# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
import fnmatch
import numpy as np
import os
import rq
import shutil

from django.db import transaction
from django.utils import timezone
from django.conf import settings

from .models import AnnotationModel, FrameworkChoice

def _remove_old_file(model_file_field):
    if model_file_field and os.path.exists(model_file_field.name):
        os.remove(model_file_field.name)

@transaction.atomic
def _update_dl_model_thread(dl_model_id, model_file, weights_file, labelmap_file, interpretation_file, run_tests):
    def _get_file_content(filename):
        return os.path.basename(filename), open(filename, "rb")

    job = rq.get_current_job()
    job.meta["progress"] = "Saving data"
    job.save_meta()

    dl_model = AnnotationModel.objects.select_for_update().get(pk=dl_model_id)

    #save files in case of files should be uploaded from share
    if model_file:
        _remove_old_file(dl_model.model_file)
        dl_model.model_file.save(*_get_file_content(model_file))
    if weights_file:
        _remove_old_file(dl_model.weights_file)
        dl_model.weights_file.save(*_get_file_content(weights_file))
    if labelmap_file:
        _remove_old_file(dl_model.labelmap_file)
        dl_model.labelmap_file.save(*_get_file_content(labelmap_file))
    if interpretation_file:
        _remove_old_file(dl_model.interpretation_file)
        dl_model.interpretation_file.save(*_get_file_content(interpretation_file))

    if run_tests:
        job.meta["progress"] = "Test started"
        job.save_meta()

        blank_image = np.zeros((1980, 1024, 3), np.uint8)
        blank_image[:, 0:width//2] = (255,0,0)

        _run_inference_engine_annotation(
            data=[blank_image,],
            model_file=dl_model.model_file.name,
            weights_file=dl_model.weights_file.name,
            labels_mapping=dl_model.labelmap_file.name,
            attribute_spec={},
            convertation_file=dl_model.interpretation_file.name,
        )
        job.meta["progress"] = "Test finished"
        job.save_meta()

@transaction.atomic
def update_model(dl_model_id, name, model_file, weights_file, labelmap_file, interpretation_file, storage, is_shared):

    def get_abs_path(share_path):
        if not share_path:
            return share_path
        share_root = settings.SHARE_ROOT
        relpath = os.path.normpath(share_path).lstrip('/')
        if '..' in relpath.split(os.path.sep):
            raise Exception('Permission denied')
        abspath = os.path.abspath(os.path.join(share_root, relpath))
        if os.path.commonprefix([share_root, abspath]) != share_root:
            raise Exception('Bad file path on share: ' + abspath)
        return abspath

    dl_model = AnnotationModel.objects.select_for_update().get(pk=dl_model_id)

    if name:
        dl_model.name = name

    if is_shared != None:
        dl_model.shared = is_shared

    run_tests = bool(model_file or weights_file or labelmap_file or interpretation_file)
    if storage != "local":
        model_file = get_abs_path(model_file)
        weights_file = get_abs_path(weights_file)
        labelmap_file = get_abs_path(labelmap_file)
        interpretation_file = get_abs_path(interpretation_file)
    else:
        if model_file:
            _remove_old_file(dl_model.model_file)
            dl_model.model_file = model_file
            model_file = None
        if weights_file:
            _remove_old_file(dl_model.weights_file)
            dl_model.weights_file = weights_file
            weights_file = None
        if labelmap_file:
            _remove_old_file(dl_model.labelmap_file)
            dl_model.labelmap_file = labelmap_file
            labelmap_file = None
        if interpretation_file:
            _remove_old_file(dl_model.interpretation_file)
            dl_model.interpretation_file = interpretation_file
            interpretation_file = None

    dl_model.updated_date = timezone.now()
    dl_model.save()

    rq_id = "auto_annotation.create.{}".format(dl_model_id)
    queue = django_rq.get_queue('default')
    queue.enqueue_call(
        func = _update_dl_model_thread,
        args = (dl_model_id,
            model_file,
            weights_file,
            labelmap_file,
            interpretation_file,
            run_tests,
        ),
        job_id = rq_id
    )

    return rq_id

def create_empty(owner, framework=FrameworkChoice.OPENVINO):
    db_model = AnnotationModel(
        owner=owner,
    )
    db_model.save()

    model_path = db_model.get_dirname()
    if os.path.isdir(model_path):
        shutil.rmtree(model_path)
    os.mkdir(model_path)

    return db_model.id

@transaction.atomic
def delete(dl_model_id):
    dl_model = AnnotationModel.objects.select_for_update().get(pk=dl_model_id)
    if dl_model:
        if dl_model.primary:
            raise Exception("Can not delete primary model {}".format(dl_model_id))

        dl_model.delete()
        shutil.rmtree(dl_model.get_dirname(), ignore_errors=True)
    else:
        raise Exception("Requested DL model {} doesn't exist".format(dl_model_id))

def get_image_data(path_to_data):
    def get_image_key(item):
        return int(os.path.splitext(os.path.basename(item))[0])

    image_list = []
    for root, _, filenames in os.walk(path_to_data):
        for filename in fnmatch.filter(filenames, "*.jpg"):
                image_list.append(os.path.join(root, filename))

    image_list.sort(key=get_image_key)
    return ImageLoader(image_list)

def create_anno_container():
    return {
        "boxes": [],
        "polygons": [],
        "polylines": [],
        "points": [],
        "box_paths": [],
        "polygon_paths": [],
        "polyline_paths": [],
        "points_paths": [],
    }

class Results():
    def __init__(self):
        self._results = create_anno_container()

    def add_box(self, xtl, ytl, xbr, ybr, label, frame_number, attributes=None):
        self.get_boxes().append({
            "label": label,
            "frame": frame_number,
            "xtl": xtl,
            "ytl": ytl,
            "xbr": xbr,
            "ybr": ybr,
            "attributes": attributes or {},
        })

    def add_points(self, points, label, frame_number, attributes=None):
        self.get_points().append(
            self._create_polyshape(points, label, frame_number, attributes)
        )

    def add_polygon(self, points, label, frame_number, attributes=None):
        self.get_polygons().append(
            self._create_polyshape(points, label, frame_number, attributes)
        )

    def add_polyline(self, points, label, frame_number, attributes=None):
        self.get_polylines().append(
            self._create_polyshape(points, label, frame_number, attributes)
        )

    def get_boxes(self):
        return self._results["boxes"]

    def get_polygons(self):
        return self._results["polygons"]

    def get_polylines(self):
        return self._results["polylines"]

    def get_points(self):
        return self._results["points"]

    def get_box_paths(self):
        return self._results["box_paths"]

    def get_polygon_paths(self):
        return self._results["polygon_paths"]

    def get_polyline_paths(self):
        return self._results["polyline_paths"]

    def get_points_paths(self):
        return self._results["points_paths"]

    def _create_polyshape(self, points, label, frame_number, attributes=None):
        return {
            "label": label,
            "frame": frame_number,
            "points": " ".join("{},{}".format(pair[0], pair[1]) for pair in points),
            "attributes": attributes or {},
        }

def _process_detections(detections, path_to_conv_script):
    results = Results()
    global_vars = {
        "__builtins__": {
            "str": str,
            "int": int,
            "float": float,
            "max": max,
            "min": min,
            "range": range,
            },
        }
    local_vars = {
        "detections": detections,
        "results": results,
        }
    exec (open(path_to_conv_script).read(), global_vars, local_vars)
    return results

def _run_inference_engine_annotation(data, model_file, weights_file,
       labels_mapping, attribute_spec, convertation_file, job=None, update_progress=None):
    def process_attributes(shape_attributes, label_attr_spec):
        attributes = []
        for attr_text, attr_value in shape_attributes.items():
            if attr_text in label_attr_spec:
                attributes.append({
                    "id": label_attr_spec[attr_text],
                    "value": attr_value,
                })

        return attributes

    def add_polyshapes(shapes, target_container):
        for shape in shapes:
            if shape["label"] not in labels_mapping:
                    continue
            db_label = labels_mapping[shape["label"]]

            target_container.append({
                "label_id": db_label,
                "frame": shape["frame"],
                "points": shape["points"],
                "z_order": 0,
                "group_id": 0,
                "occluded": False,
                "attributes": process_attributes(shape["attributes"], attribute_spec[db_label]),
            })

    def add_boxes(boxes, target_container):
        for box in boxes:
            if box["label"] not in labels_mapping:
                    continue

            db_label = labels_mapping[box["label"]]
            target_container.append({
                "label_id": db_label,
                "frame": box["frame"],
                "xtl": box["xtl"],
                "ytl": box["ytl"],
                "xbr": box["xbr"],
                "ybr": box["ybr"],
                "z_order": 0,
                "group_id": 0,
                "occluded": False,
                "attributes": process_attributes(box["attributes"], attribute_spec[db_label]),
            })

    result = {
        "create": create_anno_container(),
        "update": create_anno_container(),
        "delete": create_anno_container(),
    }

    data_len = len(data)
    model = ModelLoader(model=model_file, weights=weights_file)

    frame_counter = 0

    detections = []
    for _, frame in data:
        orig_rows, orig_cols = frame.shape[:2]

        detections.append({
            "frame_id": frame_counter,
            "frame_height": orig_rows,
            "frame_width": orig_cols,
            "detections": model.infer(frame),
        })

        frame_counter += 1
        if job and update_progress and not update_progress(job, frame_counter * 100 / data_len):
            return None
    processed_detections = _process_detections(detections, convertation_file)

    add_boxes(processed_detections.get_boxes(), result["create"]["boxes"])
    add_polyshapes(processed_detections.get_points(), result["create"]["points"])
    add_polyshapes(processed_detections.get_polygons(), result["create"]["polygons"])
    add_polyshapes(processed_detections.get_polylines(), result["create"]["polylines"])

    return result

def run_inference_thread(tid, model_file, weights_file, labels_mapping, attributes, convertation_file, reset):
    def update_progress(job, progress):
        job.refresh()
        if "cancel" in job.meta:
            del job.meta["cancel"]
            job.save()
            return False
        job.meta["progress"] = progress
        job.save_meta()
        return True

    try:
        job = rq.get_current_job()
        job.meta["progress"] = 0
        job.save_meta()
        db_task = TaskModel.objects.get(pk=tid)

        result = None
        slogger.glob.info("auto annotation with openvino toolkit for task {}".format(tid))
        result = _run_inference_engine_annotation(
            data=get_image_data(db_task.get_data_dirname()),
            model_file=model_file,
            weights_file=weights_file,
            labels_mapping=labels_mapping,
            attribute_spec=attributes,
            convertation_file= convertation_file,
            job=job,
            update_progress=update_progress,
        )

        if result is None:
            slogger.glob.info("auto annotation for task {} canceled by user".format(tid))
            return

        if reset:
            annotation.clear_task(tid)
        annotation.save_task(tid, result)
        slogger.glob.info("auto annotation for task {} done".format(tid))
    except Exception as e:
        try:
            slogger.task[tid].exception("exception was occurred during auto annotation of the task", exc_info=True)
        except Exception as ex:
            slogger.glob.exception("exception was occurred during auto annotation of the task {}: {}".format(tid, str(ex)), exc_info=True)
            raise ex

        raise e
