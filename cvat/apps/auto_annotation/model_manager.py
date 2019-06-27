# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
import fnmatch
import numpy as np
import os
import rq
import shutil
import tempfile
import itertools

from django.db import transaction
from django.utils import timezone
from django.conf import settings

from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.authentication.auth import has_admin_role
from cvat.apps.engine.serializers import LabeledDataSerializer
from cvat.apps.engine.annotation import put_task_data, patch_task_data

from .models import AnnotationModel, FrameworkChoice
from .model_loader import ModelLoader
from .image_loader import ImageLoader

def _remove_old_file(model_file_field):
    if model_file_field and os.path.exists(model_file_field.name):
        os.remove(model_file_field.name)

def _update_dl_model_thread(dl_model_id, name, is_shared, model_file, weights_file, labelmap_file,
        interpretation_file, run_tests, is_local_storage, delete_if_test_fails, restricted=True):
    def _get_file_content(filename):
        return os.path.basename(filename), open(filename, "rb")

    def _delete_source_files():
        for f in [model_file, weights_file, labelmap_file, interpretation_file]:
            if f:
                os.remove(f)

    def _run_test(model_file, weights_file, labelmap_file, interpretation_file):
        test_image = np.ones((1024, 1980, 3), np.uint8) * 255
        try:
            _run_inference_engine_annotation(
                data=[test_image,],
                model_file=model_file,
                weights_file=weights_file,
                labels_mapping=labelmap_file,
                attribute_spec={},
                convertation_file=interpretation_file,
                restricted=restricted
            )
        except Exception as e:
            return False, str(e)

        return True, ""

    job = rq.get_current_job()
    job.meta["progress"] = "Saving data"
    job.save_meta()

    with transaction.atomic():
        dl_model = AnnotationModel.objects.select_for_update().get(pk=dl_model_id)

        test_res = True
        message = ""
        if run_tests:
            job.meta["progress"] = "Test started"
            job.save_meta()

            test_res, message = _run_test(
                model_file=model_file or dl_model.model_file.name,
                weights_file=weights_file or dl_model.weights_file.name,
                labelmap_file=labelmap_file or dl_model.labelmap_file.name,
                interpretation_file=interpretation_file or dl_model.interpretation_file.name,
            )

            if not test_res:
                job.meta["progress"] = "Test failed"
                if delete_if_test_fails:
                    shutil.rmtree(dl_model.get_dirname(), ignore_errors=True)
                    dl_model.delete()
            else:
                job.meta["progress"] = "Test passed"
            job.save_meta()

        # update DL model
        if test_res:
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

            if name:
                dl_model.name = name

            if is_shared != None:
                dl_model.shared = is_shared

            dl_model.updated_date = timezone.now()
            dl_model.save()

    if is_local_storage:
        _delete_source_files()

    if not test_res:
        raise Exception("Model was not properly created/updated. Test failed: {}".format(message))

def create_or_update(dl_model_id, name, model_file, weights_file, labelmap_file, interpretation_file, owner, storage, is_shared):
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

    def save_file_as_tmp(data):
        if not data:
            return None
        fd, filename = tempfile.mkstemp()
        with open(filename, 'wb') as tmp_file:
            for chunk in data.chunks():
                tmp_file.write(chunk)
        os.close(fd)
        return filename
    is_create_request = dl_model_id is None
    if is_create_request:
        dl_model_id = create_empty(owner=owner)

    run_tests = bool(model_file or weights_file or labelmap_file or interpretation_file)
    if storage != "local":
        model_file = get_abs_path(model_file)
        weights_file = get_abs_path(weights_file)
        labelmap_file = get_abs_path(labelmap_file)
        interpretation_file = get_abs_path(interpretation_file)
    else:
        model_file = save_file_as_tmp(model_file)
        weights_file = save_file_as_tmp(weights_file)
        labelmap_file = save_file_as_tmp(labelmap_file)
        interpretation_file = save_file_as_tmp(interpretation_file)

    if owner:
        restricted = not has_admin_role(owner)
    else:
        restricted = not has_admin_role(AnnotationModel.objects.get(pk=dl_model_id).owner)

    rq_id = "auto_annotation.create.{}".format(dl_model_id)
    queue = django_rq.get_queue("default")
    queue.enqueue_call(
        func=_update_dl_model_thread,
        args=(
            dl_model_id,
            name,
            is_shared,
            model_file,
            weights_file,
            labelmap_file,
            interpretation_file,
            run_tests,
            storage == "local",
            is_create_request,
            restricted
        ),
        job_id=rq_id
    )

    return rq_id

