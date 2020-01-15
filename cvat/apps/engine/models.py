# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

import re
import shlex
import os

from django.db import models
from django.conf import settings

from django.contrib.auth.models import User
from django.core.files.storage import FileSystemStorage

class SafeCharField(models.CharField):
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value:
            return value[:self.max_length]
        return value

class StatusChoice(str, Enum):
    ANNOTATION = 'annotation'
    VALIDATION = 'validation'
    COMPLETED = 'completed'

    @classmethod
    def choices(self):
        return tuple((x.value, x.name) for x in self)

    def __str__(self):
        return self.value

class Project(models.Model):
    name = SafeCharField(max_length=256)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+")
    assignee = models.ForeignKey(User, null=True,  blank=True,
        on_delete=models.SET_NULL, related_name="+")
    bug_tracker = models.CharField(max_length=2000, blank=True, default="")
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=32, choices=StatusChoice.choices(),
        default=StatusChoice.ANNOTATION)

    # Extend default permission model
    class Meta:
        default_permissions = ()

class Task(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE,
        null=True, blank=True, related_name="tasks",
        related_query_name="task")
    name = SafeCharField(max_length=256)
    size = models.PositiveIntegerField()
    mode = models.CharField(max_length=32)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="owners")
    assignee = models.ForeignKey(User, null=True,  blank=True,
        on_delete=models.SET_NULL, related_name="assignees")
    bug_tracker = models.CharField(max_length=2000, blank=True, default="")
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now_add=True)
    overlap = models.PositiveIntegerField(null=True)
    # Zero means that there are no limits (default)
    segment_size = models.PositiveIntegerField(default=0)
    z_order = models.BooleanField(default=False)
    image_quality = models.PositiveSmallIntegerField(default=50)
    start_frame = models.PositiveIntegerField(default=0)
    stop_frame = models.PositiveIntegerField(default=0)
    frame_filter = models.CharField(max_length=256, default="", blank=True)
    status = models.CharField(max_length=32, choices=StatusChoice.choices(),
        default=StatusChoice.ANNOTATION)

    # Extend default permission model
    class Meta:
        default_permissions = ()

    def get_frame_path(self, frame):
        d1 = str(int(frame) // 10000)
        d2 = str(int(frame) // 100)
        path = os.path.join(self.get_data_dirname(), d1, d2,
            str(frame) + '.jpg')

        return path

    @staticmethod
    def get_image_frame(image_path):
        assert image_path.endswith('.jpg')
        index = os.path.splitext(os.path.basename(image_path))[0]
        return int(index)

    def get_frame_step(self):
        match = re.search("step\s*=\s*([1-9]\d*)", self.frame_filter)
        return int(match.group(1)) if match else 1

    def get_upload_dirname(self):
        return os.path.join(self.get_task_dirname(), ".upload")

    def get_data_dirname(self):
        return os.path.join(self.get_task_dirname(), "data")

    def get_log_path(self):
        return os.path.join(self.get_task_dirname(), "task.log")

    def get_client_log_path(self):
        return os.path.join(self.get_task_dirname(), "client.log")

    def get_image_meta_cache_path(self):
        return os.path.join(self.get_task_dirname(), "image_meta.cache")

    def get_task_dirname(self):
        return os.path.join(settings.DATA_ROOT, str(self.id))

    def __str__(self):
        return self.name

# Redefined a couple of operation for FileSystemStorage to avoid renaming
# or other side effects.
class MyFileSystemStorage(FileSystemStorage):
    def get_valid_name(self, name):
        return name

    def get_available_name(self, name, max_length=None):
        if self.exists(name) or (max_length and len(name) > max_length):
            raise IOError('`{}` file already exists or its name is too long'.format(name))
        return name

def upload_path_handler(instance, filename):
    return os.path.join(instance.task.get_upload_dirname(), filename)

# For client files which the user is uploaded
class ClientFile(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    file = models.FileField(upload_to=upload_path_handler,
        max_length=1024, storage=MyFileSystemStorage())

    class Meta:
        default_permissions = ()
        unique_together = ("task", "file")

# For server files on the mounted share
class ServerFile(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    file = models.CharField(max_length=1024)

    class Meta:
        default_permissions = ()

# For URLs
class RemoteFile(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    file = models.CharField(max_length=1024)

    class Meta:
        default_permissions = ()

class Video(models.Model):
    task = models.OneToOneField(Task, on_delete=models.CASCADE)
    path = models.CharField(max_length=1024)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    class Meta:
        default_permissions = ()

class Image(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    path = models.CharField(max_length=1024)
    frame = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    class Meta:
        default_permissions = ()

class Segment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    start_frame = models.IntegerField()
    stop_frame = models.IntegerField()

    class Meta:
        default_permissions = ()

class Job(models.Model):
    segment = models.ForeignKey(Segment, on_delete=models.CASCADE)
    assignee = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=32, choices=StatusChoice.choices(),
        default=StatusChoice.ANNOTATION)

    class Meta:
        default_permissions = ()

class Label(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    name = SafeCharField(max_length=64)

    def __str__(self):
        return self.name

    class Meta:
        default_permissions = ()
        unique_together = ('task', 'name')

class AttributeType(str, Enum):
    CHECKBOX = 'checkbox'
    RADIO = 'radio'
    NUMBER = 'number'
    TEXT = 'text'
    SELECT = 'select'

    @classmethod
    def choices(self):
        return tuple((x.value, x.name) for x in self)

    def __str__(self):
        return self.value

class AttributeSpec(models.Model):
    label = models.ForeignKey(Label, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    mutable = models.BooleanField()
    input_type = models.CharField(max_length=16,
        choices=AttributeType.choices())
    default_value = models.CharField(max_length=128)
    values = models.CharField(max_length=4096)

    class Meta:
        default_permissions = ()
        unique_together = ('label', 'name')

    def __str__(self):
        return self.name

class AttributeVal(models.Model):
    # TODO: add a validator here to be sure that it corresponds to self.label
    id = models.BigAutoField(primary_key=True)
    spec = models.ForeignKey(AttributeSpec, on_delete=models.CASCADE)
    value = SafeCharField(max_length=4096)

    class Meta:
        abstract = True
        default_permissions = ()

class ShapeType(str, Enum):
    RECTANGLE = 'rectangle' # (x0, y0, x1, y1)
    POLYGON = 'polygon'     # (x0, y0, ..., xn, yn)
    POLYLINE = 'polyline'   # (x0, y0, ..., xn, yn)
    POINTS = 'points'       # (x0, y0, ..., xn, yn)
    CUBOID = 'cuboid'

    @classmethod
    def choices(self):
        return tuple((x.value, x.name) for x in self)

    def __str__(self):
        return self.value

class Annotation(models.Model):
    id = models.BigAutoField(primary_key=True)
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    label = models.ForeignKey(Label, on_delete=models.CASCADE)
    frame = models.PositiveIntegerField()
    group = models.PositiveIntegerField(null=True)

    class Meta:
        abstract = True
        default_permissions = ()

class Commit(models.Model):
    id = models.BigAutoField(primary_key=True)
    author = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    version = models.PositiveIntegerField(default=0)
    timestamp = models.DateTimeField(auto_now=True)
    message = models.CharField(max_length=4096, default="")

    class Meta:
        abstract = True
        default_permissions = ()

class JobCommit(Commit):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="commits")

class FloatArrayField(models.TextField):
    separator = ","

    def from_db_value(self, value, expression, connection):
        if not value:
            return value
        return [float(v) for v in value.split(self.separator)]

    def to_python(self, value):
        if isinstance(value, list):
            return value

        return self.from_db_value(value, None, None)

    def get_prep_value(self, value):
        return self.separator.join(map(str, value))

class Shape(models.Model):
    type = models.CharField(max_length=16, choices=ShapeType.choices())
    occluded = models.BooleanField(default=False)
    z_order = models.IntegerField(default=0)
    points = FloatArrayField()

    class Meta:
        abstract = True
        default_permissions = ()

class LabeledImage(Annotation):
    pass

class LabeledImageAttributeVal(AttributeVal):
    image = models.ForeignKey(LabeledImage, on_delete=models.CASCADE)

class LabeledShape(Annotation, Shape):
    pass

class LabeledShapeAttributeVal(AttributeVal):
    shape = models.ForeignKey(LabeledShape, on_delete=models.CASCADE)

class LabeledTrack(Annotation):
    pass

class LabeledTrackAttributeVal(AttributeVal):
    track = models.ForeignKey(LabeledTrack, on_delete=models.CASCADE)

class TrackedShape(Shape):
    id = models.BigAutoField(primary_key=True)
    track = models.ForeignKey(LabeledTrack, on_delete=models.CASCADE)
    frame = models.PositiveIntegerField()
    outside = models.BooleanField(default=False)

class TrackedShapeAttributeVal(AttributeVal):
    shape = models.ForeignKey(TrackedShape, on_delete=models.CASCADE)

class Plugin(models.Model):
    name = models.SlugField(max_length=32, primary_key=True)
    description = SafeCharField(max_length=8192)
    maintainer = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="maintainers")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    # Extend default permission model
    class Meta:
        default_permissions = ()

class PluginOption(models.Model):
    plugin = models.ForeignKey(Plugin, on_delete=models.CASCADE)
    name = SafeCharField(max_length=32)
    value = SafeCharField(max_length=1024)
