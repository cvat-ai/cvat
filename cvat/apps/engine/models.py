# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import datetime
import os
import re
import shutil
import uuid
from abc import ABCMeta, abstractmethod
from collections.abc import Collection, Sequence
from enum import Enum
from functools import cached_property
from typing import Any, ClassVar, Optional

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.db import IntegrityError, models, transaction
from django.db.models import Q, TextChoices
from django.db.models.base import ModelBase
from django.db.models.fields import FloatField
from django.utils.translation import gettext_lazy as _
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field

from cvat.apps.engine.lazy_list import LazyList
from cvat.apps.engine.model_utils import MaybeUndefined
from cvat.apps.engine.utils import parse_specific_attributes, take_by
from cvat.apps.events.utils import cache_deleted


class SafeCharField(models.CharField):
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value:
            return value[:self.max_length]
        return value


class DimensionType(str, Enum):
    DIM_3D = '3d'
    DIM_2D = '2d'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class StatusChoice(str, Enum):
    """Deprecated. Use StageChoice and StateChoice instead"""

    ANNOTATION = 'annotation'
    VALIDATION = 'validation'
    COMPLETED = 'completed'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value

class LabelType(str, Enum):
    ANY = 'any'
    CUBOID = 'cuboid'
    ELLIPSE = 'ellipse'
    MASK = 'mask'
    POINTS = 'points'
    POLYGON = 'polygon'
    POLYLINE = 'polyline'
    RECTANGLE = 'rectangle'
    SKELETON = 'skeleton'
    TAG = 'tag'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value

class StageChoice(str, Enum):
    ANNOTATION = 'annotation'
    VALIDATION = 'validation'
    ACCEPTANCE = 'acceptance'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class StateChoice(str, Enum):
    NEW = 'new'
    IN_PROGRESS = 'in progress'
    COMPLETED = 'completed'
    REJECTED = 'rejected'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class DataChoice(str, Enum):
    VIDEO = 'video'
    IMAGESET = 'imageset'
    LIST = 'list'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class StorageMethodChoice(str, Enum):
    CACHE = 'cache'
    FILE_SYSTEM = 'file_system'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class StorageChoice(str, Enum):
    CLOUD_STORAGE = 'cloud_storage'
    LOCAL = 'local'
    SHARE = 'share'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class SortingMethod(str, Enum):
    LEXICOGRAPHICAL = 'lexicographical'
    NATURAL = 'natural'
    PREDEFINED = 'predefined'
    RANDOM = 'random'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class JobType(str, Enum):
    ANNOTATION = 'annotation'
    GROUND_TRUTH = 'ground_truth'
    CONSENSUS_REPLICA = 'consensus_replica'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class JobFrameSelectionMethod(str, Enum):
    RANDOM_UNIFORM = 'random_uniform'
    RANDOM_PER_JOB = 'random_per_job'
    MANUAL = 'manual'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class AbstractArrayField(models.TextField):
    separator = ","
    converter = staticmethod(lambda x: x)

    def __init__(self, *args, store_sorted:Optional[bool]=False, unique_values:Optional[bool]=False, **kwargs):
        self._store_sorted = store_sorted
        self._unique_values = unique_values
        super().__init__(*args,**{'default': '', **kwargs})

    def from_db_value(self, value, expression, connection):
        if not value:
            return []
        return LazyList(string=value, separator=self.separator, converter=self.converter)

    def to_python(self, value):
        if isinstance(value, list | LazyList):
            return value

        return self.from_db_value(value, None, None)

    def get_prep_value(self, value):
        if isinstance(value, LazyList) and not (self._unique_values or self._store_sorted):
            return str(value)

        if self._unique_values:
            value = dict.fromkeys(value)
        if self._store_sorted:
            value = sorted(value)
        return self.separator.join(map(str, value))

class FloatArrayField(AbstractArrayField):
    converter = float

class IntArrayField(AbstractArrayField):
    converter = int

class ValidationMode(str, Enum):
    GT = "gt"
    GT_POOL = "gt_pool"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class ValidationParams(models.Model):
    task_data = models.OneToOneField(
        'Data', on_delete=models.CASCADE, related_name="validation_params"
    )

    mode = models.CharField(max_length=32, choices=ValidationMode.choices())

    frame_selection_method = models.CharField(
        max_length=32, choices=JobFrameSelectionMethod.choices()
    )
    random_seed = models.IntegerField(null=True)

    frames: models.manager.RelatedManager[ValidationFrame]
    frame_count = models.IntegerField(null=True)
    frame_share = models.FloatField(null=True)
    frames_per_job_count = models.IntegerField(null=True)
    frames_per_job_share = models.FloatField(null=True)

class ValidationFrame(models.Model):
    validation_params = models.ForeignKey(
        ValidationParams, on_delete=models.CASCADE, related_name="frames"
    )
    path = models.CharField(max_length=1024, default='')

