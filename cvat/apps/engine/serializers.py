# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import copy
from inspect import isclass
import os
import re
import shutil
import string

from tempfile import NamedTemporaryFile
import textwrap
from typing import Any, Dict, Iterable, Optional, OrderedDict, Union

from rest_framework import serializers, exceptions
from django.contrib.auth.models import User, Group
from django.db import transaction

from cvat.apps.dataset_manager.formats.utils import get_label_color
from cvat.apps.engine import models
from cvat.apps.engine.cloud_provider import get_cloud_storage_instance, Credentials, Status
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.engine.utils import parse_specific_attributes, build_field_filter_params, get_list_view_name, reverse

from drf_spectacular.utils import OpenApiExample, extend_schema_field, extend_schema_serializer

slogger = ServerLogManager(__name__)

class WriteOnceMixin:
    """
    Adds support for write once fields to serializers.

    To use it, specify a list of fields as `write_once_fields` on the
    serializer's Meta:
    ```
    class Meta:
        model = SomeModel
        fields = '__all__'
        write_once_fields = ('collection', )
    ```

    Now the fields in `write_once_fields` can be set during POST (create),
    but cannot be changed afterwards via PUT or PATCH (update).
    Inspired by http://stackoverflow.com/a/37487134/627411.
    """

    def get_fields(self):
        fields = super().get_fields()

        # We're only interested in PATCH and PUT.
        if 'update' in getattr(self.context.get('view'), 'action', ''):
            fields = self._update_write_once_fields(fields)

        return fields

    def _update_write_once_fields(self, fields):
        """
        Set all fields in `Meta.write_once_fields` to read_only.
        """

        write_once_fields = getattr(self.Meta, 'write_once_fields', None)
        if not write_once_fields:
            return fields

        if not isinstance(write_once_fields, (list, tuple)):
            raise TypeError(
                'The `write_once_fields` option must be a list or tuple. '
                'Got {}.'.format(type(write_once_fields).__name__)
            )

        for field_name in write_once_fields:
            fields[field_name].read_only = True

        return fields


@extend_schema_field(serializers.URLField)
class HyperlinkedEndpointSerializer(serializers.Serializer):
    key_field = 'pk'

    def __init__(self, view_name=None, *, filter_key=None, **kwargs):
        if isclass(view_name) and issubclass(view_name, models.models.Model):
            view_name = get_list_view_name(view_name)
        elif not isinstance(view_name, str):
            raise TypeError(view_name)

        kwargs['read_only'] = True
        super().__init__(**kwargs)

        self.view_name = view_name
        self.filter_key = filter_key

    def get_attribute(self, instance):
        return instance

    def to_representation(self, instance):
        request = self.context.get('request')
        if not request:
            return None

        return serializers.Hyperlink(
            reverse(self.view_name, request=request,
                query_params=build_field_filter_params(
                    self.filter_key, getattr(instance, self.key_field)
            )),
            instance
        )


class _CollectionSummarySerializer(serializers.Serializer):
    # This class isn't recommended for direct use in public serializers
    # because it produces too generic description in the schema.
    # Consider creating a dedicated inherited class instead.

    count = serializers.IntegerField(default=0)

    def __init__(self, model, *, url_filter_key, **kwargs):
        super().__init__(**kwargs)
        self._collection_key = self.source
        self._model = model
        self._url_filter_key = url_filter_key

    def bind(self, field_name, parent):
        super().bind(field_name, parent)
        self._collection_key = self._collection_key or self.source
        self._model = self._model or type(self.parent)

    def get_fields(self):
        fields = super().get_fields()
        fields['url'] = HyperlinkedEndpointSerializer(self._model, filter_key=self._url_filter_key)
        fields['count'].source = self._collection_key + '.count'
        return fields

    def get_attribute(self, instance):
        return instance

class JobsSummarySerializer(_CollectionSummarySerializer):
    completed = serializers.IntegerField(source='completed_jobs_count', allow_null=True)
    validation = serializers.IntegerField(source='validation_jobs_count', allow_null=True)

    def __init__(self, *, model=models.Job, url_filter_key, **kwargs):
        super().__init__(model=model, url_filter_key=url_filter_key, **kwargs)


class TasksSummarySerializer(_CollectionSummarySerializer):
    pass


class CommentsSummarySerializer(_CollectionSummarySerializer):
    pass

class LabelsSummarySerializer(serializers.Serializer):
    url = serializers.URLField(read_only=True)

    def get_url(self, request, instance):
        filter_key = instance.__class__.__name__.lower() + '_id'
        return reverse('label-list', request=request,
            query_params={ filter_key: instance.id })

    def to_representation(self, instance):
        request = self.context.get('request')
        if not request:
            return None

        return {
            'url': self.get_url(request, instance),
        }

class IssuesSummarySerializer(serializers.Serializer):
    url = serializers.URLField(read_only=True)
    count = serializers.IntegerField(read_only=True)

    def get_url(self, request, instance):
        return reverse('issue-list', request=request,
            query_params={ 'job_id': instance.id })

    def get_count(self, instance):
        return getattr(instance, 'issues__count', 0)

    def to_representation(self, instance):
        request = self.context.get('request')
        if not request:
            return None

        return {
            'url': self.get_url(request, instance),
            'count': self.get_count(instance)
        }


class BasicUserSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if hasattr(self, 'initial_data'):
            unknown_keys = set(self.initial_data.keys()) - set(self.fields.keys())
            if unknown_keys:
                if set(['is_staff', 'is_superuser', 'groups']) & unknown_keys:
                    message = 'You do not have permissions to access some of' + \
                        ' these fields: {}'.format(unknown_keys)
                else:
                    message = 'Got unknown fields: {}'.format(unknown_keys)
                raise serializers.ValidationError(message)
        return attrs

    class Meta:
        model = User
        fields = ('url', 'id', 'username', 'first_name', 'last_name')

class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True,
        slug_field='name', queryset=Group.objects.all())

    class Meta:
        model = User
        fields = ('url', 'id', 'username', 'first_name', 'last_name', 'email',
            'groups', 'is_staff', 'is_superuser', 'is_active', 'last_login',
            'date_joined')
        read_only_fields = ('last_login', 'date_joined')
        write_only_fields = ('password', )
        extra_kwargs = {
            'last_login': { 'allow_null': True }
        }

class DelimitedStringListField(serializers.ListField):
    def to_representation(self, value):
        return super().to_representation(value.split('\n'))

    def to_internal_value(self, data):
        return '\n'.join(super().to_internal_value(data))

class AttributeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    values = DelimitedStringListField(allow_empty=True,
        child=serializers.CharField(allow_blank=True, max_length=200),
    )

    class Meta:
        model = models.AttributeSpec
        fields = ('id', 'name', 'mutable', 'input_type', 'default_value', 'values')

class SublabelSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    attributes = AttributeSerializer(many=True, source='attributespec_set', default=[],
        help_text="The list of attributes. "
        "If you want to remove an attribute, you need to recreate the label "
        "and specify the remaining attributes.")
    color = serializers.CharField(allow_blank=True, required=False,
        help_text="The hex value for the RGB color. "
        "Will be generated automatically, unless specified explicitly.")
    type = serializers.CharField(allow_blank=True, required=False,
        help_text="Associated annotation type for this label")
    has_parent = serializers.BooleanField(source='has_parent_label', required=False)

    class Meta:
        model = models.Label
        fields = ('id', 'name', 'color', 'attributes', 'type', 'has_parent', )
        read_only_fields = ('parent',)

class SkeletonSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    svg = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = models.Skeleton
        fields = ('id', 'svg',)