@transaction.atomic
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

        shutil.rmtree(dl_model.get_dirname(), ignore_errors=True)
        dl_model.delete()
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

class Results():
    def __init__(self):
        self._results = {
            "shapes": [],
            "tracks": []
        }

    def add_box(self, xtl, ytl, xbr, ybr, label, frame_number, attributes=None):
        self.get_shapes().append({
            "label": label,
            "frame": frame_number,
            "points": [xtl, ytl, xbr, ybr],
            "type": "rectangle",
            "attributes": attributes or {},
        })

    def add_points(self, points, label, frame_number, attributes=None):
        points = self._create_polyshape(points, label, frame_number, attributes)
        points["type"] = "points"
        self.get_shapes().append(points)

    def add_polygon(self, points, label, frame_number, attributes=None):
        polygon = self._create_polyshape(points, label, frame_number, attributes)
        polygon["type"] = "polygon"
        self.get_shapes().append(polygon)

    def add_polyline(self, points, label, frame_number, attributes=None):
        polyline = self._create_polyshape(points, label, frame_number, attributes)
        polyline["type"] = "polyline"
        self.get_shapes().append(polyline)

    def get_shapes(self):
        return self._results["shapes"]

    def get_tracks(self):
        return self._results["tracks"]

    @staticmethod
    def _create_polyshape(points, label, frame_number, attributes=None):
        return {
            "label": label,
            "frame": frame_number,
            "points": list(itertools.chain.from_iterable(points)),
            "attributes": attributes or {},
        }

def _process_detections(detections, path_to_conv_script, restricted=True):
    results = Results()
    local_vars = {
        "detections": detections,
        "results": results,
        }

    if restricted:
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
    else:
        global_vars = globals()

    exec (open(path_to_conv_script).read(), global_vars, local_vars)

    return results

def _run_inference_engine_annotation(data, model_file, weights_file,
       labels_mapping, attribute_spec, convertation_file, job=None, update_progress=None, restricted=True):
    def process_attributes(shape_attributes, label_attr_spec):
        attributes = []
        for attr_text, attr_value in shape_attributes.items():
            if attr_text in label_attr_spec:
                attributes.append({
                    "id": label_attr_spec[attr_text],
                    "value": attr_value,
                })

        return attributes

    def add_shapes(shapes, target_container):
        for shape in shapes:
            if shape["label"] not in labels_mapping:
                    continue
            db_label = labels_mapping[shape["label"]]

            target_container.append({
                "label_id": db_label,
                "frame": shape["frame"],
                "points": shape["points"],
                "type": shape["type"],
                "z_order": 0,
                "group": None,
                "occluded": False,
                "attributes": process_attributes(shape["attributes"], attribute_spec[db_label]),
            })

    result = {
        "shapes": [],
        "tracks": [],
        "tags": [],
        "version": 0
    }

    data_len = len(data)
    model = ModelLoader(model=model_file, weights=weights_file)

    frame_counter = 0

    detections = []
    for frame in data:
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

    processed_detections = _process_detections(detections, convertation_file, restricted=restricted)

    add_shapes(processed_detections.get_shapes(), result["shapes"])


    return result

def run_inference_thread(tid, model_file, weights_file, labels_mapping, attributes, convertation_file, reset, user, restricted=True):
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
            restricted=restricted
        )

        if result is None:
            slogger.glob.info("auto annotation for task {} canceled by user".format(tid))
            return

        serializer = LabeledDataSerializer(data = result)
        if serializer.is_valid(raise_exception=True):
            if reset:
                put_task_data(tid, user, result)
            else:
                patch_task_data(tid, user, result, "create")

        slogger.glob.info("auto annotation for task {} done".format(tid))
    except Exception as e:
        try:
            slogger.task[tid].exception("exception was occurred during auto annotation of the task", exc_info=True)
        except Exception as ex:
            slogger.glob.exception("exception was occurred during auto annotation of the task {}: {}".format(tid, str(ex)), exc_info=True)
            raise ex

        raise e