class ValidationLayout(models.Model):
    "Represents validation configuration in a task"

    task_data = models.OneToOneField(
        'Data', on_delete=models.CASCADE, related_name="validation_layout"
    )

    mode = models.CharField(max_length=32, choices=ValidationMode.choices())

    frames_per_job_count = models.IntegerField(null=True)

    frames = IntArrayField(store_sorted=True, unique_values=True)
    "Stores task frame numbers of the validation frames"

    disabled_frames = IntArrayField(store_sorted=True, unique_values=True)
    "Stores task frame numbers of the disabled (deleted) validation frames"

    @property
    def active_frames(self) -> Sequence[int]:
        "An ordered sequence of active (non-disabled) validation frames"
        return set(self.frames).difference(self.disabled_frames)

class Data(models.Model):
    MANIFEST_FILENAME: ClassVar[str] = 'manifest.jsonl'

    chunk_size = models.PositiveIntegerField(null=True)
    size = models.PositiveIntegerField(default=0)
    image_quality = models.PositiveSmallIntegerField(default=50)
    start_frame = models.PositiveIntegerField(default=0)
    stop_frame = models.PositiveIntegerField(default=0)
    frame_filter = models.CharField(max_length=256, default="", blank=True)
    compressed_chunk_type = models.CharField(max_length=32, choices=DataChoice.choices(),
        default=DataChoice.IMAGESET)
    original_chunk_type = models.CharField(max_length=32, choices=DataChoice.choices(),
        default=DataChoice.IMAGESET)
    storage_method = models.CharField(max_length=15, choices=StorageMethodChoice.choices(), default=StorageMethodChoice.FILE_SYSTEM)
    storage = models.CharField(max_length=15, choices=StorageChoice.choices(), default=StorageChoice.LOCAL)
    cloud_storage = models.ForeignKey('CloudStorage', on_delete=models.SET_NULL, null=True, related_name='data')
    sorting_method = models.CharField(max_length=15, choices=SortingMethod.choices(), default=SortingMethod.LEXICOGRAPHICAL)
    deleted_frames = IntArrayField(store_sorted=True, unique_values=True)

    images: models.manager.RelatedManager[Image]
    video: MaybeUndefined[Video]
    related_files: models.manager.RelatedManager[RelatedFile]
    validation_layout: MaybeUndefined[ValidationLayout]

    client_files: models.manager.RelatedManager[ClientFile]
    server_files: models.manager.RelatedManager[ServerFile]
    remote_files: models.manager.RelatedManager[RemoteFile]
    validation_params: MaybeUndefined[ValidationParams]
    """
    Represents user-requested validation params before task is created.
    After the task creation, 'validation_layout' is used instead.
    """

    class Meta:
        default_permissions = ()

    def get_frame_step(self):
        match = re.search(r"step\s*=\s*([1-9]\d*)", self.frame_filter)
        return int(match.group(1)) if match else 1

    def get_valid_frame_indices(self):
        return range(self.start_frame, self.stop_frame + 1, self.get_frame_step())

    def get_data_dirname(self):
        return os.path.join(settings.MEDIA_DATA_ROOT, str(self.id))

    def get_upload_dirname(self):
        return os.path.join(self.get_data_dirname(), "raw")

    def get_raw_data_dirname(self) -> str:
        return {
            StorageChoice.LOCAL: self.get_upload_dirname(),
            StorageChoice.SHARE: settings.SHARE_ROOT,
            StorageChoice.CLOUD_STORAGE: self.get_upload_dirname(),
        }[self.storage]

    def get_compressed_cache_dirname(self):
        return os.path.join(self.get_data_dirname(), "compressed")

    def get_original_cache_dirname(self):
        return os.path.join(self.get_data_dirname(), "original")

    @staticmethod
    def _get_chunk_name(segment_id: int, chunk_number: int, chunk_type: DataChoice | str) -> str:
        if chunk_type == DataChoice.VIDEO:
            ext = 'mp4'
        elif chunk_type == DataChoice.IMAGESET:
            ext = 'zip'
        else:
            ext = 'list'

        return 'segment_{}-{}.{}'.format(segment_id, chunk_number, ext)

    def _get_compressed_chunk_name(self, segment_id: int, chunk_number: int) -> str:
        return self._get_chunk_name(segment_id, chunk_number, self.compressed_chunk_type)

    def _get_original_chunk_name(self, segment_id: int, chunk_number: int) -> str:
        return self._get_chunk_name(segment_id, chunk_number, self.original_chunk_type)

    def get_original_segment_chunk_path(self, chunk_number: int, segment_id: int) -> str:
        return os.path.join(self.get_original_cache_dirname(),
            self._get_original_chunk_name(segment_id, chunk_number))

    def get_compressed_segment_chunk_path(self, chunk_number: int, segment_id: int) -> str:
        return os.path.join(self.get_compressed_cache_dirname(),
            self._get_compressed_chunk_name(segment_id, chunk_number))

    def get_manifest_path(self) -> str:
        return os.path.join(self.get_upload_dirname(), self.MANIFEST_FILENAME)

    def make_dirs(self):
        data_path = self.get_data_dirname()
        if os.path.isdir(data_path):
            shutil.rmtree(data_path)
        os.makedirs(self.get_compressed_cache_dirname())
        os.makedirs(self.get_original_cache_dirname())
        os.makedirs(self.get_upload_dirname())

    @transaction.atomic
    def update_validation_layout(
        self, validation_layout: Optional[ValidationLayout]
    ) -> Optional[ValidationLayout]:
        if validation_layout:
            validation_layout.task_data = self
            validation_layout.save()

        ValidationParams.objects.filter(task_data_id=self.id).delete()

        return validation_layout

    @property
    def validation_mode(self) -> Optional[ValidationMode]:
        return getattr(getattr(self, 'validation_layout', None), 'mode', None)


