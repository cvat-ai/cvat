# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.dispatch import Signal, receiver

from rest_framework.renderers import JSONRenderer

from cvat.apps.engine.models import Task, Job
from cvat.apps.webhooks.signals import project_id, organization_id
from cvat.apps.engine.log import vlogger

from .event import EventScopeChoice, event_scope, create_event, update_event


event_signal_update = Signal()
event_signal_create = Signal()
event_signal_delete = Signal()
event_signal_annotations_patch = Signal()

def task_id(instance):
    if isinstance(instance, Task):
        return instance.id

    try:
        tid = getattr(instance, "task_id", None)
        if tid is None:
            return instance.get_task_id()
        return tid
    except Exception:
        return None

def job_id(instance):
    if isinstance(instance, Job):
        return instance.id

    return None

def user_id(instance):
    if isinstance(instance, Job):
        return instance.segment.task.owner_id

    return None

@receiver(event_signal_update)
def update(sender, instance=None, old_values=None, **kwargs):
    scope = event_scope("update", sender.basename)
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    pid = project_id(instance)
    oid = organization_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = sender.request.user.id
    if not any((oid, pid, tid, jid, uid)):
        return

    serializer = sender.get_serializer_class()(
        instance=instance, context={"request": sender.request}
    )

    data = serializer.data

    for prop, old_value in old_values.items():
        new_value = data[prop] if prop in data else getattr(instance, prop, None)
        new_value = JSONRenderer().render(new_value).decode('UTF-8')
        scope = event_scope("update", prop)

        event = create_event(
            scope=scope,
            obj_name=sender.basename,
            obj_id=instance.id,
            obj_val=new_value,
            source='server',
            user=uid,
            payload={
                "old_value": old_value,
                "new_value": new_value,
            }
        )
        event = update_event(event, pid=pid, tid=tid, jid=jid, oid=oid)
        message = JSONRenderer().render(event).decode('UTF-8')

        vlogger.info(message)

@receiver(event_signal_create)
def resource_created(sender, instance=None, **kwargs):
    name = getattr(sender, 'basename', None)
    if not name:
        name = instance.__class__.__name__.lower()

    scope = event_scope("create", name)
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    pid = project_id(instance)
    oid = organization_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = user_id(instance)
    if not uid:
        uid = sender.request.user.id

    if not any((oid, pid, tid, jid, uid)):
        return

    try:
        serializer = sender.get_serializer_class()(
            instance=instance, context={"request": sender.request}
        )
        payload=serializer.data
    except Exception:
        payload = {}

    event = create_event(
        scope=scope,
        obj_name=name,
        obj_id=instance.id,
        source='server',
        user=uid,
        payload=payload,
    )
    event = update_event(event, pid=pid, tid=tid, jid=jid, oid=oid)
    message = JSONRenderer().render(event).decode('UTF-8')

    vlogger.info(message)

@receiver(event_signal_delete)
def resource_deleted(sender, instance=None, **kwargs):
    scope = event_scope("delete", sender.basename)
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    pid = project_id(instance)
    oid = organization_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = sender.request.user.id
    if not any((oid, pid, tid, jid, uid)):
        return

    event = create_event(
        scope=scope,
        obj_name=sender.basename,
        obj_id=instance.id,
        source='server',
        user=uid,
    )
    event = update_event(event, pid=pid, tid=tid, jid=jid, oid=oid)
    message = JSONRenderer().render(event).decode('UTF-8')

    vlogger.info(message)

@receiver(event_signal_annotations_patch)
def annotations_created(sender, instance, annotations, action, **kwargs):
    def filter_shape_data(shape):
        data = {
            "id": shape["id"],
            "frame": shape["frame"],
            "attributes": shape["attributes"],
        }
        shape_type = shape.get("type", None)
        if shape_type:
            data["type"] = shape_type

        label_id = shape.get("label_id", None)
        if label_id:
            data["label_id"] = label_id

        return data

    scope = event_scope(action, "annotations")
    if scope not in map(lambda a: a[0], EventScopeChoice.choices()):
        return

    pid = project_id(instance)
    oid = organization_id(instance)
    tid = task_id(instance)
    jid = job_id(instance)
    uid = sender.request.user.id
    if not any((oid, pid, tid, jid, uid)):
        return

    payload = {}
    for shape_type, shapes in annotations.items():
        if shape_type == "version":
            payload[shape_type] = shapes
        else:
            payload[shape_type] = []
            for shape in shapes:
                if shape_type == "tracks":
                    track = filter_shape_data(shape)
                    track["shapes"] = []
                    for track_shape in shape["shapes"]:
                        track["shapes"].append(filter_shape_data(track_shape))
                    payload[shape_type].append(track)
                else:
                    payload[shape_type].append(filter_shape_data(shape))

    event = create_event(
        scope=scope,
        obj_name=sender.basename,
        obj_id=instance.id,
        obj_val=str(len(annotations["tags"]) + len(annotations["shapes"]) + len(annotations["tracks"])),
        source='server',
        user=uid,
        payload=payload,
    )
    event = update_event(event, pid=pid, tid=tid, jid=jid, oid=oid)
    message = JSONRenderer().render(event).decode('UTF-8')

    vlogger.info(message)
