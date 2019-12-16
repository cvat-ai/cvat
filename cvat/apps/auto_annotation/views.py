# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
import json
import os

from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from rest_framework.decorators import api_view
from django.db.models import Q
from rules.contrib.views import permission_required, objectgetter

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.authentication.auth import has_admin_role
from cvat.apps.engine.log import slogger

from .model_loader import load_labelmap
from . import model_manager
from .models import AnnotationModel

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

        rq_id = model_manager.create_or_update(
            dl_model_id=None,
            name=name,
            model_file=model,
            weights_file=weights,
            labelmap_file=labelmap,
            interpretation_file=interpretation_script,
            owner=owner,
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

        rq_id = model_manager.create_or_update(
            dl_model_id=mid,
            name=name,
            model_file=model,
            weights_file=weights,
            labelmap_file=labelmap,
            interpretation_file=interpretation_script,
            owner=None,
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

@api_view(['POST'])
@login_required
def get_meta_info(request):
    try:
        tids = request.data
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
                "owner": dl_model.owner.id,
            })

        queue = django_rq.get_queue("low")
        for tid in tids:
            rq_id = "auto_annotation.run.{}".format(tid)
            job = queue.fetch_job(rq_id)
            if job is not None:
                response["run"][tid] = {
                    "status": job.get_status(),
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
        restricted = not has_admin_role(dl_model.owner)

        db_labels = db_task.label_set.prefetch_related("attributespec_set").all()
        db_attributes = {db_label.id:
            {db_attr.name: db_attr.id for db_attr in db_label.attributespec_set.all()} for db_label in db_labels}
        db_labels = {db_label.name:db_label.id for db_label in db_labels}

        model_labels = {value: key for key, value in load_labelmap(labelmap_file).items()}

        labels_mapping = {}
        for user_model_label, user_db_label in user_defined_labels_mapping.items():
            if user_model_label in model_labels and user_db_label in db_labels:
                labels_mapping[int(model_labels[user_model_label])] = db_labels[user_db_label]

        if not labels_mapping:
            raise Exception("No labels found for annotation")

        rq_id="auto_annotation.run.{}".format(tid)
        queue.enqueue_call(func=model_manager.run_inference_thread,
            args=(
                tid,
                model_file_path,
                weights_file_path,
                labels_mapping,
                db_attributes,
                convertation_file_path,
                should_reset,
                request.user,
                restricted,
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
