# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import django_rq
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
        #only for testing
        import time
        time.sleep(3)
        job.meta["progress"] = "Test started"
        job.save_meta()
        time.sleep(5)
        job.meta["progress"] = "Test finished"

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