class Video(models.Model):
    data = models.OneToOneField(Data, on_delete=models.CASCADE, related_name="video", null=True)
    path = models.CharField(max_length=1024, default='')
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    class Meta:
        default_permissions = ()


class Image(models.Model):
    data = models.ForeignKey(Data, on_delete=models.CASCADE, related_name="images", null=True)
    path = models.CharField(max_length=1024, default='')
    frame = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    is_placeholder = models.BooleanField(default=False)
    real_frame = models.PositiveIntegerField(default=0)
    related_files: models.manager.RelatedManager[RelatedFile]

    class Meta:
        default_permissions = ()

class TimestampedModel(models.Model):
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def touch(self) -> None:
        self.save(update_fields=["updated_date"])

class ABCModelMeta(ABCMeta, ModelBase):
    pass

class FileSystemRelatedModel(metaclass=ABCModelMeta):
    @abstractmethod
    def get_dirname(self) -> str:
        ...

    def get_tmp_dirname(self) -> str:
        """
        The method returns a directory that is only used
        to store temporary files or folders related to the object
        """
        dir_path = os.path.join(self.get_dirname(), "tmp")
        os.makedirs(dir_path, exist_ok=True)

        return dir_path


@transaction.atomic(savepoint=False)
def clear_annotations_in_jobs(job_ids):
    for job_ids_chunk in take_by(job_ids, chunk_size=1000):
        TrackedShapeAttributeVal.objects.filter(shape__track__job_id__in=job_ids_chunk).delete()
        TrackedShape.objects.filter(track__job_id__in=job_ids_chunk).delete()
        LabeledTrackAttributeVal.objects.filter(track__job_id__in=job_ids_chunk).delete()
        LabeledTrack.objects.filter(job_id__in=job_ids_chunk).delete()
        LabeledShapeAttributeVal.objects.filter(shape__job_id__in=job_ids_chunk).delete()
        LabeledShape.objects.filter(job_id__in=job_ids_chunk).delete()
        LabeledImageAttributeVal.objects.filter(image__job_id__in=job_ids_chunk).delete()
        LabeledImage.objects.filter(job_id__in=job_ids_chunk).delete()


@transaction.atomic(savepoint=False)
def clear_annotations_on_frames_in_honeypot_task(db_task: Task, frames: Sequence[int]):
    if db_task.data.validation_mode != ValidationMode.GT_POOL:
        # Tracks are prohibited in honeypot tasks
        raise AssertionError

    for frames_batch in take_by(frames, chunk_size=1000):
        LabeledShapeAttributeVal.objects.filter(
            shape__job_id__segment__task_id=db_task.id,
            shape__frame__in=frames_batch,
        ).delete()
        LabeledShape.objects.filter(
            job_id__segment__task_id=db_task.id,
            frame__in=frames_batch,
        ).delete()
        LabeledImageAttributeVal.objects.filter(
            image__job_id__segment__task_id=db_task.id,
            image__frame__in=frames_batch,
        ).delete()
        LabeledImage.objects.filter(
            job_id__segment__task_id=db_task.id,
            frame__in=frames_batch,
        ).delete()

class Project(TimestampedModel, FileSystemRelatedModel):
    name = SafeCharField(max_length=256)
    owner = models.ForeignKey(User, null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="+")
    assignee = models.ForeignKey(User, null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name="+")
    assignee_updated_date = models.DateTimeField(null=True, blank=True, default=None)

    bug_tracker = models.CharField(max_length=2000, blank=True, default="")
    status = models.CharField(max_length=32, choices=StatusChoice.choices(),
                              default=StatusChoice.ANNOTATION)
    organization = models.ForeignKey('organizations.Organization', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name="projects")
    source_storage = models.ForeignKey('Storage', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name='+')
    target_storage = models.ForeignKey('Storage', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name='+')

    def get_labels(self, prefetch=False):
        queryset = self.label_set.filter(parent__isnull=True).select_related('skeleton')
        return queryset.prefetch_related(
            'attributespec_set', 'sublabels__attributespec_set',
        ) if prefetch else queryset

    def get_dirname(self) -> str:
        return os.path.join(settings.PROJECTS_ROOT, str(self.id))

    def is_job_staff(self, user_id):
        if self.owner == user_id:
            return True

        if self.assignee == user_id:
            return True

        return self.tasks.prefetch_related('segment_set', 'segment_set__job_set').filter(
            Q(owner=user_id) | Q(assignee=user_id) | Q(segment__job__assignee=user_id)
        ).count() > 0

    @cache_deleted
    @transaction.atomic(savepoint=False)
    def delete(self, using=None, keep_parents=False):
        # quicker way to remove annotations and a way to reduce number of queries
        # is to remove labels and attributes first, it will remove annotations cascadely

        # child objects must be removed first
        if self.label_set.exclude(parent=None).count():
            self.label_set.exclude(parent=None).delete()
        self.label_set.filter(parent=None).delete()
        super().delete(using, keep_parents)

    # Extend default permission model
    class Meta:
        default_permissions = ()

    def __str__(self):
        return self.name