class LabelSerializer(SublabelSerializer):
    deleted = serializers.BooleanField(required=False, write_only=True,
        help_text='Delete the label. Only applicable in the PATCH methods of a project or a task.')
    sublabels = SublabelSerializer(many=True, required=False)
    svg = serializers.CharField(allow_blank=True, required=False)
    has_parent = serializers.BooleanField(read_only=True, source='has_parent_label', required=False)

    class Meta:
        model = models.Label
        fields = (
            'id', 'name', 'color', 'attributes', 'deleted', 'type', 'svg',
            'sublabels', 'project_id', 'task_id', 'parent_id', 'has_parent'
        )
        read_only_fields = ('id', 'svg', 'project_id', 'task_id')
        extra_kwargs = {
            'project_id': { 'required': False, 'allow_null': False },
            'task_id': { 'required': False, 'allow_null': False },
            'parent_id': { 'required': False, },
        }

    def to_representation(self, instance):
        label = super().to_representation(instance)
        if label['type'] == str(models.LabelType.SKELETON):
            label['svg'] = instance.skeleton.svg

        # Clean mutually exclusive fields
        if not label.get('task_id'):
            label.pop('task_id', None)
        if not label.get('project_id'):
            label.pop('project_id', None)

        return label

    def __init__(self, *args, **kwargs):
        self._local = kwargs.pop('local', False)
        """
        Indicates that the operation is called from the dedicated ViewSet
        and not from the parent entity, i.e. a project or task.
        """

        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        if self._local and attrs.get('deleted'):
            # NOTE: Navigate clients to the right method
            raise serializers.ValidationError(
                'Labels cannot be deleted by updating in this endpoint. '
                'Please use the DELETE method instead.'
            )

        if attrs.get('deleted') and attrs.get('id') is None:
            raise serializers.ValidationError('Deleted label must have an ID')

        return attrs

    @staticmethod
    def check_attribute_names_unique(attrs):
        encountered_names = set()
        for attribute in attrs:
            attr_name = attribute.get('name')
            if attr_name in encountered_names:
                raise serializers.ValidationError(f"Duplicate attribute with name '{attr_name}' exists")
            else:
                encountered_names.add(attr_name)

    @classmethod
    @transaction.atomic
    def update_label(
        cls,
        validated_data: Dict[str, Any],
        svg: str,
        sublabels: Iterable[Dict[str, Any]],
        *,
        parent_instance: Union[models.Project, models.Task],
        parent_label: Optional[models.Label] = None
    ) -> Optional[models.Label]:
        parent_info, logger = cls._get_parent_info(parent_instance)

        attributes = validated_data.pop('attributespec_set', [])

        cls.check_attribute_names_unique(attributes)

        if validated_data.get('id') is not None:
            try:
                db_label = models.Label.objects.get(id=validated_data['id'], **parent_info)
            except models.Label.DoesNotExist as exc:
                raise exceptions.NotFound(
                    detail='Not found label with id #{} to change'.format(validated_data['id'])
                ) from exc

            updated_type = validated_data.get('type') or db_label.type
            if str(models.LabelType.SKELETON) in [db_label.type, updated_type]:
                # do not permit changing types from/to skeleton
                logger.warning("Label id {} ({}): an attempt to change label type from {} to {}. "
                    "Changing from or to '{}' is not allowed, the type won't be changed.".format(
                    db_label.id,
                    db_label.name,
                    db_label.type,
                    updated_type,
                    str(models.LabelType.SKELETON),
                ))
            else:
                db_label.type = updated_type

            db_label.name = validated_data.get('name') or db_label.name

            logger.info("Label id {} ({}) was updated".format(db_label.id, db_label.name))
        else:
            try:
                db_label = models.Label.create(
                    name=validated_data.get('name'),
                    type=validated_data.get('type'),
                    parent=parent_label,
                    **parent_info
                )
            except models.InvalidLabel as exc:
                raise exceptions.ValidationError(str(exc)) from exc
            logger.info("New {} label was created".format(db_label.name))

            cls.update_labels(sublabels, parent_instance=parent_instance, parent_label=db_label)

            if db_label.type == str(models.LabelType.SKELETON):
                for db_sublabel in list(db_label.sublabels.all()):
                    svg = svg.replace(
                        f'data-label-name="{db_sublabel.name}"',
                        f'data-label-id="{db_sublabel.id}"'
                    )
                db_skeleton = models.Skeleton.objects.create(root=db_label, svg=svg)
                logger.info(
                    f'label:update Skeleton id:{db_skeleton.id} for label_id:{db_label.id}'
                )

        if validated_data.get('deleted'):
            assert validated_data['id'] # must be checked in the validate()
            db_label.delete()
            return None

        if not validated_data.get('color', None):
            other_label_colors = [
                label.color for label in
                parent_instance.label_set.exclude(id=db_label.id).order_by('id')
            ]
            db_label.color = get_label_color(db_label.name, other_label_colors)
        else:
            db_label.color = validated_data.get('color', db_label.color)

        try:
            db_label.save()
        except models.InvalidLabel as exc:
            raise exceptions.ValidationError(str(exc)) from exc

        for attr in attributes:
            attr_id = attr.get('id', None)
            if attr_id is not None:
                try:
                    db_attr = models.AttributeSpec.objects.get(id=attr_id, label=db_label)
                except models.AttributeSpec.DoesNotExist as ex:
                    raise exceptions.NotFound(
                        f'Attribute with id #{attr_id} does not exist'
                    ) from ex
                created = False
            else:
                (db_attr, created) = models.AttributeSpec.objects.get_or_create(
                    label=db_label, name=attr['name'], defaults=attr
                )
            if created:
                logger.info("New {} attribute for {} label was created"
                    .format(db_attr.name, db_label.name))
            else:
                logger.info("{} attribute for {} label was updated"
                    .format(db_attr.name, db_label.name))

                # FIXME: need to update only "safe" fields
                db_attr.name = attr.get('name', db_attr.name)
                db_attr.default_value = attr.get('default_value', db_attr.default_value)
                db_attr.mutable = attr.get('mutable', db_attr.mutable)
                db_attr.input_type = attr.get('input_type', db_attr.input_type)
                db_attr.values = attr.get('values', db_attr.values)
                db_attr.save()

        return db_label

    @classmethod
    @transaction.atomic
    def create_labels(cls,
        labels: Iterable[Dict[str, Any]],
        *,
        parent_instance: Union[models.Project, models.Task],
        parent_label: Optional[models.Label] = None
    ):
        parent_info, logger = cls._get_parent_info(parent_instance)

        label_colors = list()

        for label in labels:
            attributes = label.pop('attributespec_set')

            cls.check_attribute_names_unique(attributes)

            if label.get('id', None):
                del label['id']

            if not label.get('color', None):
                label['color'] = get_label_color(label['name'], label_colors)
            label_colors.append(label['color'])

            sublabels = label.pop('sublabels', [])
            svg = label.pop('svg', '')
            try:
                db_label = models.Label.create(**label, **parent_info, parent=parent_label)
            except models.InvalidLabel as exc:
                raise exceptions.ValidationError(str(exc)) from exc
            logger.info(
                f'label:create Label id:{db_label.id} for spec:{label} '
                f'with sublabels:{sublabels}, parent_label:{parent_label}'
            )

            cls.create_labels(sublabels, parent_instance=parent_instance, parent_label=db_label)

            if db_label.type == str(models.LabelType.SKELETON):
                for db_sublabel in list(db_label.sublabels.all()):
                    svg = svg.replace(
                        f'data-label-name="{db_sublabel.name}"',
                        f'data-label-id="{db_sublabel.id}"'
                    )
                db_skeleton = models.Skeleton.objects.create(root=db_label, svg=svg)
                logger.info(f'label:create Skeleton id:{db_skeleton.id} for label_id:{db_label.id}')

            for attr in attributes:
                if attr.get('id', None):
                    del attr['id']
                models.AttributeSpec.objects.create(label=db_label, **attr)

    @classmethod
    @transaction.atomic
    def update_labels(cls,
        labels: Iterable[Dict[str, Any]],
        *,
        parent_instance: Union[models.Project, models.Task],
        parent_label: Optional[models.Label] = None
    ):
        _, logger = cls._get_parent_info(parent_instance)

        for label in labels:
            sublabels = label.pop('sublabels', [])
            svg = label.pop('svg', '')
            db_label = cls.update_label(label, svg, sublabels,
                parent_instance=parent_instance, parent_label=parent_label
            )
            if db_label:
                logger.info(
                    f'label:update Label id:{db_label.id} for spec:{label} '
                    f'with sublabels:{sublabels}, parent_label:{parent_label}'
                )
            else:
                logger.info(
                    f'label:delete label:{label} with '
                    f'sublabels:{sublabels}, parent_label:{parent_label}'
                )

    @classmethod
    def _get_parent_info(cls, parent_instance: Union[models.Project, models.Task]):
        parent_info = {}
        if isinstance(parent_instance, models.Project):
            parent_info['project'] = parent_instance
            logger = slogger.project[parent_instance.id]
        elif isinstance(parent_instance, models.Task):
            parent_info['task'] = parent_instance
            logger = slogger.task[parent_instance.id]
        else:
            raise TypeError(f"Unexpected parent instance type {type(parent_instance).__name__}")

        return parent_info, logger

    def update(self, instance, validated_data):
        if not self._local:
            return super().update(instance, validated_data)

        # Here we reuse the parent entity logic to make sure everything is done
        # like these entities expect. Initial data (unprocessed) is used to
        # avoid introducing premature changes.
        data = copy(self.initial_data)
        data['id'] = instance.id
        data.setdefault('name', instance.name)
        parent_query = { 'labels': [data] }

        if isinstance(instance.project, models.Project):
            parent_serializer = ProjectWriteSerializer(
                instance=instance.project, data=parent_query, partial=True,
            )
        elif isinstance(instance.task, models.Task):
            parent_serializer = TaskWriteSerializer(
                instance=instance.task, data=parent_query, partial=True,
            )

        parent_serializer.is_valid(raise_exception=True)
        parent_serializer.save()

        self.instance = models.Label.objects.get(pk=instance.pk)
        return self.instance

class StorageSerializer(serializers.ModelSerializer):
    cloud_storage_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = models.Storage
        fields = ('id', 'location', 'cloud_storage_id')

