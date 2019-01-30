
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
import fnmatch
import json
import os
import rq

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.db.models import Q
from rules.contrib.views import permission_required, objectgetter

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine import annotation
from cvat.apps.authentication.auth import has_admin_role
from cvat.apps.engine.log import slogger

from .model_loader import ModelLoader, load_label_map
from .image_loader import ImageLoader
from . import model_manager
from .models import AnnotationModel

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

def process_detections(detections, path_to_conv_script):
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

def run_inference_engine_annotation(path_to_data, model_file, weights_file,
       labels_mapping, attribute_spec, convertation_file, job, update_progress):

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

    data = get_image_data(path_to_data)
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
        if not update_progress(job, frame_counter * 100 / data_len):
            return None
    processed_detections = process_detections(detections, convertation_file)

    add_boxes(processed_detections.get_boxes(), result["create"]["boxes"])
    add_polyshapes(processed_detections.get_points(), result["create"]["points"])
    add_polyshapes(processed_detections.get_polygons(), result["create"]["polygons"])
    add_polyshapes(processed_detections.get_polylines(), result["create"]["polylines"])

    return result

def update_progress(job, progress):
    job.refresh()
    if "cancel" in job.meta:
        del job.meta["cancel"]
        job.save()
        return False
    job.meta["progress"] = progress
    job.save_meta()
    return True