class TaskQuerySet(models.QuerySet):
    def with_job_summary(self):
        return self.prefetch_related(
            'segment_set__job_set',
        ).annotate(
            total_jobs_count=models.Count('segment__job', distinct=True),
            completed_jobs_count=models.Count(
                'segment__job',
                filter=models.Q(segment__job__state=StateChoice.COMPLETED.value) &
                       models.Q(segment__job__stage=StageChoice.ACCEPTANCE.value),
                distinct=True,
            ),
            validation_jobs_count=models.Count(
                'segment__job',
                filter=models.Q(segment__job__stage=StageChoice.VALIDATION.value),
                distinct=True,
            )
        )

class Task(TimestampedModel, FileSystemRelatedModel):
    objects = TaskQuerySet.as_manager()

    project = models.ForeignKey(Project, on_delete=models.CASCADE,
        null=True, blank=True, related_name="tasks",
        related_query_name="task")
    name = SafeCharField(max_length=256)
    mode = models.CharField(max_length=32)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="owners")
    assignee = models.ForeignKey(User, null=True,  blank=True,
        on_delete=models.SET_NULL, related_name="assignees")
    assignee_updated_date = models.DateTimeField(null=True, blank=True, default=None)
    bug_tracker = models.CharField(max_length=2000, blank=True, default="")
    overlap = models.PositiveIntegerField(null=True)
    # Zero means that there are no limits (default)
    # Note that the files can be split into jobs in a custom way in this case
    segment_size = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=32, choices=StatusChoice.choices(),
                              default=StatusChoice.ANNOTATION)
    data = models.ForeignKey(Data, on_delete=models.CASCADE, null=True, related_name="tasks")
    dimension = models.CharField(max_length=2, choices=DimensionType.choices(), default=DimensionType.DIM_2D)
    subset = models.CharField(max_length=64, blank=True, default="")
    organization = models.ForeignKey('organizations.Organization', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name="tasks")
    source_storage = models.ForeignKey('Storage', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name='+')
    target_storage = models.ForeignKey('Storage', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name='+')
    consensus_replicas = models.IntegerField(default=0)
    "Per job consensus replica count"

    segment_set: models.manager.RelatedManager[Segment]

    # Extend default permission model
    class Meta:
        default_permissions = ()

    def get_labels(self, prefetch=False):
        project = self.project
        if project:
            return project.get_labels(prefetch)

        queryset = self.label_set.filter(parent__isnull=True).select_related('skeleton')
        return queryset.prefetch_related(
            'attributespec_set', 'sublabels__attributespec_set',
        ) if prefetch else queryset

    def get_dirname(self) -> str:
        return os.path.join(settings.TASKS_ROOT, str(self.id))

    def is_job_staff(self, user_id):
        if self.owner == user_id:
            return True
        if self.assignee == user_id:
            return True
        return self.segment_set.prefetch_related('job_set').filter(job__assignee=user_id).count() > 0

    @cached_property
    def completed_jobs_count(self) -> Optional[int]:
        # Requires this field to be defined externally,
        # e.g. by calling Task.objects.with_job_summary,
        # to avoid unexpected DB queries on access.
        return None

    @cached_property
    def validation_jobs_count(self) -> Optional[int]:
        # Requires this field to be defined externally,
        # e.g. by calling Task.objects.with_job_summary,
        # to avoid unexpected DB queries on access.
        return None

    @cached_property
    def gt_job(self) -> Optional[Job]:
        try:
            return Job.objects.get(segment__task=self, type=JobType.GROUND_TRUTH)
        except Job.DoesNotExist:
            return None

    def __str__(self):
        return self.name

    @cache_deleted
    @transaction.atomic(savepoint=False)
    def delete(self, using=None, keep_parents=False):
        if not self.project:
            # quicker way to remove annotations and a way to reduce number of queries
            # is to remove labels and attributes first, it will remove annotations cascadely

            # child objects must be removed first
            if self.label_set.exclude(parent=None).count():
                self.label_set.exclude(parent=None).delete()
            self.label_set.filter(parent=None).delete()
        else:
            job_ids = list(self.segment_set.values_list('job__id', flat=True))
            clear_annotations_in_jobs(job_ids)
        super().delete(using, keep_parents)

    def get_chunks_updated_date(self) -> datetime.datetime:
        return self.segment_set.aggregate(
            chunks_updated_date=models.Max('chunks_updated_date')
        )['chunks_updated_date']

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
    # relative path is required since Django 3.1.11
    return os.path.join(os.path.relpath(instance.data.get_upload_dirname(), settings.BASE_DIR), filename)