class JobReadSerializer(serializers.ModelSerializer):
    task_id = serializers.ReadOnlyField(source="segment.task.id")
    project_id = serializers.ReadOnlyField(source="get_project_id", allow_null=True)
    guide_id = serializers.ReadOnlyField(source="get_guide_id", allow_null=True)
    start_frame = serializers.ReadOnlyField(source="segment.start_frame")
    stop_frame = serializers.ReadOnlyField(source="segment.stop_frame")
    frame_count = serializers.ReadOnlyField(source="segment.frame_count")
    assignee = BasicUserSerializer(allow_null=True, read_only=True)
    dimension = serializers.CharField(max_length=2, source='segment.task.dimension', read_only=True)
    data_chunk_size = serializers.ReadOnlyField(source='segment.task.data.chunk_size')
    organization = serializers.ReadOnlyField(source='segment.task.organization.id', allow_null=True)
    data_compressed_chunk_type = serializers.ReadOnlyField(source='segment.task.data.compressed_chunk_type')
    mode = serializers.ReadOnlyField(source='segment.task.mode')
    bug_tracker = serializers.CharField(max_length=2000, source='get_bug_tracker',
        allow_null=True, read_only=True)
    labels = LabelsSummarySerializer(source='*')
    issues = IssuesSummarySerializer(source='*')
    target_storage = StorageSerializer(required=False, allow_null=True)
    source_storage = StorageSerializer(required=False, allow_null=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'task_id', 'project_id', 'assignee', 'guide_id',
            'dimension', 'bug_tracker', 'status', 'stage', 'state', 'mode', 'frame_count',
            'start_frame', 'stop_frame', 'data_chunk_size', 'data_compressed_chunk_type',
            'created_date', 'updated_date', 'issues', 'labels', 'type', 'organization',
            'target_storage', 'source_storage')
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.segment.type == models.SegmentType.SPECIFIC_FRAMES:
            data['data_compressed_chunk_type'] = models.DataChoice.IMAGESET

        if request := self.context.get('request'):
            perm = TaskPermission.create_scope_view(request, instance.segment.task)
            result = perm.check_access()
            if result.allow:
                if task_source_storage := instance.get_source_storage():
                    data['source_storage'] = StorageSerializer(task_source_storage).data
                if task_target_storage := instance.get_target_storage():
                    data['target_storage'] = StorageSerializer(task_target_storage).data

        return data


class JobWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    assignee = serializers.IntegerField(allow_null=True, required=False)

    # NOTE: Field variations can be expressed using serializer inheritance, but it is
    # harder to use then: we need to make a manual switch in get_serializer_class()
    # and create an extra serializer type in the API schema.
    # Need to investigate how it can be simplified.
    type = serializers.ChoiceField(choices=models.JobType.choices())

    task_id = serializers.IntegerField()
    frame_selection_method = serializers.ChoiceField(
        choices=models.JobFrameSelectionMethod.choices(), required=False)

    frame_count = serializers.IntegerField(min_value=0, required=False,
        help_text=textwrap.dedent("""\
            The number of frames included in the job.
            Applicable only to the random frame selection
        """))
    seed = serializers.IntegerField(min_value=0, required=False,
        help_text=textwrap.dedent("""\
            The seed value for the random number generator.
            The same value will produce the same frame sets.
            Applicable only to the random frame selection.
            By default, a random value is used.
        """))

    frames = serializers.ListField(child=serializers.IntegerField(min_value=0),
        required=False, help_text=textwrap.dedent("""\
            The list of frame ids. Applicable only to the manual frame selection
        """))

    class Meta:
        model = models.Job
        random_selection_params = ('frame_count', 'seed',)
        manual_selection_params = ('frames',)
        write_once_fields = ('type', 'task_id', 'frame_selection_method',) \
            + random_selection_params + manual_selection_params
        fields = ('assignee', 'stage', 'state', ) + write_once_fields

    def to_representation(self, instance):
        serializer = JobReadSerializer(instance, context=self.context)
        return serializer.data

    @transaction.atomic
    def create(self, validated_data):
        task_id = validated_data.pop('task_id')
        task = models.Task.objects.select_for_update().get(pk=task_id)

        if validated_data["type"] == models.JobType.GROUND_TRUTH:
            if not task.data:
                raise serializers.ValidationError(
                    "This task has no data attached yet. Please set up task data and try again"
                )
            if task.dimension != models.DimensionType.DIM_2D:
                raise serializers.ValidationError(
                    "Ground Truth jobs can only be added in 2d tasks"
                )

            size = task.data.size
            valid_frame_ids = task.data.get_valid_frame_indices()

            frame_selection_method = validated_data.pop("frame_selection_method", None)
            if frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
                frame_count = validated_data.pop("frame_count")
                if size < frame_count:
                    raise serializers.ValidationError(
                        f"The number of frames requested ({frame_count}) "
                        f"must be not be greater than the number of the task frames ({size})"
                    )

                seed = validated_data.pop("seed", None)

                # The RNG backend must not change to yield reproducible results,
                # so here we specify it explicitly
                from numpy import random
                rng = random.Generator(random.MT19937(seed=seed))

                if seed is not None and frame_count < size:
                    # Reproduce the old (a little bit incorrect) behavior that existed before
                    # https://github.com/cvat-ai/cvat/pull/7126
                    # to make the old seed-based sequences reproducible
                    valid_frame_ids = [v for v in valid_frame_ids if v != task.data.stop_frame]

                frames = rng.choice(
                    list(valid_frame_ids), size=frame_count, shuffle=False, replace=False
                ).tolist()
            elif frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
                frames = validated_data.pop("frames")

                if not frames:
                    raise serializers.ValidationError("The list of frames cannot be empty")

                unique_frames = set(frames)
                if len(unique_frames) != len(frames):
                    raise serializers.ValidationError(f"Frames must not repeat")

                invalid_ids = unique_frames.difference(valid_frame_ids)
                if invalid_ids:
                    raise serializers.ValidationError(
                        "The following frames are not included "
                        f"in the task: {','.join(map(str, invalid_ids))}"
                    )
            else:
                raise serializers.ValidationError(
                    f"Unexpected frame selection method '{frame_selection_method}'"
                )

            segment = models.Segment.objects.create(
                start_frame=0,
                stop_frame=task.data.size - 1,
                frames=frames,
                task=task,
                type=models.SegmentType.SPECIFIC_FRAMES,
            )
        else:
            raise serializers.ValidationError(f"Unexpected job type '{validated_data['type']}'")

        validated_data['segment'] = segment

        try:
            job = super().create(validated_data)
        except models.TaskGroundTruthJobsLimitError as ex:
            raise serializers.ValidationError(ex.message) from ex

        job.make_dirs()
        return job

    def update(self, instance, validated_data):
        stage = validated_data.get('stage', instance.stage)
        state = validated_data.get('state', models.StateChoice.NEW if stage != instance.stage else instance.state)

        if 'stage' in validated_data or 'state' in validated_data:
            if stage == models.StageChoice.ANNOTATION:
                validated_data['status'] = models.StatusChoice.ANNOTATION
            elif stage == models.StageChoice.ACCEPTANCE and state == models.StateChoice.COMPLETED:
                validated_data['status'] = models.StatusChoice.COMPLETED
            else:
                validated_data['status'] = models.StatusChoice.VALIDATION

        if state != instance.state:
            validated_data['state'] = state

        assignee = validated_data.get('assignee')
        if assignee is not None:
            validated_data['assignee'] = User.objects.get(id=assignee)

        instance = super().update(instance, validated_data)

        return instance

class SimpleJobSerializer(serializers.ModelSerializer):
    assignee = BasicUserSerializer(allow_null=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'status', 'stage', 'state', 'type')
        read_only_fields = fields

class SegmentSerializer(serializers.ModelSerializer):
    jobs = SimpleJobSerializer(many=True, source='job_set')
    frames = serializers.ListSerializer(child=serializers.IntegerField(), allow_empty=True)

    class Meta:
        model = models.Segment
        fields = ('start_frame', 'stop_frame', 'jobs', 'type', 'frames')
        read_only_fields = fields

class ClientFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ClientFile
        fields = ('file', )

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        return {'file': data}

    # pylint: disable=no-self-use
    def to_representation(self, instance):
        if instance:
            upload_dir = instance.data.get_upload_dirname()
            return instance.file.path[len(upload_dir) + 1:]
        else:
            return instance

class ServerFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ServerFile
        fields = ('file', )

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        return {'file': data}

    # pylint: disable=no-self-use
    def to_representation(self, instance):
        return instance.file if instance else instance

class RemoteFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.RemoteFile
        fields = ('file', )

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        return {'file': data}

    # pylint: disable=no-self-use
    def to_representation(self, instance):
        return instance.file if instance else instance

class RqStatusSerializer(serializers.Serializer):
    state = serializers.ChoiceField(choices=[
        "Queued", "Started", "Finished", "Failed"])
    message = serializers.CharField(allow_blank=True, default="")
    progress = serializers.FloatField(max_value=100, default=0)

class RqIdSerializer(serializers.Serializer):
    rq_id = serializers.CharField(help_text="Request id")


class JobFiles(serializers.ListField):
    """
    Read JobFileMapping docs for more info.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('child', serializers.CharField(allow_blank=False, max_length=1024))
        kwargs.setdefault('allow_empty', False)
        super().__init__(*args, **kwargs)


class JobFileMapping(serializers.ListField):
    """
    Represents a file-to-job mapping.
    Useful to specify a custom job configuration during task creation.
    This option is not compatible with most other job split-related options.
    Files in the jobs must not overlap or repeat.
    Job file mapping files must be a subset of the input files.
    If directories are specified in server_files, all files obtained by recursive search
    in the specified directories will be used as input files.
    In case of missing items in the input files, an error will be raised.

    Example:
    [

        ["file1.jpg", "file2.jpg"], # job #1 files
        ["file3.png"], # job #2 files
        ["file4.jpg", "file5.png", "file6.bmp"], # job #3 files
    ]
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('child', JobFiles())
        kwargs.setdefault('allow_empty', False)
        kwargs.setdefault('help_text', textwrap.dedent(__class__.__doc__))
        super().__init__(*args, **kwargs)


