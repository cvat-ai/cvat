import django_rq
import json
import os
import rq
import shutil

from django.db import transaction
from django.utils import timezone

from cvat.apps.engine.log import slogger

from .models import AnnotationModel

def _update_dl_model_thread(dl_model_id):
    # Here should be coping data in case of share storage used
    # Also here should be sanity check script for the updated model
    job = rq.get_current_job()
    job.meta["progress"] = "Saving data"
    job.save_meta()

    import time
    time.sleep(10)

    job.meta["progress"] = "Test started"
    job.save_meta()
    time.sleep(20)

@transaction.atomic
def update_model(dl_model_id, name, model_file, weights_file, labelmap_file, interpretation_file, storage, is_shared):
    def remove_old_file(model_file_field):
        if model_file_field and os.path.exists(model_file_field.name):
            os.remove(model_file_field.name)

    dl_model = AnnotationModel.objects.select_for_update().get(pk=dl_model_id)

    if name:
            dl_model.name = name

    if is_shared != None:
        dl_model.shared = is_shared

    if storage == "local":
        if model_file:
            remove_old_file(dl_model.model_file)
            dl_model.model_file = model_file
        if weights_file:
            remove_old_file(dl_model.weights_file)
            dl_model.weights_file = weights_file
        if labelmap_file:
            remove_old_file(dl_model.labelmap_file)
            dl_model.labelmap_file = labelmap_file
        if interpretation_file:
            remove_old_file(dl_model.interpretation_file)
            dl_model.interpretation_file = interpretation_file
    else:
        pass

    dl_model.updated_date = timezone.now()
    dl_model.save()

    rq_id = "auto_annotation.create.{}".format(dl_model_id)
    queue = django_rq.get_queue('default')
    queue.enqueue_call(
        func = _update_dl_model_thread,
        args = (dl_model_id,),
        job_id = rq_id
    )

    return rq_id

def create_empty(owner):
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