# For client files which the user is uploaded
class ClientFile(models.Model):
    data = models.ForeignKey(Data, on_delete=models.CASCADE, null=True, related_name='client_files')
    file = models.FileField(upload_to=upload_path_handler,
        max_length=1024, storage=MyFileSystemStorage())

    class Meta:
        default_permissions = ()
        unique_together = ("data", "file")

        # Some DBs can shuffle the rows. Here we restore the insertion order.
        # https://github.com/cvat-ai/cvat/pull/5083#discussion_r1038032715
        ordering = ('id', )

# For server files on the mounted share
class ServerFile(models.Model):
    data = models.ForeignKey(Data, on_delete=models.CASCADE, null=True, related_name='server_files')
    file = models.CharField(max_length=1024)

    class Meta:
        default_permissions = ()
        unique_together = ("data", "file")

        # Some DBs can shuffle the rows. Here we restore the insertion order.
        # https://github.com/cvat-ai/cvat/pull/5083#discussion_r1038032715
        ordering = ('id', )

# For URLs
class RemoteFile(models.Model):
    data = models.ForeignKey(Data, on_delete=models.CASCADE, null=True, related_name='remote_files')
    file = models.CharField(max_length=1024)

    class Meta:
        default_permissions = ()
        unique_together = ("data", "file")

        # Some DBs can shuffle the rows. Here we restore the insertion order.
        # https://github.com/cvat-ai/cvat/pull/5083#discussion_r1038032715
        ordering = ('id', )


class RelatedFile(models.Model):
    data = models.ForeignKey(Data, on_delete=models.CASCADE, related_name="related_files", default=1, null=True)
    path = models.FileField(upload_to=upload_path_handler,
                            max_length=1024, storage=MyFileSystemStorage())
    images = models.ManyToManyField(Image, related_name="related_files")

    class Meta:
        default_permissions = ()
        unique_together = ("data", "path")

        # Some DBs can shuffle the rows. Here we restore the insertion order.
        # https://github.com/cvat-ai/cvat/pull/5083#discussion_r1038032715
        ordering = ('id', )


class SegmentType(str, Enum):
    RANGE = 'range'
    SPECIFIC_FRAMES = 'specific_frames'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value


class Segment(models.Model):
    # Common fields
    task = models.ForeignKey(Task, on_delete=models.CASCADE) # TODO: add related name
    start_frame = models.IntegerField()
    stop_frame = models.IntegerField()
    chunks_updated_date = models.DateTimeField(null=False, auto_now_add=True)
    type = models.CharField(choices=SegmentType.choices(), default=SegmentType.RANGE, max_length=32)

    # SegmentType.SPECIFIC_FRAMES fields
    frames = IntArrayField(store_sorted=True, unique_values=True, default='', blank=True)

    job_set: models.manager.RelatedManager[Job]

    def contains_frame(self, idx: int) -> bool:
        return idx in self.frame_set

    @property
    def frame_count(self) -> int:
        return len(self.frame_set)

    @property
    def frame_set(self) -> Collection[int]:
        data = self.task.data
        data_start_frame = data.start_frame
        data_stop_frame = data.stop_frame
        step = data.get_frame_step()
        frame_range = range(
            data_start_frame + self.start_frame * step,
            min(data_start_frame + self.stop_frame * step, data_stop_frame) + step,
            step
        )

        if self.type == SegmentType.RANGE:
            return frame_range
        elif self.type == SegmentType.SPECIFIC_FRAMES:
            return set(frame_range).intersection(self.frames or [])
        else:
            assert False

    def save(self, *args, **kwargs) -> None:
        self.full_clean()
        return super().save(*args, **kwargs)

    def clean(self) -> None:
        if not (self.type == SegmentType.RANGE) ^ bool(self.frames):
            raise ValidationError(
                f"frames and type == {SegmentType.SPECIFIC_FRAMES} can only be used together"
            )

        if self.stop_frame < self.start_frame:
            raise ValidationError("stop_frame cannot be less than start_frame")

        return super().clean()

    @cache_deleted
    def delete(self, using=None, keep_parents=False):
        super().delete(using, keep_parents)

    class Meta:
        default_permissions = ()



class TaskGroundTruthJobsLimitError(ValidationError):
    def __init__(self) -> None:
        super().__init__("A task can have only 1 ground truth job")