class DataSerializer(serializers.ModelSerializer):
    """
    Read more about parameters here:
    https://docs.cvat.ai/docs/manual/basics/create_an_annotation_task/#advanced-configuration
    """

    image_quality = serializers.IntegerField(min_value=0, max_value=100,
        help_text="Image quality to use during annotation")
    use_zip_chunks = serializers.BooleanField(default=False,
        help_text=textwrap.dedent("""\
            When true, video chunks will be represented as zip archives with decoded video frames.
            When false, video chunks are represented as video segments
        """))
    client_files = ClientFileSerializer(many=True, default=[],
        help_text=textwrap.dedent("""
            Uploaded files.
            Must contain all files from job_file_mapping if job_file_mapping is not empty.
        """))
    server_files = ServerFileSerializer(many=True, default=[],
        help_text=textwrap.dedent("""
            Paths to files from a file share mounted on the server, or from a cloud storage.
            Must contain all files from job_file_mapping if job_file_mapping is not empty.
        """))
    server_files_exclude = serializers.ListField(required=False, default=[],
        child=serializers.CharField(max_length=1024),
        help_text=textwrap.dedent("""\
            Paths to files and directories from a file share mounted on the server, or from a cloud storage
            that should be excluded from the directories specified in server_files.
            This option cannot be used together with filename_pattern.
            The server_files_exclude parameter cannot be used to exclude a part of dataset from an archive.

            Examples:

            Exclude all files from subfolder 'sub/sub_1/sub_2'and single file 'sub/image.jpg' from specified folder:
            server_files = ['sub/'], server_files_exclude = ['sub/sub_1/sub_2/', 'sub/image.jpg']

            Exclude all cloud storage files with prefix 'sub' from the content of manifest file:
            server_files = ['manifest.jsonl'], server_files_exclude = ['sub/']
        """)
    )
    remote_files = RemoteFileSerializer(many=True, default=[],
        help_text=textwrap.dedent("""
            Direct download URLs for files.
            Must contain all files from job_file_mapping if job_file_mapping is not empty.
        """))
    use_cache = serializers.BooleanField(default=False,
        help_text=textwrap.dedent("""\
            Enable or disable task data chunk caching for the task.
            Read more: https://docs.cvat.ai/docs/manual/advanced/data_on_fly/
        """))
    copy_data = serializers.BooleanField(default=False, help_text=textwrap.dedent("""\
            Copy data from the server file share to CVAT during the task creation.
            This will create a copy of the data, making the server independent from
            the file share availability
        """))
    cloud_storage_id = serializers.IntegerField(write_only=True, allow_null=True, required=False,
        help_text=textwrap.dedent("""\
            If not null, the files referenced by server_files will be retrieved
            from the cloud storage with the specified ID.
            The cloud storages applicable depend on the context.
            In the user sandbox, only the user sandbox cloud storages can be used.
            In an organization, only the organization cloud storages can be used.
        """))
    filename_pattern = serializers.CharField(allow_null=True, required=False,
        help_text=textwrap.dedent("""\
            A filename filter for cloud storage files
            listed in the manifest. Supports fnmatch wildcards.
            Read more: https://docs.python.org/3/library/fnmatch.html
        """))
    job_file_mapping = JobFileMapping(required=False, write_only=True)

    upload_file_order = serializers.ListField(
        child=serializers.CharField(max_length=1024),
        default=list, allow_empty=True, write_only=True,
        help_text=textwrap.dedent("""\
            Allows to specify file order for client_file uploads.
            Only valid with the "{}" sorting method selected.

            To state that the input files are sent in the correct order,
            pass an empty list.

            If you want to send files in an arbitrary order
            and reorder them afterwards on the server,
            pass the list of file names in the required order.
        """.format(models.SortingMethod.PREDEFINED))
    )

    class Meta:
        model = models.Data
        fields = (
            'chunk_size', 'image_quality', 'start_frame', 'stop_frame', 'frame_filter',
            'client_files', 'server_files', 'remote_files',
            'use_zip_chunks', 'server_files_exclude',
            'cloud_storage_id', 'use_cache', 'copy_data', 'storage_method',
            'storage', 'sorting_method', 'filename_pattern',
            'job_file_mapping', 'upload_file_order',
        )
        extra_kwargs = {
            'chunk_size': { 'help_text': "Maximum number of frames per chunk" },
            'start_frame': { 'help_text': "First frame index" },
            'stop_frame': { 'help_text': "Last frame index" },
            'frame_filter': { 'help_text': "Frame filter. The only supported syntax is: 'step=N'" },
        }

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('help_text', self.__doc__)
        super().__init__(*args, **kwargs)

    # pylint: disable=no-self-use
    def validate_frame_filter(self, value):
        match = re.search(r"step\s*=\s*([1-9]\d*)", value)
        if not match:
            raise serializers.ValidationError("Invalid frame filter expression")
        return value

    # pylint: disable=no-self-use
    def validate_chunk_size(self, value):
        if not value > 0:
            raise serializers.ValidationError('Chunk size must be a positive integer')
        return value

    def validate_job_file_mapping(self, value):
        existing_files = set()

        for job_files in value:
            for filename in job_files:
                if filename in existing_files:
                    raise serializers.ValidationError(
                        f"The same file '{filename}' cannot be used multiple "
                        "times in the job file mapping"
                    )

                existing_files.add(filename)

        return value

    # pylint: disable=no-self-use
    def validate(self, attrs):
        if 'start_frame' in attrs and 'stop_frame' in attrs \
            and attrs['start_frame'] > attrs['stop_frame']:
            raise serializers.ValidationError('Stop frame must be more or equal start frame')

        filename_pattern = attrs.get('filename_pattern')
        server_files_exclude = attrs.get('server_files_exclude')
        server_files = attrs.get('server_files', [])

        if filename_pattern and len(list(filter(lambda x: not x['file'].endswith('.jsonl'), server_files))):
            raise serializers.ValidationError('The filename_pattern can only be used with specified manifest or without server_files')

        if filename_pattern and server_files_exclude:
            raise serializers.ValidationError('The filename_pattern and server_files_exclude cannot be used together')

        return attrs

    def create(self, validated_data):
        files = self._pop_data(validated_data)

        db_data = models.Data.objects.create(**validated_data)
        db_data.make_dirs()

        self._create_files(db_data, files)

        db_data.save()
        return db_data

    def update(self, instance, validated_data):
        files = self._pop_data(validated_data)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        self._create_files(instance, files)
        instance.save()
        return instance

    # pylint: disable=no-self-use
    def _pop_data(self, validated_data):
        client_files = validated_data.pop('client_files')
        server_files = validated_data.pop('server_files')
        remote_files = validated_data.pop('remote_files')

        validated_data.pop('job_file_mapping', None) # optional, not present in Data
        validated_data.pop('upload_file_order', None) # optional, not present in Data
        validated_data.pop('server_files_exclude', None) # optional, not present in Data

        for extra_key in { 'use_zip_chunks', 'use_cache', 'copy_data' }:
            validated_data.pop(extra_key)

        files = {'client_files': client_files, 'server_files': server_files, 'remote_files': remote_files}
        return files


    # pylint: disable=no-self-use
    @transaction.atomic
    def _create_files(self, instance, files):
        for files_type, files_model in zip(
            ('client_files', 'server_files', 'remote_files'),
            (models.ClientFile, models.ServerFile, models.RemoteFile),
        ):
            if files_type in files:
                files_model.objects.bulk_create(
                    files_model(data=instance, **f) for f in files[files_type]
                )

class TaskReadSerializer(serializers.ModelSerializer):
    data_chunk_size = serializers.ReadOnlyField(source='data.chunk_size', required=False)
    data_compressed_chunk_type = serializers.ReadOnlyField(source='data.compressed_chunk_type', required=False)
    data_original_chunk_type = serializers.ReadOnlyField(source='data.original_chunk_type', required=False)
    size = serializers.ReadOnlyField(source='data.size', required=False)
    image_quality = serializers.ReadOnlyField(source='data.image_quality', required=False)
    data = serializers.ReadOnlyField(source='data.id', required=False)
    owner = BasicUserSerializer(required=False, allow_null=True)
    assignee = BasicUserSerializer(allow_null=True, required=False)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    guide_id = serializers.IntegerField(source='annotation_guide.id', required=False, allow_null=True)
    dimension = serializers.CharField(allow_blank=True, required=False)
    target_storage = StorageSerializer(required=False, allow_null=True)
    source_storage = StorageSerializer(required=False, allow_null=True)
    jobs = JobsSummarySerializer(url_filter_key='task_id', source='segment_set')
    labels = LabelsSummarySerializer(source='*')

    class Meta:
        model = models.Task
        fields = ('url', 'id', 'name', 'project_id', 'mode', 'owner', 'assignee',
            'bug_tracker', 'created_date', 'updated_date', 'overlap', 'segment_size',
            'status', 'data_chunk_size', 'data_compressed_chunk_type', 'guide_id',
            'data_original_chunk_type', 'size', 'image_quality', 'data', 'dimension',
            'subset', 'organization', 'target_storage', 'source_storage', 'jobs', 'labels',
        )
        read_only_fields = fields
        extra_kwargs = {
            'organization': { 'allow_null': True },
            'overlap': { 'allow_null': True },
        }


class TaskWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    labels = LabelSerializer(many=True, source='label_set', partial=True, required=False)
    owner_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    target_storage = StorageSerializer(required=False, allow_null=True)
    source_storage = StorageSerializer(required=False, allow_null=True)

    class Meta:
        model = models.Task
        fields = ('url', 'id', 'name', 'project_id', 'owner_id', 'assignee_id',
            'bug_tracker', 'overlap', 'segment_size', 'labels', 'subset',
            'target_storage', 'source_storage',
        )
        write_once_fields = ('overlap', 'segment_size')

    def to_representation(self, instance):
        serializer = TaskReadSerializer(instance, context=self.context)
        return serializer.data

    # pylint: disable=no-self-use
    @transaction.atomic
    def create(self, validated_data):
        project_id = validated_data.get("project_id")
        if not (validated_data.get("label_set") or project_id):
            raise serializers.ValidationError('Label set or project_id must be present')
        if validated_data.get("label_set") and project_id:
            raise serializers.ValidationError('Project must have only one of Label set or project_id')

        project = None
        if project_id:
            try:
                project = models.Project.objects.get(id=project_id)
            except models.Project.DoesNotExist:
                raise serializers.ValidationError(f'The specified project #{project_id} does not exist.')

            if project.organization != validated_data.get('organization'):
                raise serializers.ValidationError(f'The task and its project should be in the same organization.')

        labels = validated_data.pop('label_set', [])

        # configure source/target storages for import/export
        storages = _configure_related_storages({
            'source_storage': validated_data.pop('source_storage', None),
            'target_storage': validated_data.pop('target_storage', None),
        })

        db_task = models.Task.objects.create(
            **storages,
            **validated_data)

        task_path = db_task.get_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        os.makedirs(task_path)

        LabelSerializer.create_labels(labels, parent_instance=db_task)

        db_task.save()
        return db_task

    # pylint: disable=no-self-use
    @transaction.atomic
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner_id = validated_data.get('owner_id', instance.owner_id)
        instance.assignee_id = validated_data.get('assignee_id', instance.assignee_id)
        instance.bug_tracker = validated_data.get('bug_tracker',
            instance.bug_tracker)
        instance.subset = validated_data.get('subset', instance.subset)
        labels = validated_data.get('label_set', [])

        if instance.project_id is None:
            LabelSerializer.update_labels(labels, parent_instance=instance)

        validated_project_id = validated_data.get('project_id')
        if validated_project_id is not None and validated_project_id != instance.project_id:
            project = models.Project.objects.get(id=validated_project_id)
            if project.tasks.count() and project.tasks.first().dimension != instance.dimension:
                raise serializers.ValidationError(f'Dimension ({instance.dimension}) of the task must be the same as other tasks in project ({project.tasks.first().dimension})')

            if instance.project_id is None:
                label_set = instance.label_set.all()
            else:
                label_set = instance.project.label_set.all()

            for old_label in label_set:
                new_label_for_name = list(filter(lambda x: x.get('id', None) == old_label.id, labels))
                if len(new_label_for_name):
                    old_label.name = new_label_for_name[0].get('name', old_label.name)
                try:
                    if old_label.parent:
                        new_label = project.label_set.filter(name=old_label.name, parent__name=old_label.parent.name).first()
                    else:
                        new_label = project.label_set.filter(name=old_label.name).first()
                except ValueError:
                    raise serializers.ValidationError(f'Target project does not have label with name "{old_label.name}"')

                for old_attr in old_label.attributespec_set.all():
                    new_attr = new_label.attributespec_set.filter(name=old_attr.name,
                                                                  values=old_attr.values,
                                                                  input_type=old_attr.input_type).first()
                    if new_attr is None:
                        raise serializers.ValidationError('Target project does not have ' \
                            f'"{old_label.name}" label with "{old_attr.name}" attribute')

                    for (model, model_name) in (
                        (models.LabeledTrackAttributeVal, 'track'),
                        (models.LabeledShapeAttributeVal, 'shape'),
                        (models.LabeledImageAttributeVal, 'image'),
                        (models.TrackedShapeAttributeVal, 'shape__track')
                    ):
                        model.objects.filter(**{
                            f'{model_name}__job__segment__task': instance,
                            f'{model_name}__label': old_label,
                            'spec': old_attr
                        }).update(spec=new_attr)

                for model in (models.LabeledTrack, models.LabeledShape, models.LabeledImage):
                    model.objects.filter(job__segment__task=instance, label=old_label).update(
                        label=new_label
                    )

            if instance.project_id is None:
                instance.label_set.all().delete()

            instance.project = project

        # update source and target storages
        _update_related_storages(instance, validated_data)

        instance.save()

        if 'label_set' in validated_data and not instance.project_id:
            self.update_child_objects_on_labels_update(instance)

        return instance

    def update_child_objects_on_labels_update(self, instance: models.Task):
        models.Job.objects.filter(
            updated_date__lt=instance.updated_date, segment__task=instance
        ).update(updated_date=instance.updated_date)

    def validate(self, attrs):
        # When moving task labels can be mapped to one, but when not names must be unique
        if 'project_id' in attrs.keys() and self.instance is not None:
            project_id = attrs.get('project_id')
            if project_id is not None:
                project = models.Project.objects.filter(id=project_id).first()
                if project is None:
                    raise serializers.ValidationError(f'Cannot find project with ID {project_id}')

            # Check that all labels can be mapped
            new_label_names = set()
            old_labels = self.instance.project.label_set.all() if self.instance.project_id else self.instance.label_set.all()
            new_sublabel_names = {}
            for old_label in old_labels:
                new_labels = tuple(filter(lambda x: x.get('id') == old_label.id, attrs.get('label_set', [])))
                if len(new_labels):
                    parent = new_labels[0].get('parent', old_label.parent)
                    if parent:
                        if parent.name not in new_sublabel_names:
                            new_sublabel_names[parent.name] = set()
                        new_sublabel_names[parent.name].add(new_labels[0].get('name', old_label.name))
                    else:
                        new_label_names.add(new_labels[0].get('name', old_label.name))
                else:
                    parent = old_label.parent
                    if parent:
                        if parent.name not in new_sublabel_names:
                            new_sublabel_names[parent.name] = set()
                        new_sublabel_names[parent.name].add(old_label.name)
                    else:
                        new_label_names.add(old_label.name)
            target_project = models.Project.objects.get(id=project_id)
            target_project_label_names = set()
            target_project_sublabel_names = {}
            for label in target_project.label_set.all():
                parent = label.parent
                if parent:
                    if parent.name not in target_project_sublabel_names:
                        target_project_sublabel_names[parent.name] = set()
                    target_project_sublabel_names[parent.name].add(label.name)
                else:
                    target_project_label_names.add(label.name)
            if not new_label_names.issubset(target_project_label_names):
                raise serializers.ValidationError('All task or project label names must be mapped to the target project')

            for label, sublabels in new_sublabel_names.items():
                if sublabels != target_project_sublabel_names.get(label):
                    raise serializers.ValidationError('All task or project label names must be mapped to the target project')

        return attrs

class ProjectReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True, required=False, read_only=True)
    assignee = BasicUserSerializer(allow_null=True, required=False, read_only=True)
    guide_id = serializers.IntegerField(source='annotation_guide.id', required=False, allow_null=True)
    task_subsets = serializers.ListField(child=serializers.CharField(), required=False, read_only=True)
    dimension = serializers.CharField(max_length=16, required=False, read_only=True, allow_null=True)
    target_storage = StorageSerializer(required=False, allow_null=True, read_only=True)
    source_storage = StorageSerializer(required=False, allow_null=True, read_only=True)
    tasks = TasksSummarySerializer(models.Task, url_filter_key='project_id')
    labels = LabelsSummarySerializer(source='*')

    class Meta:
        model = models.Project
        fields = ('url', 'id', 'name', 'owner', 'assignee', 'guide_id',
            'bug_tracker', 'task_subsets', 'created_date', 'updated_date', 'status',
            'dimension', 'organization', 'target_storage', 'source_storage',
            'tasks', 'labels',
        )
        read_only_fields = fields
        extra_kwargs = { 'organization': { 'allow_null': True } }

    def to_representation(self, instance):
        response = super().to_representation(instance)
        task_subsets = set(instance.tasks.values_list('subset', flat=True))
        task_subsets.discard('')
        response['task_subsets'] = list(task_subsets)
        response['dimension'] = instance.tasks.first().dimension if instance.tasks.count() else None
        return response

class ProjectWriteSerializer(serializers.ModelSerializer):
    labels = LabelSerializer(write_only=True, many=True, source='label_set', partial=True, default=[])
    owner_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    task_subsets = serializers.ListField(write_only=True, child=serializers.CharField(), required=False)

    target_storage = StorageSerializer(write_only=True, required=False)
    source_storage = StorageSerializer(write_only=True, required=False)

    class Meta:
        model = models.Project
        fields = ('name', 'labels', 'owner_id', 'assignee_id', 'bug_tracker',
            'target_storage', 'source_storage', 'task_subsets',
        )

    def to_representation(self, instance):
        serializer = ProjectReadSerializer(instance, context=self.context)
        return serializer.data

    # pylint: disable=no-self-use
    @transaction.atomic
    def create(self, validated_data):
        labels = validated_data.pop('label_set')

        # configure source/target storages for import/export
        storages = _configure_related_storages({
            'source_storage': validated_data.pop('source_storage', None),
            'target_storage': validated_data.pop('target_storage', None),
        })

        db_project = models.Project.objects.create(
            **storages,
            **validated_data)

        project_path = db_project.get_dirname()
        if os.path.isdir(project_path):
            shutil.rmtree(project_path)
        os.makedirs(project_path)

        LabelSerializer.create_labels(labels, parent_instance=db_project)

        return db_project

    # pylint: disable=no-self-use
    @transaction.atomic
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner_id = validated_data.get('owner_id', instance.owner_id)
        instance.assignee_id = validated_data.get('assignee_id', instance.assignee_id)
        instance.bug_tracker = validated_data.get('bug_tracker', instance.bug_tracker)
        labels = validated_data.get('label_set', [])

        LabelSerializer.update_labels(labels, parent_instance=instance)

        # update source and target storages
        _update_related_storages(instance, validated_data)

        instance.save()

        if 'label_set' in validated_data:
            self.update_child_objects_on_labels_update(instance)

        return instance

    @transaction.atomic
    def update_child_objects_on_labels_update(self, instance: models.Project):
        models.Task.objects.filter(
            updated_date__lt=instance.updated_date, project=instance
        ).update(updated_date=instance.updated_date)

        models.Job.objects.filter(
            updated_date__lt=instance.updated_date, segment__task__project=instance
        ).update(updated_date=instance.updated_date)


class AboutSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    description = serializers.CharField(max_length=2048)
    version = serializers.CharField(max_length=64)

class FrameMetaSerializer(serializers.Serializer):
    width = serializers.IntegerField()
    height = serializers.IntegerField()
    name = serializers.CharField(max_length=1024)
    related_files = serializers.IntegerField()

    # for compatibility with version 2.3.0
    has_related_context = serializers.SerializerMethodField()

    @extend_schema_field(serializers.BooleanField)
    def get_has_related_context(self, obj: dict) -> bool:
        return obj['related_files'] != 0

class PluginsSerializer(serializers.Serializer):
    GIT_INTEGRATION = serializers.BooleanField()
    ANALYTICS = serializers.BooleanField()
    MODELS = serializers.BooleanField()
    PREDICT = serializers.BooleanField()

class DataMetaReadSerializer(serializers.ModelSerializer):
    frames = FrameMetaSerializer(many=True, allow_null=True)
    image_quality = serializers.IntegerField(min_value=0, max_value=100)
    deleted_frames = serializers.ListField(child=serializers.IntegerField(min_value=0))
    included_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), allow_null=True, required=False,
        help_text=textwrap.dedent("""\
        A list of valid frame ids. The None value means all frames are included.
        """))

    class Meta:
        model = models.Data
        fields = (
            'chunk_size',
            'size',
            'image_quality',
            'start_frame',
            'stop_frame',
            'frame_filter',
            'frames',
            'deleted_frames',
            'included_frames',
        )
        read_only_fields = fields
        extra_kwargs = {
            'size': {
                'help_text': textwrap.dedent("""\
                    The number of frames included. Deleted frames do not affect this value.
                """)
            }
        }

class DataMetaWriteSerializer(serializers.ModelSerializer):
    deleted_frames = serializers.ListField(child=serializers.IntegerField(min_value=0))

    class Meta:
        model = models.Data
        fields = ('deleted_frames',)

class AttributeValSerializer(serializers.Serializer):
    spec_id = serializers.IntegerField()
    value = serializers.CharField(max_length=4096, allow_blank=True)

    def to_internal_value(self, data):
        data['value'] = str(data['value'])
        return super().to_internal_value(data)

class AnnotationSerializer(serializers.Serializer):
    id = serializers.IntegerField(default=None, allow_null=True)
    frame = serializers.IntegerField(min_value=0)
    label_id = serializers.IntegerField(min_value=0)
    group = serializers.IntegerField(min_value=0, allow_null=True, default=None)
    source = serializers.CharField(default='manual')

class LabeledImageSerializer(AnnotationSerializer):
    attributes = AttributeValSerializer(many=True,
        source="labeledimageattributeval_set", default=[])

class OptimizedFloatListField(serializers.ListField):
    '''Default ListField is extremely slow when try to process long lists of points'''

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs, child=serializers.FloatField())

    def to_internal_value(self, data):
        return self.run_child_validation(data)

    def to_representation(self, data):
        return data

    def run_child_validation(self, data):
        errors = OrderedDict()
        for idx, item in enumerate(data):
            if type(item) not in [int, float]:
                errors[idx] = exceptions.ValidationError('Value must be a float or an integer')

        if not errors:
            return data

        raise exceptions.ValidationError(errors)

class ShapeSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=models.ShapeType.choices())
    occluded = serializers.BooleanField(default=False)
    outside = serializers.BooleanField(default=False, required=False)
    z_order = serializers.IntegerField(default=0)
    rotation = serializers.FloatField(default=0, min_value=0, max_value=360)
    points = OptimizedFloatListField(
        allow_empty=True, required=False
    )

class SubLabeledShapeSerializer(ShapeSerializer, AnnotationSerializer):
    attributes = AttributeValSerializer(many=True,
        source="labeledshapeattributeval_set", default=[])

class LabeledShapeSerializer(SubLabeledShapeSerializer):
    elements = SubLabeledShapeSerializer(many=True, required=False)

def _convert_annotation(obj, keys):
    return OrderedDict([(key, obj[key]) for key in keys])

def _convert_attributes(attr_set):
    attr_keys = ['spec_id', 'value']
    return [
        OrderedDict([(key, attr[key]) for key in attr_keys]) for attr in attr_set
    ]

class LabeledImageSerializerFromDB(serializers.BaseSerializer):
    # Use this serializer to export data from the database
    # Because default DRF serializer is too slow on huge collections
    def to_representation(self, instance):
        def convert_tag(tag):
            result = _convert_annotation(tag, ['id', 'label_id', 'frame', 'group', 'source'])
            result['attributes'] = _convert_attributes(tag['labeledimageattributeval_set'])
            return result

        return convert_tag(instance)

class LabeledShapeSerializerFromDB(serializers.BaseSerializer):
    # Use this serializer to export data from the database
    # Because default DRF serializer is too slow on huge collections
    def to_representation(self, instance):
        def convert_shape(shape):
            result = _convert_annotation(shape, [
                'id', 'label_id', 'type', 'frame', 'group', 'source',
                'occluded', 'outside', 'z_order', 'rotation', 'points',
            ])
            result['attributes'] = _convert_attributes(shape['labeledshapeattributeval_set'])
            if shape.get('elements', None) is not None and shape['parent'] is None:
                result['elements'] = [convert_shape(element) for element in shape['elements']]
            return result

        return convert_shape(instance)

class LabeledTrackSerializerFromDB(serializers.BaseSerializer):
    # Use this serializer to export data from the database
    # Because default DRF serializer is too slow on huge collections
    def to_representation(self, instance):
        def convert_track(track):
            shape_keys = [
                'id', 'type', 'frame', 'occluded', 'outside', 'z_order',
                'rotation', 'points', 'trackedshapeattributeval_set',
            ]
            result = _convert_annotation(track, ['id', 'label_id', 'frame', 'group', 'source'])
            result['shapes'] = [_convert_annotation(shape, shape_keys) for shape in track['trackedshape_set']]
            result['attributes'] = _convert_attributes(track['labeledtrackattributeval_set'])
            for shape in result['shapes']:
                shape['attributes'] = _convert_attributes(shape['trackedshapeattributeval_set'])
                shape.pop('trackedshapeattributeval_set', None)
            if track.get('elements', None) is not None and track['parent'] is None:
                result['elements'] = [convert_track(element) for element in track['elements']]
            return result

        return convert_track(instance)

class TrackedShapeSerializer(ShapeSerializer):
    id = serializers.IntegerField(default=None, allow_null=True)
    frame = serializers.IntegerField(min_value=0)
    attributes = AttributeValSerializer(many=True,
        source="trackedshapeattributeval_set", default=[])

class SubLabeledTrackSerializer(AnnotationSerializer):
    shapes = TrackedShapeSerializer(many=True, allow_empty=True,
        source="trackedshape_set")
    attributes = AttributeValSerializer(many=True,
        source="labeledtrackattributeval_set", default=[])

class LabeledTrackSerializer(SubLabeledTrackSerializer):
    elements = SubLabeledTrackSerializer(many=True, required=False)

class LabeledDataSerializer(serializers.Serializer):
    version = serializers.IntegerField(default=0) # TODO: remove
    tags   = LabeledImageSerializer(many=True, default=[])
    shapes = LabeledShapeSerializer(many=True, default=[])
    tracks = LabeledTrackSerializer(many=True, default=[])

class FileInfoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=1024)
    type = serializers.ChoiceField(choices=["REG", "DIR"])
    mime_type = serializers.CharField(max_length=255)

class AnnotationFileSerializer(serializers.Serializer):
    annotation_file = serializers.FileField()

class DatasetFileSerializer(serializers.Serializer):
    dataset_file = serializers.FileField()

    @staticmethod
    def validate_dataset_file(value):
        if os.path.splitext(value.name)[1] != '.zip':
            raise serializers.ValidationError('Dataset file should be zip archive')
        return value

class TaskFileSerializer(serializers.Serializer):
    task_file = serializers.FileField()

class ProjectFileSerializer(serializers.Serializer):
    project_file = serializers.FileField()

class CommentReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True, required=False)

    class Meta:
        model = models.Comment
        fields = ('id', 'issue', 'owner', 'message', 'created_date',
            'updated_date')
        read_only_fields = fields

class CommentWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    def to_representation(self, instance):
        serializer = CommentReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = models.Comment
        fields = ('issue', 'message')
        write_once_fields = ('issue', )


class IssueReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True, required=False)
    assignee = BasicUserSerializer(allow_null=True, required=False)
    position = serializers.ListField(
        child=serializers.FloatField(), allow_empty=False
    )
    comments = CommentsSummarySerializer(models.Comment, url_filter_key='issue_id')

    class Meta:
        model = models.Issue
        fields = ('id', 'frame', 'position', 'job', 'owner', 'assignee',
            'created_date', 'updated_date', 'resolved', 'comments')
        read_only_fields = fields
        extra_kwargs = {
            'created_date': { 'allow_null': True },
            'updated_date': { 'allow_null': True },
        }


class IssueWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    position = serializers.ListField(
        child=serializers.FloatField(), allow_empty=False,
    )
    message = serializers.CharField(style={'base_template': 'textarea.html'})

    def to_representation(self, instance):
        serializer = IssueReadSerializer(instance, context=self.context)
        return serializer.data

    def create(self, validated_data):
        message = validated_data.pop('message')
        db_issue = super().create(validated_data)
        models.Comment.objects.create(issue=db_issue,
            message=message, owner=db_issue.owner)
        return db_issue

    class Meta:
        model = models.Issue
        fields = ('frame', 'position', 'job', 'assignee', 'message', 'resolved')
        write_once_fields = ('frame', 'job', 'message')

class ManifestSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Manifest
        fields = ('filename', )

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        return {'filename': data }

    # pylint: disable=no-self-use
    def to_representation(self, instance):
        return instance.filename if instance else instance

class CloudStorageReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(required=False, allow_null=True)
    manifests = ManifestSerializer(many=True, default=[])
    class Meta:
        model = models.CloudStorage
        exclude = ['credentials']
        read_only_fields = ('created_date', 'updated_date', 'owner', 'organization')
        extra_kwargs = { 'organization': { 'allow_null': True } }

@extend_schema_serializer(
    examples=[
        OpenApiExample(
            'Create AWS S3 cloud storage with credentials',
            description='',
            value={
                'provider_type': models.CloudProviderChoice.AWS_S3,
                'resource': 'somebucket',
                'display_name': 'Bucket',
                'credentials_type': models.CredentialsTypeChoice.KEY_SECRET_KEY_PAIR,
                'key': 'XXX',
                'secret_key': 'XXX',
                'specific_attributes': 'region=eu-central-1',
                'description': 'Some description',
                'manifests': [
                    'manifest.jsonl'
                ],

            },
            request_only=True,
        ),
        OpenApiExample(
            'Create AWS S3 cloud storage without credentials',
            value={
                'provider_type': models.CloudProviderChoice.AWS_S3,
                'resource': 'somebucket',
                'display_name': 'Bucket',
                'credentials_type': models.CredentialsTypeChoice.ANONYMOUS_ACCESS,
                'manifests': [
                    'manifest.jsonl'
                ],
            },
            request_only=True,
        ),
        OpenApiExample(
            'Create Azure cloud storage',
            value={
                'provider_type': models.CloudProviderChoice.AZURE_CONTAINER,
                'resource': 'sonecontainer',
                'display_name': 'Container',
                'credentials_type': models.CredentialsTypeChoice.ACCOUNT_NAME_TOKEN_PAIR,
                'account_name': 'someaccount',
                'session_token': 'xxx',
                'manifests': [
                    'manifest.jsonl'
                ],
            },
            request_only=True,
        ),
        OpenApiExample(
            'Create GCS',
            value={
                'provider_type': models.CloudProviderChoice.GOOGLE_CLOUD_STORAGE,
                'resource': 'somebucket',
                'display_name': 'Bucket',
                'credentials_type': models.CredentialsTypeChoice.KEY_FILE_PATH,
                'key_file': 'file',
                'manifests': [
                    'manifest.jsonl'
                ],
            },
            request_only=True,
        )
    ]
)
class CloudStorageWriteSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(required=False)
    session_token = serializers.CharField(max_length=440, allow_blank=True, required=False)
    key = serializers.CharField(max_length=40, allow_blank=True, required=False)
    secret_key = serializers.CharField(max_length=64, allow_blank=True, required=False)
    key_file = serializers.FileField(required=False)
    account_name = serializers.CharField(max_length=24, allow_blank=True, required=False)
    manifests = ManifestSerializer(many=True, default=[])
    connection_string = serializers.CharField(max_length=1024, allow_blank=True, required=False)

    class Meta:
        model = models.CloudStorage
        fields = (
            'provider_type', 'resource', 'display_name', 'owner', 'credentials_type',
            'created_date', 'updated_date', 'session_token', 'account_name', 'key',
            'secret_key', 'connection_string', 'key_file', 'specific_attributes', 'description', 'id',
            'manifests', 'organization'
        )
        read_only_fields = ('created_date', 'updated_date', 'owner', 'organization')
        extra_kwargs = { 'organization': { 'allow_null': True } }

    # pylint: disable=no-self-use
    def validate_specific_attributes(self, value):
        if value:
            attributes = value.split('&')
            for attribute in attributes:
                if not len(attribute.split('=')) == 2:
                    raise serializers.ValidationError('Invalid specific attributes')
        return value

    def validate(self, attrs):
        provider_type = attrs.get('provider_type')
        if provider_type == models.CloudProviderChoice.AZURE_CONTAINER:
            if not attrs.get('account_name', '') and not attrs.get('connection_string', ''):
                raise serializers.ValidationError('Account name or connection string for Azure container was not specified')

        # AWS S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html?icmpid=docs_amazons3_console
        # Azure Container: https://learn.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata#container-names
        # GCS: https://cloud.google.com/storage/docs/buckets#naming
        ALLOWED_RESOURCE_NAME_SYMBOLS = (
            string.ascii_lowercase + string.digits + "-"
        )

        if provider_type == models.CloudProviderChoice.GOOGLE_CLOUD_STORAGE:
            ALLOWED_RESOURCE_NAME_SYMBOLS += "_."
        elif provider_type == models.CloudProviderChoice.AWS_S3:
            ALLOWED_RESOURCE_NAME_SYMBOLS += "."

        # We need to check only basic naming rule
        if (resource := attrs.get("resource")) and (
            diff := (set(resource) - set(ALLOWED_RESOURCE_NAME_SYMBOLS))
        ):
            raise serializers.ValidationError({
                'resource': f"Invalid characters ({','.join(diff)}) were found.",
            })

        return attrs

    def _validate_prefix(self, value: str) -> None:
        if value.startswith('/'):
            raise serializers.ValidationError('Prefix cannot start with forward slash ("/").')
        if '' in value.strip('/').split('/'):
            raise serializers.ValidationError('Prefix cannot contain multiple slashes in a row.')

    @staticmethod
    def _manifests_validation(storage, manifests):
        # check manifest files availability
        for manifest in manifests:
            file_status = storage.get_file_status(manifest)
            if file_status == Status.NOT_FOUND:
                raise serializers.ValidationError({
                    'manifests': "The '{}' file does not exist on '{}' cloud storage" \
                        .format(manifest, storage.name)
                })
            elif file_status == Status.FORBIDDEN:
                raise serializers.ValidationError({
                    'manifests': "The '{}' file does not available on '{}' cloud storage. Access denied" \
                        .format(manifest, storage.name)
                })

    def create(self, validated_data):
        provider_type = validated_data.get('provider_type')
        should_be_created = validated_data.pop('should_be_created', None)

        key_file = validated_data.pop('key_file', None)
        # we need to save it to temporary file to check the granted permissions
        temporary_file = None
        if key_file:
            with NamedTemporaryFile(mode='wb', prefix='cvat', delete=False) as temp_key:
                temp_key.write(key_file.read())
                temporary_file = temp_key.name
            key_file.close()
            del key_file
        credentials = Credentials(
            account_name=validated_data.pop('account_name', ''),
            key=validated_data.pop('key', ''),
            secret_key=validated_data.pop('secret_key', ''),
            session_token=validated_data.pop('session_token', ''),
            key_file_path=temporary_file,
            credentials_type = validated_data.get('credentials_type'),
            connection_string = validated_data.pop('connection_string', '')
        )
        details = {
            'resource': validated_data.get('resource'),
            'credentials': credentials,
            'specific_attributes': parse_specific_attributes(validated_data.get('specific_attributes', ''))
        }

        if (prefix := details['specific_attributes'].get('prefix')):
            self._validate_prefix(prefix)

        storage = get_cloud_storage_instance(cloud_provider=provider_type, **details)
        if should_be_created:
            try:
                storage.create()
            except Exception as ex:
                slogger.glob.warning("Failed with creating storage\n{}".format(str(ex)))
                raise

        storage_status = storage.get_status()
        if storage_status == Status.AVAILABLE:
            manifests = [m.get('filename') for m in validated_data.pop('manifests')]
            self._manifests_validation(storage, manifests)

            db_storage = models.CloudStorage.objects.create(
                credentials=credentials.convert_to_db(),
                **validated_data
            )
            db_storage.save()

            manifest_file_instances = [models.Manifest(filename=manifest, cloud_storage=db_storage) for manifest in manifests]
            models.Manifest.objects.bulk_create(manifest_file_instances)

            cloud_storage_path = db_storage.get_storage_dirname()
            if os.path.isdir(cloud_storage_path):
                shutil.rmtree(cloud_storage_path)
            os.makedirs(cloud_storage_path)

            if temporary_file:
                # so, gcs key file is valid and we need to set correct path to the file
                real_path_to_key_file = db_storage.get_key_file_path()
                shutil.copyfile(temporary_file, real_path_to_key_file)
                os.remove(temporary_file)

                credentials.key_file_path = real_path_to_key_file
                db_storage.credentials = credentials.convert_to_db()
                db_storage.save()
            return db_storage
        elif storage_status == Status.FORBIDDEN:
            field = 'credentials'
            message = 'Cannot create resource {} with specified credentials. Access forbidden.'.format(storage.name)
        else:
            field = 'resource'
            message = 'The resource {} not found. It may have been deleted.'.format(storage.name)
        if temporary_file:
            os.remove(temporary_file)
        slogger.glob.error(message)
        raise serializers.ValidationError({field: message})

    @transaction.atomic
    def update(self, instance, validated_data):
        credentials = Credentials()
        credentials.convert_from_db({
            'type': instance.credentials_type,
            'value': instance.credentials,
        })
        credentials_dict = {k:v for k,v in validated_data.items() if k in {
            'key','secret_key', 'account_name', 'session_token', 'key_file_path',
            'credentials_type', 'connection_string'
        }}

        key_file = validated_data.pop('key_file', None)
        temporary_file = None
        if key_file:
            with NamedTemporaryFile(mode='wb', prefix='cvat', delete=False) as temp_key:
                temp_key.write(key_file.read())
                temporary_file = temp_key.name
            credentials_dict['key_file_path'] = temporary_file
            key_file.close()
            del key_file

        if (prefix := parse_specific_attributes(validated_data.get('specific_attributes', '')).get('prefix')):
            self._validate_prefix(prefix)

        credentials.mapping_with_new_values(credentials_dict)
        instance.credentials = credentials.convert_to_db()

        for field in ('credentials_type', 'resource', 'display_name', 'description', 'specific_attributes'):
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        # check cloud storage existing
        details = {
            'resource': instance.resource,
            'credentials': credentials,
            'specific_attributes': parse_specific_attributes(instance.specific_attributes)
        }
        storage = get_cloud_storage_instance(cloud_provider=instance.provider_type, **details)
        storage_status = storage.get_status()
        if storage_status == Status.AVAILABLE:
            new_manifest_names = set(i.get('filename') for i in validated_data.get('manifests', []))
            previous_manifest_names = set(i.filename for i in instance.manifests.all())
            delta_to_delete = tuple(previous_manifest_names - new_manifest_names)
            delta_to_create = tuple(new_manifest_names - previous_manifest_names)
            if delta_to_delete:
                instance.manifests.filter(filename__in=delta_to_delete).delete()
            if delta_to_create:
                # check manifest files existing
                self._manifests_validation(storage, delta_to_create)
                manifest_instances = [models.Manifest(filename=f, cloud_storage=instance) for f in delta_to_create]
                models.Manifest.objects.bulk_create(manifest_instances)
            if temporary_file:
                # so, gcs key file is valid and we need to set correct path to the file
                real_path_to_key_file = instance.get_key_file_path()
                shutil.copyfile(temporary_file, real_path_to_key_file)
                os.remove(temporary_file)

                instance.credentials = real_path_to_key_file
            instance.save()
            return instance
        elif storage_status == Status.FORBIDDEN:
            field = 'credentials'
            message = 'Cannot update resource {} with specified credentials. Access forbidden.'.format(storage.name)
        else:
            field = 'resource'
            message = 'The resource {} not found. It may have been deleted.'.format(storage.name)
        if temporary_file:
            os.remove(temporary_file)
        slogger.glob.error(message)
        raise serializers.ValidationError({field: message})


