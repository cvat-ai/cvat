from django.db import models
from django.conf import settings

from django.contrib.auth.models import User

import shlex
import csv
from io import StringIO
import re
import os


class Task(models.Model):
    name = models.CharField(max_length=256)
    size = models.PositiveIntegerField()
    path = models.CharField(max_length=256)
    mode = models.CharField(max_length=32)
    owner = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    bug_tracker = models.CharField(max_length=2000, default="")
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=32, default="annotate")
    overlap = models.PositiveIntegerField(default=0)

    # Extend default permission model
    class Meta:
        permissions = (
            ("view_task", "Can see available tasks"),
            ("view_annotation", "Can see annotation for the task"),
            ("change_annotation", "Can modify annotation for the task"),
        )

    def get_upload_dirname(self):
        return os.path.join(self.path, ".upload")

    def get_data_dirname(self):
        return os.path.join(self.path, "data")

    def get_dump_path(self):
        return os.path.join(self.path, "{}.dump".format(self.name))

    def get_log_path(self):
        return os.path.join(self.path, "task.log")

    def get_client_log_path(self):
        return os.path.join(self.path, "client.log")

    def set_task_dirname(self, path):
        self.path = path
        self.save(update_fields=['path'])

    def get_task_dirname(self):
        return self.path

    def get_user_segments(self, user):
        segments = []
        for segment in self.segment_set.all():
            if segment.check_user_access(user):
                segments.append(segment)
        return segments

    def __str__(self):
        return self.name

class Segment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    start_frame = models.IntegerField()
    stop_frame = models.IntegerField()

    def get_task_name(self):
        return self.task.name
    get_task_name.short_description = 'Task'

    def get_annotator(self):
        return self.job_set.first().annotator

    def check_user_access(self, user):
        if user.is_superuser:
            return True
        segment_user = self.get_annotator()
        return segment_user.get_username() == user.get_username()

class Job(models.Model):
    segment = models.ForeignKey(Segment, on_delete=models.CASCADE)
    annotator = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    def get_task_name(self):
        return self.segment.get_task_name()
    get_task_name.short_description = 'Task'
    get_task_name.admin_order_field = 'segment__task__name'

    def get_id(self):
        return str(self.id)
    get_id.short_description = 'Job ID'
    get_id.admin_order_field = 'id'

    # TODO: add sub-issue number for the task
    def __str__(self):
        return self.get_task_name() + ':' + self.get_id()

class Label(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)

    def __str__(self):
        return self.name

class AttributeSpec(models.Model):
    label = models.ForeignKey(Label, on_delete=models.CASCADE)
    text  = models.CharField(max_length=1024)

    def get_attribute(self):
        match = re.match(r'^([~@])(\w+)=(\w+):(.+)$', self.text)
        prefix = match.group(1)
        type = match.group(2)
        name = match.group(3)
        values = list(csv.reader(StringIO(match.group(4)), quotechar="'"))[0]

        return {'prefix':prefix, 'type':type, 'name':name, 'values':values}

    def is_mutable(self):
        attr = self.get_attribute()
        return attr['prefix'] == '~'

    def get_type(self):
        attr = self.get_attribute()
        return attr['type']

    def get_name(self):
        attr = self.get_attribute()
        return attr['name']

    def get_default_value(self):
        attr = self.get_attribute()
        return attr['values'][0]

    def get_values(self):
        attr = self.get_attribute()
        return attr['values']


    def __str__(self):
        return self.get_attribute()['name']

class AttributeVal(models.Model):
    # TODO: add a validator here to be sure that it corresponds to self.label
    spec = models.ForeignKey(AttributeSpec, on_delete=models.CASCADE)
    value = models.CharField(max_length=64)
    class Meta:
        abstract = True

class Annotation(models.Model):
    job   = models.ForeignKey(Job, on_delete=models.CASCADE)
    label = models.ForeignKey(Label, on_delete=models.CASCADE)
    frame = models.PositiveIntegerField()
    class Meta:
        abstract = True

class BoundingBox(models.Model):
    xtl = models.FloatField()
    ytl = models.FloatField()
    xbr = models.FloatField()
    ybr = models.FloatField()
    # TODO: need to think where to define below properties
    occluded = models.BooleanField(default=False)
    class Meta:
        abstract = True

class LabeledBox(Annotation, BoundingBox):
    pass

class LabeledBoxAttributeVal(AttributeVal):
    box = models.ForeignKey(LabeledBox, on_delete=models.CASCADE)

class ObjectPath(Annotation):
    pass

class ObjectPathAttributeVal(AttributeVal):
    track = models.ForeignKey(ObjectPath, on_delete=models.CASCADE)

class TrackedObject(models.Model):
    track = models.ForeignKey(ObjectPath, on_delete=models.CASCADE)
    frame = models.PositiveIntegerField()
    outside = models.BooleanField(default=False)
    class Meta:
        abstract = True

class TrackedBox(TrackedObject, BoundingBox):
    pass

class TrackedBoxAttributeVal(AttributeVal):
    box = models.ForeignKey(TrackedBox, on_delete=models.CASCADE)