class JobQuerySet(models.QuerySet):
    @transaction.atomic
    def create(self, **kwargs: Any):
        self._validate_constraints(kwargs)

        return super().create(**kwargs)

    @transaction.atomic
    def update(self, **kwargs: Any) -> int:
        self._validate_constraints(kwargs)

        return super().update(**kwargs)

    @transaction.atomic
    def get_or_create(self, *args, **kwargs: Any):
        self._validate_constraints(kwargs)

        return super().get_or_create(*args, **kwargs)

    @transaction.atomic
    def update_or_create(self, *args, **kwargs: Any):
        self._validate_constraints(kwargs)

        return super().update_or_create(*args, **kwargs)

    def _validate_constraints(self, obj: dict[str, Any]):
        if 'type' not in obj:
            return

        # Constraints can't be set on the related model fields
        # This method requires the save operation to be called as a transaction
        if obj['type'] == JobType.GROUND_TRUTH and self.filter(
            segment__task=obj['segment'].task, type=JobType.GROUND_TRUTH.value
        ).count() != 0:
            raise TaskGroundTruthJobsLimitError()



class Job(TimestampedModel, FileSystemRelatedModel):
    objects = JobQuerySet.as_manager()

    segment = models.ForeignKey(Segment, on_delete=models.CASCADE)

    assignee = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    assignee_updated_date = models.DateTimeField(null=True, blank=True, default=None)

    # TODO: it has to be deleted in Job, Task, Project and replaced by (stage, state)
    # The stage field cannot be changed by an assignee, but state field can be. For
    # now status is read only and it will be updated by (stage, state). Thus we don't
    # need to update Task and Project (all should work as previously).
    status = models.CharField(max_length=32, choices=StatusChoice.choices(),
        default=StatusChoice.ANNOTATION)
    stage = models.CharField(max_length=32, choices=StageChoice.choices(),
        default=StageChoice.ANNOTATION)
    state = models.CharField(max_length=32, choices=StateChoice.choices(),
        default=StateChoice.NEW)
    type = models.CharField(max_length=32, choices=JobType.choices(),
        default=JobType.ANNOTATION)
    parent_job = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='child_jobs', related_query_name="child_job"
    )

    def get_target_storage(self) -> Optional[Storage]:
        return self.segment.task.target_storage

    def get_source_storage(self) -> Optional[Storage]:
        return self.segment.task.source_storage

    def get_dirname(self) -> str:
        return os.path.join(settings.JOBS_ROOT, str(self.id))

    @extend_schema_field(OpenApiTypes.INT)
    def get_project_id(self):
        project = self.segment.task.project
        return project.id if project else None

    @extend_schema_field(OpenApiTypes.INT)
    def get_guide_id(self):
        source = self.segment.task.project
        if not source:
            source = self.segment.task
        if hasattr(source, 'annotation_guide'):
            return source.annotation_guide.id
        return None

    @extend_schema_field(OpenApiTypes.INT)
    def get_task_id(self):
        return self.segment.task_id

    @property
    def organization_id(self):
        return self.segment.task.organization_id

    def get_organization_slug(self):
        return self.segment.task.organization.slug

    def get_bug_tracker(self):
        task = self.segment.task
        project = task.project
        return task.bug_tracker or getattr(project, 'bug_tracker', None)

    def get_labels(self, prefetch=False):
        task = self.segment.task
        project = task.project
        return project.get_labels(prefetch) if project else task.get_labels(prefetch)

    class Meta:
        default_permissions = ()

    @cache_deleted
    @transaction.atomic(savepoint=False)
    def delete(self, using=None, keep_parents=False):
        clear_annotations_in_jobs([self.id])
        segment = self.segment
        super().delete(using, keep_parents)
        if segment:
            segment.delete()

    def make_dirs(self):
        job_path = self.get_dirname()
        if os.path.isdir(job_path):
            shutil.rmtree(job_path)
        os.makedirs(job_path)


class InvalidLabel(ValueError):
    pass

class Label(models.Model):
    task = models.ForeignKey(Task, null=True, blank=True, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE)
    name = SafeCharField(max_length=64)
    color = models.CharField(default='', max_length=8)
    type = models.CharField(max_length=32, choices=LabelType.choices(), default=LabelType.ANY)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sublabels')

    def __str__(self):
        return self.name

    def has_parent_label(self):
        return bool(self.parent)

    def save(self, *args, **kwargs):
        try:
            super().save(*args, **kwargs)
        except IntegrityError:
            raise InvalidLabel("All label names must be unique")

    @classmethod
    def create(cls, **kwargs):
        try:
            return cls.objects.create(**kwargs)
        except IntegrityError:
            raise InvalidLabel("All label names must be unique")

    @property
    def organization_id(self):
        if self.project is not None:
            return self.project.organization_id
        if self.task is not None:
            return self.task.organization_id
        return None

    class Meta:
        default_permissions = ()
        constraints = [
            models.UniqueConstraint(
                name='project_name_unique',
                fields=('project', 'name'),
                condition=models.Q(task__isnull=True, parent__isnull=True)
            ),
            models.UniqueConstraint(
                name='task_name_unique',
                fields=('task', 'name'),
                condition=models.Q(project__isnull=True, parent__isnull=True)
            ),
            models.UniqueConstraint(
                name='project_name_parent_unique',
                fields=('project', 'name', 'parent'),
                condition=models.Q(task__isnull=True)
            ),
            models.UniqueConstraint(
                name='task_name_parent_unique',
                fields=('task', 'name', 'parent'),
                condition=models.Q(project__isnull=True)
            )
        ]