class CloudStorageContentSerializer(serializers.Serializer):
    next = serializers.CharField(required=False, allow_null=True, allow_blank=True,
        help_text="This token is used to continue listing files in the bucket.")
    content = FileInfoSerializer(many=True)

class RelatedFileSerializer(serializers.ModelSerializer):

    class Meta:
        model = models.RelatedFile
        fields = '__all__'
        read_only_fields = ('path',)


def _update_related_storages(
    instance: Union[models.Project, models.Task],
    validated_data: Dict[str, Any],
) -> None:
    for storage_type in ('source_storage', 'target_storage'):
        new_conf = validated_data.pop(storage_type, None)

        if not new_conf:
            continue

        new_cloud_storage_id = new_conf.get('cloud_storage_id')
        new_location = new_conf.get('location')

        # storage_instance maybe None
        storage_instance = getattr(instance, storage_type)

        if new_cloud_storage_id:
            if new_location and new_location != models.Location.CLOUD_STORAGE:
                raise serializers.ValidationError(
                    f"It is not allowed to specify '{new_location}' location together with cloud storage id"
                )
            elif (
                not new_location
                and getattr(storage_instance, "location", None) != models.Location.CLOUD_STORAGE
            ):
                raise serializers.ValidationError(
                    f"The configuration of {storage_type} is not full"
                )

            if not models.CloudStorage.objects.filter(id=new_cloud_storage_id).exists():
                raise serializers.ValidationError(
                    f"The specified cloud storage {new_cloud_storage_id} does not exist."
                )
        else:
            if new_location == models.Location.CLOUD_STORAGE:
                raise serializers.ValidationError(
                    "Cloud storage was selected as location but its id was not specified"
                )
            elif (
                not new_location
                and getattr(storage_instance, "location", None) == models.Location.CLOUD_STORAGE
                and "cloud_storage_id" in new_conf
            ):
                raise serializers.ValidationError(
                    "It is not allowed to reset a cloud storage id without explicitly resetting a location"
                )

        if not storage_instance:
            storage_instance = models.Storage(**new_conf)
            storage_instance.save()
            setattr(instance, storage_type, storage_instance)
            continue

        storage_instance.location = new_location or storage_instance.location
        storage_instance.cloud_storage_id = new_cloud_storage_id
        storage_instance.save()

def _configure_related_storages(validated_data: Dict[str, Any]) -> Dict[str, Optional[models.Storage]]:
    storages = {
        'source_storage': None,
        'target_storage': None,
    }

    for i in storages:
        if storage_conf := validated_data.get(i):
            if (
                (cloud_storage_id := storage_conf.get('cloud_storage_id')) and
                not models.CloudStorage.objects.filter(id=cloud_storage_id).exists()
            ):
                raise serializers.ValidationError(f'The specified cloud storage {cloud_storage_id} does not exist.')
            storage_instance = models.Storage(**storage_conf)
            storage_instance.save()
            storages[i] = storage_instance
    return storages

class AssetReadSerializer(WriteOnceMixin, serializers.ModelSerializer):
    filename = serializers.CharField(required=True, max_length=1024)
    owner = BasicUserSerializer(required=False)

    class Meta:
        model = models.Asset
        fields = ('uuid', 'filename', 'created_date', 'owner', 'guide_id', )
        read_only_fields = fields

class AssetWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    uuid = serializers.CharField(required=False)
    filename = serializers.CharField(required=True, max_length=1024)
    guide_id = serializers.IntegerField(required=True)

    class Meta:
        model = models.Asset
        fields = ('uuid', 'filename', 'created_date', 'guide_id', )
        write_once_fields = ('uuid', 'filename', 'created_date', 'guide_id', )

class AnnotationGuideReadSerializer(WriteOnceMixin, serializers.ModelSerializer):
    class Meta:
        model = models.AnnotationGuide
        fields = ('id', 'task_id', 'project_id', 'created_date', 'updated_date', 'markdown', )
        read_only_fields = fields

class AnnotationGuideWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    project_id = serializers.IntegerField(required=False, allow_null=True)
    task_id = serializers.IntegerField(required=False, allow_null=True)

    @transaction.atomic
    def create(self, validated_data):
        project_id = validated_data.get("project_id", None)
        task_id = validated_data.get("task_id", None)
        if project_id is None and task_id is None:
            raise serializers.ValidationError('One of project_id or task_id must be specified')
        if project_id is not None and task_id is not None:
            raise serializers.ValidationError('Both project_id and task_id must not be specified')

        project = None
        task = None
        if project_id is not None:
            try:
                project = models.Project.objects.get(id=project_id)
            except models.Project.DoesNotExist:
                raise serializers.ValidationError(f'The specified project #{project_id} does not exist.')

        if task_id is not None:
            try:
                task = models.Task.objects.get(id=task_id)
            except models.Task.DoesNotExist:
                raise serializers.ValidationError(f'The specified task #{task_id} does not exist.')
        db_data = models.AnnotationGuide.objects.create(**validated_data, project = project, task = task)
        return db_data

    @transaction.atomic
    def save(self, **kwargs):
        instance = super().save(**kwargs)
        def _update_assets(guide):
            md_assets = []
            current_assets = list(guide.assets.all())
            markdown = guide.markdown

            # pylint: disable=anomalous-backslash-in-string
            pattern = re.compile(r'\(/api/assets/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)')
            results = re.findall(pattern, markdown)

            for asset_id in results:
                db_asset = models.Asset.objects.get(pk=asset_id)
                if db_asset.guide_id != guide.id:
                    raise serializers.ValidationError('Asset is already related to another guide')
                md_assets.append(db_asset)

            for current_asset in current_assets:
                if current_asset not in md_assets:
                    current_asset.delete()

        _update_assets(instance)
        return instance


    class Meta:
        model = models.AnnotationGuide
        fields = ('id', 'task_id', 'project_id', 'markdown', )