def create_thread(tid, model_file, weights_file, labels_mapping, attributes, convertation_file, reset):
    try:
        job = rq.get_current_job()
        job.meta["progress"] = 0
        job.save_meta()
        db_task = TaskModel.objects.get(pk=tid)

        result = None
        slogger.glob.info("auto annotation with openvino toolkit for task {}".format(tid))
        result = run_inference_engine_annotation(
            path_to_data=db_task.get_data_dirname(),
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

@login_required
@permission_required(perm=["engine.task.change"],
    fn=objectgetter(TaskModel, "tid"), raise_exception=True)
def cancel(request, tid):
    try:
        queue = django_rq.get_queue("low")
        job = queue.fetch_job("auto_annotation.run.{}".format(tid))
        if job is None or job.is_finished or job.is_failed:
            raise Exception("Task is not being annotated currently")
        elif "cancel" not in job.meta:
            job.meta["cancel"] = True
            job.save()

    except Exception as ex:
        try:
            slogger.task[tid].exception("cannot cancel auto annotation for task #{}".format(tid), exc_info=True)
        except Exception as logger_ex:
            slogger.glob.exception("exception was occured during cancel auto annotation request for task {}: {}".format(tid, str(logger_ex)), exc_info=True)
        return HttpResponseBadRequest(str(ex))

    return HttpResponse()


@login_required
@permission_required(perm=["auto_annotation.model.create"], raise_exception=True)
def create_model(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are accepted")

    try:
        params = request.POST
        storage = params["storage"]
        name = params["name"]
        is_shared = params["shared"].lower() == "true"
        if is_shared and not has_admin_role(request.user):
            raise Exception("Only admin can create shared models")

        files = request.FILES if storage == "local" else params
        model = files["xml"]
        weights = files["bin"]
        labelmap = files["json"]
        interpretation_script = files["py"]
        owner = request.user

        dl_model_id = model_manager.create_empty(owner=owner)
        rq_id = model_manager.update_model(
            dl_model_id=dl_model_id,
            name=name,
            model_file=model,
            weights_file=weights,
            labelmap_file=labelmap,
            interpretation_file=interpretation_script,
            storage=storage,
            is_shared=is_shared,
        )

        return JsonResponse({"id": rq_id})
    except Exception as e:
        return HttpResponseBadRequest(str(e))

@login_required
@permission_required(perm=["auto_annotation.model.update"],
    fn=objectgetter(AnnotationModel, "mid"), raise_exception=True)
def update_model(request, mid):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are accepted")

    try:
        params = request.POST
        storage = params["storage"]
        name = params.get("name")
        is_shared = params.get("shared")
        is_shared = is_shared.lower() == "true" if is_shared else None
        if is_shared and not has_admin_role(request.user):
            raise Exception("Only admin can create shared models")
        files = request.FILES
        model = files.get("xml")
        weights = files.get("bin")
        labelmap = files.get("json")
        interpretation_script = files.get("py")

        rq_id = model_manager.update_model(
            dl_model_id=mid,
            name=name,
            model_file=model,
            weights_file=weights,
            labelmap_file=labelmap,
            interpretation_file=interpretation_script,
            storage=storage,
            is_shared=is_shared,
        )

        return JsonResponse({"id": rq_id})
    except Exception as e:
        return HttpResponseBadRequest(str(e))

@login_required
@permission_required(perm=["auto_annotation.model.delete"],
    fn=objectgetter(AnnotationModel, "mid"), raise_exception=True)
def delete_model(request, mid):
    if request.method != 'DELETE':
        return HttpResponseBadRequest("Only DELETE requests are accepted")
    model_manager.delete(mid)
    return HttpResponse()

@login_required
def get_meta_info(request):
    try:
        tids = json.loads(request.body.decode('utf-8'))
        response = {
            "admin": has_admin_role(request.user),
            "models": [],
            "run": {},
        }
        dl_model_list = list(AnnotationModel.objects.filter(Q(owner=request.user) | Q(primary=True) | Q(shared=True)).order_by('-created_date'))
        for dl_model in dl_model_list:
            labels = []
            if dl_model.labelmap_file and os.path.exists(dl_model.labelmap_file.name):
                with dl_model.labelmap_file.open('r') as f:
                    labels = list(json.load(f)["label_map"].values())

            response["models"].append({
                "id": dl_model.id,
                "name": dl_model.name,
                "primary": dl_model.primary,
                "uploadDate": dl_model.created_date,
                "updateDate": dl_model.updated_date,
                "labels": labels,
            })

        queue = django_rq.get_queue("low")
        for tid in tids:
            rq_id = "auto_annotation.run.{}".format(tid)
            job = queue.fetch_job(rq_id)
            if job is not None:
                response["run"][tid] = {
                    "status": job.status,
                    "rq_id": rq_id,
                }

        return JsonResponse(response)
    except Exception as e:
        return HttpResponseBadRequest(str(e))

@login_required
@permission_required(perm=["engine.task.change"],
    fn=objectgetter(TaskModel, "tid"), raise_exception=True)
@permission_required(perm=["auto_annotation.model.access"],
    fn=objectgetter(AnnotationModel, "mid"), raise_exception=True)
def start_annotation(request, mid, tid):
    slogger.glob.info("auto annotation create request for task {} via DL model {}".format(tid, mid))
    try:
        db_task = TaskModel.objects.get(pk=tid)
        queue = django_rq.get_queue("low")
        job = queue.fetch_job("auto_annotation.run.{}".format(tid))
        if job is not None and (job.is_started or job.is_queued):
            raise Exception("The process is already running")

        data = json.loads(request.body.decode('utf-8'))

        should_reset = data["reset"]
        user_defined_labels_mapping = data["labels"]

        dl_model = AnnotationModel.objects.get(pk=mid)

        model_file_path = dl_model.model_file.name
        weights_file_path = dl_model.weights_file.name
        labelmap_file = dl_model.labelmap_file.name
        convertation_file_path = dl_model.interpretation_file.name

        db_labels = db_task.label_set.prefetch_related("attributespec_set").all()
        db_attributes = {db_label.id:
            {db_attr.get_name(): db_attr.id for db_attr in db_label.attributespec_set.all()} for db_label in db_labels}
        db_labels = {db_label.name:db_label.id for db_label in db_labels}

        model_labels = {value: key for key, value in load_label_map(labelmap_file).items()}

        labels_mapping = {}
        for user_model_label, user_db_label in user_defined_labels_mapping.items():
            if user_model_label in model_labels and user_db_label in db_labels:
                labels_mapping[int(model_labels[user_model_label])] = db_labels[user_db_label]

        if not labels_mapping:
            raise Exception("No labels found for annotation")

        rq_id="auto_annotation.run.{}".format(tid)
        queue.enqueue_call(func=create_thread,
            args=(
                tid,
                model_file_path,
                weights_file_path,
                labels_mapping,
                db_attributes,
                convertation_file_path,
                should_reset,
            ),
            job_id = rq_id,
            timeout=604800)     # 7 days

        slogger.task[tid].info("auto annotation job enqueued")

    except Exception as ex:
        try:
            slogger.task[tid].exception("exception was occurred during annotation request", exc_info=True)
        except Exception as logger_ex:
            slogger.glob.exception("exception was occurred during create auto annotation request for task {}: {}".format(tid, str(logger_ex)), exc_info=True)
        return HttpResponseBadRequest(str(ex))

    return JsonResponse({"id": rq_id})

@login_required
def check(request, rq_id):
    try:
        target_queue = "low" if "auto_annotation.run" in rq_id else "default"
        queue = django_rq.get_queue(target_queue)
        job = queue.fetch_job(rq_id)
        if job is not None and "cancel" in job.meta:
            return JsonResponse({"status": "finished"})
        data = {}
        if job is None:
            data["status"] = "unknown"
        elif job.is_queued:
            data["status"] = "queued"
        elif job.is_started:
            data["status"] = "started"
            data["progress"] = job.meta["progress"] if "progress" in job.meta else ""
        elif job.is_finished:
            data["status"] = "finished"
            job.delete()
        else:
            data["status"] = "failed"
            data["error"] = job.exc_info
            job.delete()

    except Exception:
        data["status"] = "unknown"

    return JsonResponse(data)