class Skeleton(models.Model):
    root = models.OneToOneField(Label, on_delete=models.CASCADE)
    svg = models.TextField(null=True, default=None)

    class Meta:
        default_permissions = ()
        unique_together = ('root',)

class AttributeType(str, Enum):
    CHECKBOX = 'checkbox'
    RADIO = 'radio'
    NUMBER = 'number'
    TEXT = 'text'
    SELECT = 'select'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class AttributeSpec(models.Model):
    label = models.ForeignKey(Label, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    mutable = models.BooleanField()
    input_type = models.CharField(max_length=16,
        choices=AttributeType.choices())
    default_value = models.CharField(blank=True, max_length=128)
    values = models.CharField(blank=True, max_length=4096)

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
    ELLIPSE = 'ellipse'     # (cx, cy, rx, ty)
    CUBOID = 'cuboid'       # (x0, y0, ..., x7, y7)
    MASK = 'mask'       # (rle mask, left, top, right, bottom)
    SKELETON = 'skeleton'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class SourceType(str, Enum):
    AUTO = 'auto'
    SEMI_AUTO = 'semi-auto'
    MANUAL = 'manual'
    FILE = 'file'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

class Annotation(models.Model):
    id = models.BigAutoField(primary_key=True)
    job = models.ForeignKey(Job, on_delete=models.DO_NOTHING)
    label = models.ForeignKey(Label, on_delete=models.CASCADE)
    frame = models.PositiveIntegerField()
    group = models.PositiveIntegerField(null=True)
    source = models.CharField(max_length=16, choices=SourceType.choices(),
        default=str(SourceType.MANUAL), null=True)

    class Meta:
        abstract = True
        default_permissions = ()

class Shape(models.Model):
    type = models.CharField(max_length=16, choices=ShapeType.choices())
    occluded = models.BooleanField(default=False)
    outside = models.BooleanField(default=False)
    z_order = models.IntegerField(default=0)
    points = FloatArrayField(default=[])
    rotation = FloatField(default=0)

    class Meta:
        abstract = True
        default_permissions = ()

class LabeledImage(Annotation):
    pass

class LabeledImageAttributeVal(AttributeVal):
    image = models.ForeignKey(LabeledImage, on_delete=models.DO_NOTHING,
        related_name='attributes', related_query_name='attribute')

class LabeledShape(Annotation, Shape):
    parent = models.ForeignKey('self', on_delete=models.DO_NOTHING, null=True, related_name='elements')

class LabeledShapeAttributeVal(AttributeVal):
    shape = models.ForeignKey(LabeledShape, on_delete=models.DO_NOTHING,
        related_name='attributes', related_query_name='attribute')

class LabeledTrack(Annotation):
    parent = models.ForeignKey('self', on_delete=models.DO_NOTHING, null=True, related_name='elements')

class LabeledTrackAttributeVal(AttributeVal):
    track = models.ForeignKey(LabeledTrack, on_delete=models.DO_NOTHING,
        related_name='attributes', related_query_name='attribute')

class TrackedShape(Shape):
    id = models.BigAutoField(primary_key=True)
    track = models.ForeignKey(LabeledTrack, on_delete=models.CASCADE,
        related_name='shapes', related_query_name='shape')
    frame = models.PositiveIntegerField()

class TrackedShapeAttributeVal(AttributeVal):
    shape = models.ForeignKey(TrackedShape, on_delete=models.DO_NOTHING,
        related_name='attributes', related_query_name='attribute')


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    rating = models.FloatField(default=0.0)
    has_analytics_access = models.BooleanField(
        _("has access to analytics"),
        default=False,
        help_text=_("Designates whether the user can access analytics."),
    )


class Issue(TimestampedModel):
    frame = models.PositiveIntegerField()
    position = FloatArrayField()
    job = models.ForeignKey(Job, related_name='issues', on_delete=models.CASCADE)
    owner = models.ForeignKey(User, null=True, blank=True, related_name='+',
        on_delete=models.SET_NULL)
    assignee = models.ForeignKey(User, null=True, blank=True, related_name='+',
        on_delete=models.SET_NULL)
    resolved = models.BooleanField(default=False)

    def get_project_id(self):
        return self.job.get_project_id()

    @property
    def organization_id(self):
        return self.job.organization_id

    def get_organization_slug(self):
        return self.job.get_organization_slug()

    def get_task_id(self):
        return self.job.get_task_id()

    def get_job_id(self):
        return self.job_id


class Comment(TimestampedModel):
    issue = models.ForeignKey(Issue, related_name='comments', on_delete=models.CASCADE)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    message = models.TextField(default='')

    def get_project_id(self):
        return self.issue.get_project_id()

    @property
    def organization_id(self):
        return self.issue.organization_id

    def get_organization_slug(self):
        return self.issue.get_organization_slug()

    def get_task_id(self):
        return self.issue.get_task_id()

    def get_job_id(self):
        return self.issue.get_job_id()

class CloudProviderChoice(str, Enum):
    AWS_S3 = 'AWS_S3_BUCKET'
    AZURE_CONTAINER = 'AZURE_CONTAINER'
    GOOGLE_DRIVE = 'GOOGLE_DRIVE'
    GOOGLE_CLOUD_STORAGE = 'GOOGLE_CLOUD_STORAGE'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value

class CredentialsTypeChoice(str, Enum):
    # ignore bandit issues because false positives
    KEY_SECRET_KEY_PAIR = 'KEY_SECRET_KEY_PAIR' # nosec
    ACCOUNT_NAME_TOKEN_PAIR = 'ACCOUNT_NAME_TOKEN_PAIR' # nosec
    KEY_FILE_PATH = 'KEY_FILE_PATH'
    ANONYMOUS_ACCESS = 'ANONYMOUS_ACCESS'
    CONNECTION_STRING = 'CONNECTION_STRING'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value

class Manifest(models.Model):
    filename = models.CharField(max_length=1024, default='manifest.jsonl')
    cloud_storage = models.ForeignKey('CloudStorage', on_delete=models.CASCADE, null=True, related_name='manifests')

    def __str__(self):
        return '{}'.format(self.filename)

class Location(str, Enum):
    CLOUD_STORAGE = 'cloud_storage'
    LOCAL = 'local'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    def __str__(self):
        return self.value

    @classmethod
    def list(cls):
        return [i.value for i in cls]

class CloudStorage(TimestampedModel):
    # restrictions:
    # AWS bucket name, Azure container name - 63, Google bucket name - 63 without dots and 222 with dots
    # https://cloud.google.com/storage/docs/naming-buckets#requirements
    # AWS access key id - 20, Oracle OCI access key id - 40
    # AWS secret access key - 40, Oracle OCI secret access key - 44, Cloudflare R2 secret access key - 64
    # AWS temporary session token - None
    # The size of the security token that AWS STS API operations return is not fixed.
    # We strongly recommend that you make no assumptions about the maximum size.
    # The typical token size is less than 4096 bytes, but that can vary.
    # specific attributes:
    # location - max 23
    # project ID: 6 - 30 (https://cloud.google.com/resource-manager/docs/creating-managing-projects#before_you_begin)
    provider_type = models.CharField(max_length=20, choices=CloudProviderChoice.choices())
    resource = models.CharField(max_length=222)
    display_name = models.CharField(max_length=63)
    owner = models.ForeignKey(User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="cloud_storages")
    credentials = models.CharField(max_length=1024, null=True, blank=True)
    credentials_type = models.CharField(max_length=29, choices=CredentialsTypeChoice.choices())#auth_type
    specific_attributes = models.CharField(max_length=1024, blank=True)
    description = models.TextField(blank=True)
    organization = models.ForeignKey('organizations.Organization', null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name="cloudstorages")

    class Meta:
        default_permissions = ()

    def __str__(self):
        return "{} {} {}".format(self.provider_type, self.display_name, self.id)

    def get_storage_dirname(self):
        return os.path.join(settings.CLOUD_STORAGE_ROOT, str(self.id))

    def get_specific_attributes(self):
        return parse_specific_attributes(self.specific_attributes)

    def get_key_file_path(self):
        return os.path.join(self.get_storage_dirname(), 'key.json')

    @property
    def has_at_least_one_manifest(self) -> bool:
        return bool(self.manifests.count())

class Storage(models.Model):
    location = models.CharField(max_length=16, choices=Location.choices(), default=Location.LOCAL)
    cloud_storage = models.ForeignKey(
        CloudStorage,
        on_delete=models.CASCADE,
        null=True,
        related_name='+',
    )

    class Meta:
        default_permissions = ()

class AnnotationGuide(TimestampedModel):
    task = models.OneToOneField(Task, null=True, blank=True, on_delete=models.CASCADE, related_name="annotation_guide")
    project = models.OneToOneField(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="annotation_guide")
    markdown = models.TextField(blank=True, default='')
    is_public = models.BooleanField(default=False)

    @property
    def target(self) -> Task | Project:
        target = self.project or self.task
        assert target # one of the fields must be set
        return target

    @property
    def organization_id(self):
        return self.target.organization_id

class Asset(models.Model):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=1024)
    created_date = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets")
    guide = models.ForeignKey(AnnotationGuide, on_delete=models.CASCADE, related_name="assets")

    @property
    def organization_id(self):
        return self.guide.organization_id

    def get_asset_dir(self):
        return os.path.join(settings.ASSETS_ROOT, str(self.uuid))

class RequestStatus(TextChoices):
    QUEUED = "queued"
    STARTED = "started"
    FAILED = "failed"
    FINISHED = "finished"

class RequestAction(TextChoices):
    AUTOANNOTATE = "autoannotate"
    CREATE = "create"
    IMPORT = "import"
    EXPORT = "export"

class RequestTarget(TextChoices):
    PROJECT = "project"
    TASK = "task"
    JOB = "job"

class RequestSubresource(TextChoices):
    ANNOTATIONS = "annotations"
    DATASET = "dataset"
    BACKUP = "backup"
