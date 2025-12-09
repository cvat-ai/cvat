# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
import re
import shutil
import string
import textwrap
import uuid
import warnings
from collections import OrderedDict
from collections.abc import Iterable, Sequence
from contextlib import closing
from copy import copy
from datetime import datetime
from inspect import isclass
from tempfile import NamedTemporaryFile
from typing import Any, cast

import django_rq
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.db.models import Count, Prefetch, prefetch_related_objects
from django.utils import timezone
from django.utils.functional import cached_property
from drf_spectacular.utils import OpenApiExample, extend_schema_field, extend_schema_serializer
from numpy import random
from PIL import Image
from rest_framework import exceptions, serializers

from cvat.apps.dataset_manager.formats.utils import get_label_color
from cvat.apps.engine import field_validation, models
from cvat.apps.engine.cloud_provider import (
    Credentials,
    Status,
    db_storage_to_storage_instance,
    get_cloud_storage_instance,
)
from cvat.apps.engine.frame_provider import TaskFrameProvider
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.model_utils import bulk_create
from cvat.apps.engine.permissions import TaskPermission
from cvat.apps.engine.rq import RunningBackgroundProcessesError, update_org_related_data_in_rq_jobs
from cvat.apps.engine.task_validation import HoneypotFrameSelector
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import (
    CvatChunkTimestampMismatchError,
    av_scan_paths,
    build_field_filter_params,
    format_list,
    get_list_view_name,
    get_path_size,
    grouped,
    parse_specific_attributes,
    reverse,
    take_by,
)
from cvat.apps.organizations.models import Organization
from cvat.apps.webhooks.models import Webhook
from utils.dataset_manifest import ImageManifestManager

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
        if not fields['count'].source:
            fields['count'].source = self._collection_key + '.count'
        return fields

    def get_attribute(self, instance):
        return instance

class JobsSummarySerializer(_CollectionSummarySerializer):
    count = serializers.IntegerField(source='total_jobs_count', default=0)
    completed = serializers.IntegerField(source='completed_jobs_count', allow_null=True)
    validation = serializers.IntegerField(source='validation_jobs_count', allow_null=True)

    def __init__(self, *, model=models.Job, url_filter_key, **kwargs):
        super().__init__(model=model, url_filter_key=url_filter_key, **kwargs)


MAX_FILENAME_LENGTH = 1024


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
        return getattr(instance, 'issue__count', 0)

    def to_representation(self, instance):
        request = self.context.get('request')
        if not request:
            return None

        return {
            'url': self.get_url(request, instance),
            'count': self.get_count(instance)
        }


class OrgTransferableMixin():
    def _validate_org_transferring(self, attrs: dict[str, Any]):
        """Method should be called explicitly"""

        if (
            disallowed_fields := set(attrs.keys()) - {'source_storage', 'target_storage', 'organization_id'}
        ):
            raise serializers.ValidationError(
                f"Fields {disallowed_fields} cannot be updated when transferring to another workspace"
            )

    # FUTURE-TODO: race condition is possible here
    def update_organization(
        self,
        instance: models.Task | models.Project,
        *,
        validated_data: dict[str, Any],
        update_fields: list[str],
    ):
        update_date = timezone.now()
        request = cast(ExtendedRequest, self.context['request'])
        organization_id = validated_data["organization_id"]
        organization_slug = None

        if organization_id is not None:
            try:
                organization_slug = (
                    Organization.objects.filter(pk=organization_id).values_list('slug', flat=True)
                )[0]
            except IndexError:
                raise serializers.ValidationError("Invalid organization id")

        cur_user_id = request.user.id
        if instance.owner_id != cur_user_id:
            instance.owner_id = cur_user_id
            update_fields.append("owner_id")

        if instance.assignee_id is not None:
            instance.update_assignee(None, updated_date=update_date)
            update_fields.extend(["assignee_id", "assignee_updated_date"])

        self.update_child_objects_on_organization_update(
            instance, owner_id=cur_user_id, organization_id=organization_id, updated_date=update_date)

        instance.organization_id = organization_id
        update_fields.append("organization_id")

        # update source and target storages
        _update_related_storages(
            instance,
            validated_data=validated_data,
            workspace_transferring=True,
            dst_organization_id=organization_id,
        )

        id_param = f"{instance.__class__.__name__}_id".lower()

        try:
            update_org_related_data_in_rq_jobs( # pylint: disable=unexpected-keyword-arg
                organization_id, organization_slug, **{id_param: instance.pk}
            )
        except RunningBackgroundProcessesError as ex:
            raise serializers.ValidationError(
                f"Background processes are still running in the {ex.queue_name!r} queue"
            )

    def update_child_objects_on_organization_update(
        self,
        instance: models.Task,
        *,
        organization_id: int | None,
        owner_id: int,
        updated_date: datetime,
    ):
        raise NotImplementedError()

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
    has_analytics_access = serializers.BooleanField(
        source='profile.has_analytics_access',
        required=False,
        read_only=True,
    )

    class Meta:
        model = User
        fields = ('url', 'id', 'username', 'first_name', 'last_name', 'email',
            'groups', 'is_staff', 'is_superuser', 'is_active', 'last_login',
            'date_joined', 'has_analytics_access')
        read_only_fields = ('last_login', 'date_joined', 'has_analytics_access')
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
    type = serializers.ChoiceField(choices=models.LabelType.choices(), required=False,
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
        validated_data: dict[str, Any],
        svg: str,
        sublabels: Iterable[dict[str, Any]],
        *,
        parent_instance: models.Project | models.Task,
        parent_label: models.Label | None = None
    ) -> models.Label | None:
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
                    type=validated_data.get('type', models.LabelType.ANY),
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
        labels: Iterable[dict[str, Any]],
        *,
        parent_instance: models.Project | models.Task,
        parent_label: models.Label | None = None
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
        labels: Iterable[dict[str, Any]],
        *,
        parent_instance: models.Project | models.Task,
        parent_label: models.Label | None = None
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
    def _get_parent_info(cls, parent_instance: models.Project | models.Task):
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

    def validate(self, attrs: dict[str, Any]):
        new_cloud_storage_id = attrs.get('cloud_storage_id')
        new_location = attrs.get('location')

        if new_cloud_storage_id:
            if new_location and new_location != models.Location.CLOUD_STORAGE:
                raise serializers.ValidationError(
                    f"It is not allowed to specify '{new_location}' location together with cloud storage id"
                )
            elif not new_location:
                raise serializers.ValidationError(
                    "The configuration is not full, the location=cloud_storage is missing"
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
                and "cloud_storage_id" in attrs
            ):
                raise serializers.ValidationError(
                    "It is not allowed to reset a cloud storage id without explicitly resetting a location"
                )

        return super().validate(attrs)

class JobReadListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        if (request := self.context.get("request")) and isinstance(data, list) and data:
            # Optimized prefetch only for the current page
            page: list[models.Job] = data

            # Annotate page objects
            # We do it explicitly here and not in the LIST queryset to avoid
            # doing the same DB computations twice - one time for the page retrieval
            # and another one for the COUNT(*) request to get the total count
            page_task_ids = set(j.get_task_id() for j in page)
            visible_tasks_perm = TaskPermission.create_scope_list(request)
            visible_tasks_queryset = models.Task.objects.filter(id__in=page_task_ids)
            visible_tasks = set(
                visible_tasks_perm.filter(visible_tasks_queryset).values_list("id", flat=True)
            )

            # Fetching it here removes 1 extra join for all jobs in the COUNT(*) request,
            # limiting in only for the page
            issue_counts = dict(
                models.Job.objects.with_issue_counts().filter(
                    id__in=set(j.id for j in page)
                ).values_list("id", "issue__count")
            )

            for job in page:
                job.user_can_view_task = job.get_task_id() in visible_tasks
                job.issue__count = issue_counts.get(job.id, 0)

        return super().to_representation(data)

class JobReadSerializer(serializers.ModelSerializer):
    task_id = serializers.ReadOnlyField(source="get_task_id")
    project_id = serializers.ReadOnlyField(source="get_project_id", allow_null=True)
    guide_id = serializers.ReadOnlyField(source="get_guide_id", allow_null=True)
    start_frame = serializers.ReadOnlyField(source="segment.start_frame")
    stop_frame = serializers.ReadOnlyField(source="segment.stop_frame")
    frame_count = serializers.ReadOnlyField(source="segment.frame_count")
    assignee = BasicUserSerializer(allow_null=True, read_only=True)
    dimension = serializers.CharField(max_length=2, source='segment.task.dimension', read_only=True)
    data_chunk_size = serializers.ReadOnlyField(source='segment.task.data.chunk_size')
    organization = serializers.ReadOnlyField(source='organization_id', allow_null=True)
    data_original_chunk_type = serializers.ReadOnlyField(source='segment.task.data.original_chunk_type')
    data_compressed_chunk_type = serializers.ReadOnlyField(source='segment.task.data.compressed_chunk_type')
    mode = serializers.ReadOnlyField(source='segment.task.mode')
    bug_tracker = serializers.CharField(max_length=2000, source='get_bug_tracker',
        allow_null=True, read_only=True)
    labels = LabelsSummarySerializer(source='*')
    issues = IssuesSummarySerializer(source='*')
    target_storage = StorageSerializer(required=False, allow_null=True)
    source_storage = StorageSerializer(required=False, allow_null=True)
    parent_job_id = serializers.ReadOnlyField(allow_null=True)
    consensus_replicas = serializers.IntegerField(read_only=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'task_id', 'project_id', 'assignee', 'guide_id',
            'dimension', 'bug_tracker', 'status', 'stage', 'state', 'mode', 'frame_count',
            'start_frame', 'stop_frame',
            'data_chunk_size', 'data_compressed_chunk_type', 'data_original_chunk_type',
            'created_date', 'updated_date', 'issues', 'labels', 'type', 'organization',
            'target_storage', 'source_storage', 'assignee_updated_date', 'parent_job_id',
            'consensus_replicas'
        )
        read_only_fields = fields
        list_serializer_class = JobReadListSerializer

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.segment.type == models.SegmentType.SPECIFIC_FRAMES:
            data['data_compressed_chunk_type'] = models.DataChoice.IMAGESET

        if instance.type == models.JobType.ANNOTATION:
            data['consensus_replicas'] = instance.segment.task.consensus_replicas
        else:
            data['consensus_replicas'] = 0

        if request := self.context.get('request'):
            can_view_task = getattr(instance, "user_can_view_task", None)
            if can_view_task is None:
                perm = TaskPermission.create_scope_view(request, instance.segment.task)
                result = perm.check_access()
                can_view_task = result.allow

            if can_view_task:
                if task_source_storage := instance.get_source_storage():
                    data['source_storage'] = StorageSerializer(task_source_storage).data
                if task_target_storage := instance.get_target_storage():
                    data['target_storage'] = StorageSerializer(task_target_storage).data

        return data

class JobWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    assignee = serializers.IntegerField(allow_null=True, required=False)

    # NOTE: Field sets can be expressed using serializer inheritance, but it is
    # harder to use then: we need to make a manual switch in get_serializer_class()
    # and create an extra serializer type in the API schema.
    # Need to investigate how it can be simplified. It can also be done just internally,
    # (e.g. just on the validation side), but it will complicate the implementation.
    type = serializers.ChoiceField(choices=models.JobType.choices())

    task_id = serializers.IntegerField()
    frame_selection_method = serializers.ChoiceField(
        choices=models.JobFrameSelectionMethod.choices(), required=False
    )
    frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        required=False,
        allow_empty=False,
        help_text=textwrap.dedent("""\
            The list of frame ids. Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.MANUAL))
    )
    frame_count = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text=textwrap.dedent("""\
            The number of frames included in the GT job.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_UNIFORM))
    )
    frame_share = serializers.FloatField(
        required=False,
        validators=[field_validation.validate_share],
        help_text=textwrap.dedent("""\
            The share of frames included in the GT job.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_UNIFORM))
    )
    frames_per_job_count = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text=textwrap.dedent("""\
            The number of frames included in the GT job from each annotation job.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_PER_JOB))
    )
    frames_per_job_share = serializers.FloatField(
        required=False,
        validators=[field_validation.validate_share],
        help_text=textwrap.dedent("""\
            The share of frames included in the GT job from each annotation job.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_PER_JOB))
    )
    random_seed = serializers.IntegerField(
        min_value=0,
        required=False,
        help_text=textwrap.dedent("""\
            The seed value for the random number generator.
            The same value will produce the same frame sets.
            Applicable only to random frame selection methods.
            By default, a random value is used.
        """)
    )

    class Meta:
        model = models.Job
        random_selection_params = (
            'frame_count', 'frame_share', 'frames_per_job_count', 'frames_per_job_share',
            'random_seed'
        )
        manual_selection_params = ('frames',)
        write_once_fields = ('type', 'task_id', 'frame_selection_method',) \
            + random_selection_params + manual_selection_params
        fields = ('assignee', 'stage', 'state', ) + write_once_fields

    def to_representation(self, instance):
        serializer = JobReadSerializer(instance, context=self.context)
        return serializer.data

    def validate(self, attrs):
        frame_selection_method = attrs.get('frame_selection_method')
        if frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            field_validation.require_one_of_fields(attrs, ['frame_count', 'frame_share'])
        elif frame_selection_method == models.JobFrameSelectionMethod.RANDOM_PER_JOB:
            field_validation.require_one_of_fields(
                attrs, ['frames_per_job_count', 'frames_per_job_share']
            )
        elif frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
            field_validation.require_field(attrs, "frames")

        if (
            'frames' in attrs and
            frame_selection_method != models.JobFrameSelectionMethod.MANUAL
        ):
            raise serializers.ValidationError(
                '"frames" can only be used when "frame_selection_method" is "{}"'.format(
                    models.JobFrameSelectionMethod.MANUAL
                )
            )

        return super().validate(attrs)

    @transaction.atomic
    def create(self, validated_data):
        if validated_data["type"] != models.JobType.GROUND_TRUTH:
            raise serializers.ValidationError(f"Unexpected job type '{validated_data['type']}'")

        task_id = validated_data.pop('task_id')
        task = models.Task.objects.select_for_update().get(pk=task_id)

        if not task.data:
            raise serializers.ValidationError(
                "This task has no data attached yet. Please set up task data and try again"
            )
        if task.dimension != models.DimensionType.DIM_2D:
            raise serializers.ValidationError(
                "Ground Truth jobs can only be added in 2d tasks"
            )

        if task.data.validation_mode in (models.ValidationMode.GT_POOL, models.ValidationMode.GT):
            raise serializers.ValidationError(
                f'Task with validation mode "{task.data.validation_mode}" '
                'cannot have more than 1 GT job'
            )

        task_size = task.data.size
        valid_frame_ids = task.data.get_valid_frame_indices()

        frame_selection_method = validated_data.pop("frame_selection_method")
        if frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            if frame_count := validated_data.pop("frame_count", None):
                if task_size < frame_count:
                    raise serializers.ValidationError(
                        f"The number of frames requested ({frame_count}) "
                        f"must not be greater than the number of the task frames ({task_size})"
                    )
            elif frame_share := validated_data.pop("frame_share", None):
                frame_count = max(1, int(frame_share * task_size))
            else:
                raise serializers.ValidationError(
                    "The number of validation frames is not specified"
                )

            seed = validated_data.pop("random_seed", None)

            # The RNG backend must not change to yield reproducible results,
            # so here we specify it explicitly
            rng = random.Generator(random.MT19937(seed=seed))

            frames = rng.choice(
                list(valid_frame_ids), size=frame_count, shuffle=False, replace=False
            ).tolist()
        elif frame_selection_method == models.JobFrameSelectionMethod.RANDOM_PER_JOB:
            if frame_count := validated_data.pop("frames_per_job_count", None):
                if task_size < frame_count:
                    raise serializers.ValidationError(
                        f"The number of frames requested ({frame_count}) "
                        f"must be not be greater than the segment size ({task.segment_size})"
                    )
            elif frame_share := validated_data.pop("frames_per_job_share", None):
                frame_count = min(max(1, int(frame_share * task.segment_size)), task_size)
            else:
                raise serializers.ValidationError(
                    "The number of validation frames is not specified"
                )

            task_frame_provider = TaskFrameProvider(task)
            seed = validated_data.pop("random_seed", None)

            # The RNG backend must not change to yield reproducible results,
            # so here we specify it explicitly
            rng = random.Generator(random.MT19937(seed=seed))

            frames: list[int] = []
            overlap = task.overlap
            for segment in task.segment_set.all():
                segment_frames = set(map(task_frame_provider.get_rel_frame_number, segment.frame_set))
                selected_frames = segment_frames.intersection(frames)
                selected_count = len(selected_frames)

                missing_count = min(len(segment_frames), frame_count) - selected_count
                if missing_count <= 0:
                    continue

                selectable_segment_frames = set(
                    sorted(segment_frames)[overlap * (segment.start_frame != 0) : ]
                ).difference(selected_frames)

                frames.extend(rng.choice(
                    tuple(selectable_segment_frames), size=missing_count, replace=False
                ).tolist())

            frames = list(map(task_frame_provider.get_abs_frame_number, frames))
        elif frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
            frames = validated_data.pop("frames")

            unique_frames = set(frames)
            if len(unique_frames) != len(frames):
                raise serializers.ValidationError(f"Frames must not repeat")

            invalid_ids = unique_frames.difference(range(task_size))
            if invalid_ids:
                raise serializers.ValidationError(
                    "The following frames do not exist in the task: {}".format(
                        format_list(tuple(map(str, sorted(invalid_ids))))
                    )
                )

            task_frame_provider = TaskFrameProvider(task)
            frames = list(map(task_frame_provider.get_abs_frame_number, frames))
        else:
            raise serializers.ValidationError(
                f"Unexpected frame selection method '{frame_selection_method}'"
            )

        # Save the new job
        segment = models.Segment.objects.create(
            start_frame=0,
            stop_frame=task.data.size - 1,
            frames=frames,
            task=task,
            type=models.SegmentType.SPECIFIC_FRAMES,
        )

        validated_data['segment'] = segment
        validated_data["assignee_id"] = validated_data.pop("assignee", None)

        try:
            job = super().create(validated_data)
        except models.TaskGroundTruthJobsLimitError as ex:
            raise serializers.ValidationError(ex.message) from ex

        if validated_data.get("assignee_id"):
            job.assignee_updated_date = job.updated_date
            job.save(update_fields=["assignee_updated_date"])

        job.make_dirs()

        task.data.update_validation_layout(
            models.ValidationLayout(mode=models.ValidationMode.GT, frames=frames)
        )

        return job

    def update(self, instance: models.Job, validated_data: dict[str, Any]):
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

        if "assignee" in validated_data and (
            (assignee_id := validated_data.pop("assignee")) != instance.assignee_id
        ):
            instance.update_assignee(assignee_id)

        instance = super().update(instance, validated_data)
        return instance

class SimpleJobSerializer(serializers.ModelSerializer):
    assignee = BasicUserSerializer(allow_null=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'status', 'stage', 'state', 'type')
        read_only_fields = fields

class JobValidationLayoutWriteSerializer(serializers.Serializer):
    frame_selection_method = serializers.ChoiceField(
        choices=models.JobFrameSelectionMethod.choices(),
        required=True,
        help_text=textwrap.dedent("""\
            The method to use for frame selection of new real frames for honeypots in the job
        """)
    )
    honeypot_real_frames = serializers.ListSerializer(
        child=serializers.IntegerField(min_value=0),
        required=False,
        allow_empty=False,
        help_text=textwrap.dedent("""\
            The list of frame ids. Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.MANUAL))
    )

    def __init__(
        self, *args, bulk_context: _TaskValidationLayoutBulkUpdateContext | None = None, **kwargs
    ):
        super().__init__(*args, **kwargs)

        self._bulk_context = bulk_context

    def validate(self, attrs):
        frame_selection_method = attrs["frame_selection_method"]
        if frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
            field_validation.require_field(attrs, "honeypot_real_frames")
        elif frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            pass
        else:
            assert False

        if (
            'honeypot_real_frames' in attrs and
            frame_selection_method != models.JobFrameSelectionMethod.MANUAL
        ):
            raise serializers.ValidationError(
                '"honeypot_real_frames" can only be used when '
                f'"frame_selection_method" is "{models.JobFrameSelectionMethod.MANUAL}"'
            )

        return super().validate(attrs)

    @transaction.atomic
    def update(self, instance: models.Job, validated_data: dict[str, Any]) -> models.Job:
        from cvat.apps.engine.cache import (
            Callback,
            MediaCache,
            enqueue_create_chunk_job,
            wait_for_rq_job,
        )
        from cvat.apps.engine.frame_provider import JobFrameProvider

        db_job = instance
        db_segment = db_job.segment
        db_task = db_segment.task
        db_data = db_task.data

        if not (
            hasattr(db_job.segment.task.data, 'validation_layout') and
            db_job.segment.task.data.validation_layout.mode == models.ValidationMode.GT_POOL
        ):
            raise serializers.ValidationError(
                "Honeypots can only be modified if the task "
                f"validation mode is '{models.ValidationMode.GT_POOL}'"
            )

        if db_job.type == models.JobType.GROUND_TRUTH:
            raise serializers.ValidationError(
                f"Honeypots cannot exist in {models.JobType.GROUND_TRUTH} jobs"
            )

        assert not hasattr(db_data, 'video')

        frame_step = db_data.get_frame_step()

        def _to_rel_frame(abs_frame: int) -> int:
            return (abs_frame - db_data.start_frame) // frame_step

        def _to_abs_frame(rel_frame: int) -> int:
            return rel_frame * frame_step + db_data.start_frame

        bulk_context = self._bulk_context
        if bulk_context:
            db_frames = bulk_context.all_db_frames
            task_honeypot_frames = set(bulk_context.honeypot_frames)
            task_all_validation_frames = set(bulk_context.all_validation_frames)
            task_active_validation_frames = set(bulk_context.active_validation_frames)
        else:
            db_frames: dict[int, models.Image] = {
                _to_rel_frame(frame.frame): frame
                for frame in db_data.images.all()
            }
            task_honeypot_frames = set(
                _to_rel_frame(frame_id)
                for frame_id, frame in db_frames.items()
                if frame.is_placeholder
            )
            task_all_validation_frames = set(db_data.validation_layout.frames)
            task_active_validation_frames = set(db_data.validation_layout.active_frames)

        segment_frame_set = set(map(_to_rel_frame, db_segment.frame_set))
        segment_honeypots = sorted(segment_frame_set & task_honeypot_frames)
        segment_honeypots_count = len(segment_honeypots)

        frame_selection_method = validated_data['frame_selection_method']
        if frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
            requested_frames: list[int] = validated_data['honeypot_real_frames']
            requested_inactive_frames: set[int] = set()
            requested_normal_frames: set[int] = set()
            for requested_validation_frame in requested_frames:
                if requested_validation_frame not in task_all_validation_frames:
                    requested_normal_frames.add(requested_validation_frame)
                    continue

                if requested_validation_frame not in task_active_validation_frames:
                    requested_inactive_frames.add(requested_validation_frame)
                    continue

            if requested_normal_frames:
                raise serializers.ValidationError(
                    "Could not update honeypot frames: "
                    "frames {} are not from the validation pool".format(
                        format_list(tuple(map(str, sorted(requested_normal_frames))))
                    )
                )

            if requested_inactive_frames:
                raise serializers.ValidationError(
                    "Could not update honeypot frames: "
                    "frames {} are disabled. Restore them in the validation pool first".format(
                        format_list(tuple(map(str, sorted(requested_inactive_frames))))
                    )
                )

            if len(requested_frames) != segment_honeypots_count:
                raise serializers.ValidationError(
                    "Could not update honeypot frames: "
                    "the number of honeypots must remain the same. "
                    "Requested {}, current {}".format(
                        len(requested_frames), segment_honeypots_count
                    )
                )

        elif frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            if len(task_active_validation_frames) < segment_honeypots_count:
                raise serializers.ValidationError(
                    "Can't select validation frames: "
                    "the remaining number of validation frames ({}) "
                    "is less than the number of honeypots in a job ({}). "
                    "Try to restore some validation frames".format(
                        len(task_active_validation_frames), segment_honeypots_count
                    )
                )

            if bulk_context:
                frame_selector = bulk_context.honeypot_frame_selector
            else:
                active_validation_frame_counts = {
                    validation_frame: 0 for validation_frame in task_active_validation_frames
                }
                for task_honeypot_frame in task_honeypot_frames:
                    real_frame = _to_rel_frame(db_frames[task_honeypot_frame].real_frame)
                    if real_frame in task_active_validation_frames:
                        active_validation_frame_counts[real_frame] += 1

                frame_selector = HoneypotFrameSelector(active_validation_frame_counts)

            requested_frames = frame_selector.select_next_frames(segment_honeypots_count)
            requested_frames = list(map(_to_abs_frame, requested_frames))
        else:
            assert False

        # Replace validation frames in the job
        updated_honeypots = {}
        for frame, requested_validation_frame in zip(segment_honeypots, requested_frames):
            db_requested_frame = db_frames[requested_validation_frame]
            db_segment_frame = db_frames[frame]
            assert db_segment_frame.is_placeholder

            if db_segment_frame.real_frame == db_requested_frame.frame:
                continue

            # Change image in the current segment honeypot frame
            db_segment_frame.real_frame = db_requested_frame.frame

            db_segment_frame.path = db_requested_frame.path
            db_segment_frame.width = db_requested_frame.width
            db_segment_frame.height = db_requested_frame.height

            updated_honeypots[frame] = db_segment_frame

        if updated_honeypots:
            if bulk_context:
                bulk_context.updated_honeypots.update(updated_honeypots)
            else:
                # Update image infos
                models.Image.objects.bulk_update(
                    updated_honeypots.values(), fields=['path', 'width', 'height', 'real_frame']
                )

                models.RelatedFile.images.through.objects.filter(
                    image_id__in=updated_honeypots
                ).delete()

                for updated_honeypot in updated_honeypots.values():
                    validation_frame = db_frames[_to_rel_frame(updated_honeypot.real_frame)]
                    updated_honeypot.related_files.set(validation_frame.related_files.all())

                # Remove annotations on changed validation frames
                self._clear_annotations_on_frames(db_segment, updated_honeypots)

                # Update manifest
                manifest_path = db_data.get_manifest_path()
                if os.path.isfile(manifest_path):
                    manifest = ImageManifestManager(manifest_path)
                    manifest.reorder([db_frame.path for db_frame in db_frames.values()])

            # Update chunks
            job_frame_provider = JobFrameProvider(db_job)
            updated_segment_chunk_ids = set(
                job_frame_provider.get_chunk_number(updated_segment_frame_id)
                for updated_segment_frame_id in updated_honeypots
            )
            segment_frames = sorted(segment_frame_set)
            segment_frame_map = dict(zip(segment_honeypots, requested_frames))

            chunks_to_be_removed = []
            queue = django_rq.get_queue(settings.CVAT_QUEUES.CHUNKS.value)
            for chunk_id in sorted(updated_segment_chunk_ids):
                chunk_frames = segment_frames[
                    chunk_id * db_data.chunk_size :
                    (chunk_id + 1) * db_data.chunk_size
                ]

                for quality in models.FrameQuality:
                    if db_data.storage_method == models.StorageMethodChoice.FILE_SYSTEM:
                        rq_id = f"segment_{db_segment.id}_write_chunk_{chunk_id}_{quality}"
                        rq_job = enqueue_create_chunk_job(
                            queue=queue,
                            rq_job_id=rq_id,
                            create_callback=Callback(
                                callable=self._write_updated_static_chunk,
                                args=[
                                    db_segment.id,
                                    chunk_id,
                                    chunk_frames,
                                    quality,
                                    {
                                        chunk_frame: db_frames[chunk_frame].path
                                        for chunk_frame in chunk_frames
                                    },
                                    segment_frame_map,
                                ],
                            ),
                        )
                        wait_for_rq_job(rq_job)

                    chunks_to_be_removed.append(
                        {'db_segment': db_segment, 'chunk_number': chunk_id, 'quality': quality}
                    )

            context_image_chunks_to_be_removed = [
                {"db_data": db_data, "frame_number": f} for f in updated_honeypots
            ]

            if bulk_context:
                bulk_context.chunks_to_be_removed.extend(chunks_to_be_removed)
                bulk_context.context_image_chunks_to_be_removed.extend(
                    context_image_chunks_to_be_removed
                )
                bulk_context.segments_with_updated_chunks.append(db_segment.id)
            else:
                media_cache = MediaCache()
                media_cache.remove_segments_chunks(chunks_to_be_removed)
                media_cache.remove_context_images_chunks(context_image_chunks_to_be_removed)

                db_segment.chunks_updated_date = timezone.now()
                db_segment.save(update_fields=['chunks_updated_date'])

        if updated_honeypots or (
            # even if the randomly selected frames were the same as before, we should still
            # consider it an update to the validation frames and restore them, if they were deleted
            frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM
        ):
            # deleted frames that were updated in the job should be restored, as they are new now
            if set(db_data.deleted_frames).intersection(updated_honeypots):
                db_data.deleted_frames = sorted(
                    set(db_data.deleted_frames).difference(updated_honeypots)
                )
                db_data.save(update_fields=['deleted_frames'])

            new_updated_date = timezone.now()
            db_job.updated_date = new_updated_date

            if bulk_context:
                bulk_context.updated_segments.append(db_segment.id)
            else:
                db_segment.job_set.update(updated_date=new_updated_date)

                db_task.touch()
                if db_task.project:
                    db_task.project.touch()

        return instance

    def _clear_annotations_on_frames(self, segment: models.Segment, frames: Sequence[int]):
        models.clear_annotations_on_frames_in_honeypot_task(segment.task, frames=frames)

    @staticmethod
    def _write_updated_static_chunk(
        db_segment_id: int,
        chunk_id: int,
        chunk_frames: list[int],
        quality: models.FrameQuality,
        frame_path_map: dict[int, str],
        segment_frame_map: dict[int,int],
    ):
        from cvat.apps.engine.frame_provider import prepare_chunk

        db_segment = models.Segment.objects.select_related("task").get(pk=db_segment_id)
        initial_chunks_updated_date = db_segment.chunks_updated_date
        db_task = db_segment.task
        task_frame_provider = TaskFrameProvider(db_task)
        db_data = db_task.data

        def _iterate_chunk_frames():
            for chunk_frame in chunk_frames:
                db_frame_path = frame_path_map[chunk_frame]
                chunk_real_frame = segment_frame_map.get(chunk_frame, chunk_frame)
                yield (
                    task_frame_provider.get_frame(
                        chunk_real_frame, quality=quality
                    ).data,
                    os.path.basename(db_frame_path),
                    chunk_frame,
                )

        with closing(_iterate_chunk_frames()) as frame_iter:
            chunk, _ = prepare_chunk(
                frame_iter, quality=quality, db_task=db_task, dump_unchanged=True,
            )

            db_segment.refresh_from_db(fields=["chunks_updated_date"])
            if db_segment.chunks_updated_date > initial_chunks_updated_date:
                raise CvatChunkTimestampMismatchError(
                    "Attempting to write an out of date static chunk, "
                    f"segment.chunks_updated_date: {db_segment.chunks_updated_date}, "
                    f"expected_ts: {initial_chunks_updated_date}"
            )

            chunk_path = db_data.get_static_segment_chunk_path(chunk_id, db_segment_id, quality)
            with open(chunk_path, "wb") as f:
                f.write(chunk.getvalue())

class JobValidationLayoutReadSerializer(serializers.Serializer):
    honeypot_count = serializers.IntegerField(min_value=0, required=False)
    honeypot_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of frame ids for honeypots in the job
        """)
    )
    honeypot_real_frames = serializers.ListSerializer(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of real (validation) frame ids for honeypots in the job
        """)
    )

    def to_representation(self, instance: models.Job):
        validation_layout = getattr(instance.segment.task.data, 'validation_layout', None)
        if not validation_layout:
            return {}

        data = {}

        if validation_layout.mode == models.ValidationMode.GT_POOL:
            db_segment = instance.segment
            segment_frame_set = db_segment.frame_set

            db_data = db_segment.task.data
            frame_step = db_data.get_frame_step()

            def _to_rel_frame(abs_frame: int) -> int:
                return (abs_frame - db_data.start_frame) // frame_step

            segment_honeypot_frames = []
            for frame in db_segment.task.data.images.all():
                if not frame.is_placeholder:
                    continue

                if not frame.frame in segment_frame_set:
                    continue

                segment_honeypot_frames.append(
                    (_to_rel_frame(frame.frame), _to_rel_frame(frame.real_frame))
                )

            segment_honeypot_frames.sort(key=lambda v: v[0])

            data = {
                'honeypot_count': len(segment_honeypot_frames),
                'honeypot_frames': [v[0] for v in segment_honeypot_frames],
                'honeypot_real_frames': [v[1] for v in segment_honeypot_frames],
            }

        return super().to_representation(data)

class _TaskValidationLayoutBulkUpdateContext:
    def __init__(
        self,
        *,
        all_db_frames: dict[int, models.Image],
        honeypot_frames: list[int],
        all_validation_frames: list[int],
        active_validation_frames: list[int],
        honeypot_frame_selector: HoneypotFrameSelector | None = None
    ):
        self.updated_honeypots: dict[int, models.Image] = {}
        self.updated_segments: list[int] = []
        self.chunks_to_be_removed: list[dict[str, Any]] = []
        self.context_image_chunks_to_be_removed: list[dict[str, Any]] = []
        self.segments_with_updated_chunks: list[int] = []

        self.all_db_frames = all_db_frames
        self.honeypot_frames = honeypot_frames
        self.all_validation_frames = all_validation_frames
        self.active_validation_frames = active_validation_frames
        self.honeypot_frame_selector = honeypot_frame_selector

class TaskValidationLayoutWriteSerializer(serializers.Serializer):
    disabled_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of frame ids to be excluded from validation
        """)
    )
    frame_selection_method = serializers.ChoiceField(
        choices=models.JobFrameSelectionMethod.choices(), required=False,
        help_text=textwrap.dedent("""\
            The method to use for frame selection of new real frames for honeypots in the task
        """)
    )
    honeypot_real_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of frame ids. Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.MANUAL))
    )

    def validate(self, attrs):
        frame_selection_method = attrs.get("frame_selection_method")
        if frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
            field_validation.require_field(attrs, "honeypot_real_frames")
        elif frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            pass

        if (
            'honeypot_real_frames' in attrs and
            frame_selection_method != models.JobFrameSelectionMethod.MANUAL
        ):
            raise serializers.ValidationError(
                '"honeypot_real_frames" can only be used when '
                f'"frame_selection_method" is "{models.JobFrameSelectionMethod.MANUAL}"'
            )

        return super().validate(attrs)

    @transaction.atomic
    def update(self, instance: models.Task, validated_data: dict[str, Any]) -> models.Task:
        # FIXME: this operation is not atomic and it is not protected from race conditions
        # (basically, as many others). Currently, it's up to the user to ensure no parallel
        # calls happen. It also affects any image access, including exports with images, backups,
        # automatic annotation, chunk downloading, etc.

        db_validation_layout: models.ValidationLayout | None = (
            getattr(instance.data, 'validation_layout', None)
        )
        if not db_validation_layout:
            raise serializers.ValidationError("Validation is not configured in the task")

        if 'disabled_frames' in validated_data:
            requested_disabled_frames = validated_data['disabled_frames']
            unknown_requested_disabled_frames = (
                set(requested_disabled_frames).difference(db_validation_layout.frames)
            )
            if unknown_requested_disabled_frames:
                raise serializers.ValidationError(
                    "Unknown frames requested for exclusion from the validation set: {}".format(
                        format_list(tuple(map(str, sorted(unknown_requested_disabled_frames))))
                    )
                )

            gt_job_meta_serializer = JobDataMetaWriteSerializer(instance.gt_job, {
                "deleted_frames": requested_disabled_frames
            })
            gt_job_meta_serializer.is_valid(raise_exception=True)
            gt_job_meta_serializer.save()

            db_validation_layout.refresh_from_db()
            instance.data.refresh_from_db()

        frame_selection_method = validated_data.get('frame_selection_method')
        if frame_selection_method and not (
            db_validation_layout and
            instance.data.validation_layout.mode == models.ValidationMode.GT_POOL
        ):
            raise serializers.ValidationError(
                "Honeypots can only be modified if the task "
                f"validation mode is '{models.ValidationMode.GT_POOL}'"
            )

        if not frame_selection_method:
            return instance

        assert not hasattr(instance.data, 'video')

        # Populate the prefetch cache for required objects
        prefetch_related_objects([instance],
            Prefetch('data__images', queryset=models.Image.objects.order_by('frame')),
            'segment_set',
            'segment_set__job_set',
        )

        frame_provider = TaskFrameProvider(instance)
        db_frames = {
            frame_provider.get_rel_frame_number(db_image.frame): db_image
            for db_image in instance.data.images.all()
        }
        honeypot_frames = sorted(f for f, v in db_frames.items() if v.is_placeholder)
        all_validation_frames = db_validation_layout.frames
        active_validation_frames = db_validation_layout.active_frames

        bulk_context = _TaskValidationLayoutBulkUpdateContext(
            all_db_frames=db_frames,
            honeypot_frames=honeypot_frames,
            all_validation_frames=all_validation_frames,
            active_validation_frames=active_validation_frames,
        )

        if frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
            requested_honeypot_real_frames = validated_data['honeypot_real_frames']
            task_honeypot_frames_count = len(honeypot_frames)
            if task_honeypot_frames_count != len(requested_honeypot_real_frames):
                raise serializers.ValidationError(
                    "Invalid size of 'honeypot_real_frames' array, "
                    f"expected {task_honeypot_frames_count}"
                )
        elif frame_selection_method == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            # Reset distribution for active validation frames
            active_validation_frame_counts = { f: 0 for f in active_validation_frames }
            frame_selector = HoneypotFrameSelector(active_validation_frame_counts)
            bulk_context.honeypot_frame_selector = frame_selector

        # Could be done using Django ORM, but using order_by() and filter()
        # would result in an extra DB request
        db_jobs = sorted(
            (
                db_job
                for db_segment in instance.segment_set.all()
                for db_job in db_segment.job_set.all()
                if db_job.type == models.JobType.ANNOTATION
            ),
            key=lambda j: j.segment.start_frame
        )
        for db_job in db_jobs:
            job_serializer_params = {
                'frame_selection_method': frame_selection_method
            }

            if frame_selection_method == models.JobFrameSelectionMethod.MANUAL:
                segment_frame_set = db_job.segment.frame_set
                job_serializer_params['honeypot_real_frames'] = [
                    requested_frame
                    for rel_frame, requested_frame in zip(
                        honeypot_frames, requested_honeypot_real_frames
                    )
                    if frame_provider.get_abs_frame_number(rel_frame) in segment_frame_set
                ]

            job_validation_layout_serializer = JobValidationLayoutWriteSerializer(
                db_job, job_serializer_params, bulk_context=bulk_context
            )
            job_validation_layout_serializer.is_valid(raise_exception=True)
            job_validation_layout_serializer.save()

        self._perform_bulk_updates(instance, bulk_context=bulk_context)

        return instance

    def _perform_bulk_updates(
        self,
        db_task: models.Task,
        *,
        bulk_context: _TaskValidationLayoutBulkUpdateContext,
    ):
        updated_segments = bulk_context.updated_segments
        if not updated_segments:
            return

        self._update_frames_in_bulk(db_task, bulk_context=bulk_context)

        # Import it here to avoid circular import
        from cvat.apps.engine.cache import MediaCache
        media_cache = MediaCache()
        media_cache.remove_segments_chunks(bulk_context.chunks_to_be_removed)
        media_cache.remove_context_images_chunks(bulk_context.context_image_chunks_to_be_removed)

        # Update segments
        updated_date = timezone.now()
        for updated_segments_batch in take_by(updated_segments, chunk_size=1000):
            models.Job.objects.filter(
                segment_id__in=updated_segments_batch
            ).update(updated_date=updated_date)

        for updated_segment_chunks_batch in take_by(
            bulk_context.segments_with_updated_chunks, chunk_size=1000
        ):
            models.Segment.objects.filter(
                id__in=updated_segment_chunks_batch
            ).update(chunks_updated_date=updated_date)

        # Update parent objects
        db_task.touch()
        if db_task.project:
            db_task.project.touch()

    def _update_frames_in_bulk(
        self,
        db_task: models.Task,
        *,
        bulk_context: _TaskValidationLayoutBulkUpdateContext,
    ):
        self._clear_annotations_on_frames(db_task, bulk_context.updated_honeypots)

        # The django generated bulk_update() query is too slow, so we use bulk_create() instead
        # NOTE: Silk doesn't show these queries in the list of queries
        # for some reason, but they can be seen in the profile
        bulk_create(
            models.Image,
            list(bulk_context.updated_honeypots.values()),
            update_conflicts=True,
            update_fields=['path', 'width', 'height', 'real_frame'],
            unique_fields=[
                # required for Postgres
                # https://docs.djangoproject.com/en/4.2/ref/models/querysets/#bulk-create
                'id'
            ],
        )

        # Update related images in 2 steps: remove all m2m for honeypots, then add (copy) new ones
        # 1. remove
        for updated_honeypots_batch in take_by(
            bulk_context.updated_honeypots.values(), chunk_size=1000
        ):
            models.RelatedFile.images.through.objects.filter(
                image_id__in=(db_honeypot.id for db_honeypot in updated_honeypots_batch)
            ).delete()

        # 2. batched add (copy): collect all the new records and insert
        frame_provider = TaskFrameProvider(db_task)
        honeypots_by_validation_frame = grouped(
            bulk_context.updated_honeypots,
            key=lambda honeypot_frame: frame_provider.get_rel_frame_number(
                bulk_context.updated_honeypots[honeypot_frame].real_frame
            )
        ) # validation frame -> [honeypot_frame, ...]

        new_m2m_objects = []
        m2m_objects_by_validation_image_id = grouped(
            models.RelatedFile.images.through.objects
            .filter(image_id__in=(
                bulk_context.all_db_frames[validation_frame].id
                for validation_frame in honeypots_by_validation_frame
            ))
            .all(),
            key=lambda m2m_obj: m2m_obj.image_id
        )
        for validation_frame, validation_frame_honeypots in honeypots_by_validation_frame.items():
            validation_frame_m2m_objects = m2m_objects_by_validation_image_id.get(
                bulk_context.all_db_frames[validation_frame].id
            )
            if not validation_frame_m2m_objects:
                continue

            # Copy validation frame m2m objects to corresponding honeypots
            for honeypot_frame in validation_frame_honeypots:
                new_m2m_objects.extend(
                    models.RelatedFile.images.through(
                        image_id=bulk_context.all_db_frames[honeypot_frame].id,
                        relatedfile_id=m2m_obj.relatedfile_id
                    )
                    for m2m_obj in validation_frame_m2m_objects
                )

        bulk_create(models.RelatedFile.images.through, new_m2m_objects)

        # Update manifest if present
        manifest_path = db_task.data.get_manifest_path()
        if os.path.isfile(manifest_path):
            manifest = ImageManifestManager(manifest_path)
            manifest.reorder([db_frame.path for db_frame in bulk_context.all_db_frames.values()])

    def _clear_annotations_on_frames(self, db_task: models.Task, frames: Sequence[int]):
        models.clear_annotations_on_frames_in_honeypot_task(db_task, frames=frames)

class TaskValidationLayoutReadSerializer(serializers.ModelSerializer):
    validation_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), source='frames', required=False,
        help_text=textwrap.dedent("""\
            The list of frame ids to be used for validation
        """)
    )
    disabled_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of frame ids excluded from validation
        """)
    )
    honeypot_count = serializers.IntegerField(min_value=0, required=False)
    honeypot_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of frame ids for all honeypots in the task
        """)
    )
    honeypot_real_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), required=False,
        help_text=textwrap.dedent("""\
            The list of real (validation) frame ids for all honeypots in the task
        """)
    )

    class Meta:
        model = models.ValidationLayout
        fields = (
            'mode',
            'frames_per_job_count',
            'validation_frames',
            'disabled_frames',
            'honeypot_count',
            'honeypot_frames',
            'honeypot_real_frames',
        )
        read_only_fields = fields
        extra_kwargs = {
            'mode': { 'allow_null': True },
        }

    def to_representation(self, instance: models.ValidationLayout):
        if instance.mode == models.ValidationMode.GT_POOL:
            db_data: models.Data = instance.task_data
            frame_step = db_data.get_frame_step()

            def _to_rel_frame(abs_frame: int) -> int:
                return (abs_frame - db_data.start_frame) // frame_step

            placeholder_queryset = models.Image.objects.filter(
                data_id=instance.task_data_id, is_placeholder=True
            )
            honeypot_count = placeholder_queryset.count()

            instance.honeypot_count = honeypot_count

            # TODO: make this information optional, if there are use cases with too big responses
            instance.honeypot_frames = []
            instance.honeypot_real_frames = []
            for frame, real_frame in (
                placeholder_queryset
                .order_by('frame')
                .values_list('frame', 'real_frame')
                .iterator(chunk_size=10000)
            ):
                instance.honeypot_frames.append(_to_rel_frame(frame))
                instance.honeypot_real_frames.append(_to_rel_frame(real_frame))

        return super().to_representation(instance)

class SegmentSerializer(serializers.ModelSerializer):
    jobs = SimpleJobSerializer(many=True, source='job_set')
    frames = serializers.ListSerializer(child=serializers.IntegerField(), allow_empty=True)

    class Meta:
        model = models.Segment
        fields = ('start_frame', 'stop_frame', 'jobs', 'type', 'frames')
        read_only_fields = fields

    def to_representation(self, instance: models.Segment):
        data = super().to_representation(instance)

        if instance.type == models.SegmentType.SPECIFIC_FRAMES:
            task_frame_provider = TaskFrameProvider(instance.task)
            data["frames"] = sorted(map(task_frame_provider.get_rel_frame_number, data["frames"]))
        else:
            data.pop("frames")

        return data

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

    def __init__(self, instance=None, data=..., **kwargs):
        warnings.warn("RqStatusSerializer is deprecated, "
                      "use cvat.apps.redis_handler.serializers.RequestSerializer instead", DeprecationWarning)
        super().__init__(instance, data, **kwargs)


class JobFiles(serializers.ListField):
    """
    Read JobFileMapping docs for more info.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('child', serializers.CharField(
            allow_blank=False, max_length=MAX_FILENAME_LENGTH
        ))
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

class ValidationParamsSerializer(serializers.ModelSerializer):
    mode = serializers.ChoiceField(choices=models.ValidationMode.choices(), required=True)
    frame_selection_method = serializers.ChoiceField(
        choices=models.JobFrameSelectionMethod.choices(), required=True
    )
    frames = serializers.ListField(
        write_only=True,
        child=serializers.CharField(max_length=MAX_FILENAME_LENGTH),
        required=False,
        help_text=textwrap.dedent("""\
            The list of file names to be included in the validation set.
            Applicable only to the "{}" frame selection method.
            Can only be used for images.
        """.format(models.JobFrameSelectionMethod.MANUAL))
    )
    frame_count = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text=textwrap.dedent("""\
            The number of frames to be included in the validation set.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_UNIFORM))
    )
    frame_share = serializers.FloatField(
        required=False,
        validators=[field_validation.validate_share],
        help_text=textwrap.dedent("""\
            The share of frames to be included in the validation set.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_UNIFORM))
    )
    frames_per_job_count = serializers.IntegerField(
        min_value=1,
        required=False,
        help_text=textwrap.dedent("""\
            The number of frames to be included in the validation set from each annotation job.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_PER_JOB))
    )
    frames_per_job_share = serializers.FloatField(
        required=False,
        validators=[field_validation.validate_share],
        help_text=textwrap.dedent("""\
            The share of frames to be included in the validation set from each annotation job.
            Applicable only to the "{}" frame selection method
        """.format(models.JobFrameSelectionMethod.RANDOM_PER_JOB))
    )
    random_seed = serializers.IntegerField(
        min_value=0,
        required=False,
        help_text=textwrap.dedent("""\
            The seed value for the random number generator.
            The same value will produce the same frame sets.
            Applicable only to random frame selection methods.
            By default, a random value is used.
        """)
    )

    class Meta:
        fields = (
            'mode', 'frame_selection_method', 'random_seed', 'frames',
            'frame_count', 'frame_share', 'frames_per_job_count', 'frames_per_job_share',
        )
        model = models.ValidationParams

    def validate(self, attrs):
        if attrs["mode"] == models.ValidationMode.GT:
            field_validation.require_one_of_values(
                attrs,
                "frame_selection_method",
                [
                    models.JobFrameSelectionMethod.MANUAL,
                    models.JobFrameSelectionMethod.RANDOM_UNIFORM,
                    models.JobFrameSelectionMethod.RANDOM_PER_JOB,
                ]
            )
        elif attrs["mode"] == models.ValidationMode.GT_POOL:
            field_validation.require_one_of_values(
                attrs,
                "frame_selection_method",
                [
                    models.JobFrameSelectionMethod.MANUAL,
                    models.JobFrameSelectionMethod.RANDOM_UNIFORM,
                ]
            )
            field_validation.require_one_of_fields(
                attrs, ['frames_per_job_count', 'frames_per_job_share']
            )
        else:
            assert False, f"Unknown validation mode {attrs['mode']}"

        if attrs['frame_selection_method'] == models.JobFrameSelectionMethod.RANDOM_UNIFORM:
            field_validation.require_one_of_fields(attrs, ['frame_count', 'frame_share'])
        elif attrs['frame_selection_method'] == models.JobFrameSelectionMethod.RANDOM_PER_JOB:
            field_validation.require_one_of_fields(
                attrs, ['frames_per_job_count', 'frames_per_job_share']
            )
        elif attrs['frame_selection_method'] == models.JobFrameSelectionMethod.MANUAL:
            field_validation.require_field(attrs, "frames")

        if (
            'frames' in attrs and
            attrs['frame_selection_method'] != models.JobFrameSelectionMethod.MANUAL
        ):
            raise serializers.ValidationError(
                '"frames" can only be used when "frame_selection_method" is "{}"'.format(
                    models.JobFrameSelectionMethod.MANUAL
                )
            )

        if frames := attrs.get('frames'):
            unique_frames = set(frames)
            if len(unique_frames) != len(frames):
                raise serializers.ValidationError("Frames must not repeat")

        return super().validate(attrs)

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> models.ValidationParams:
        frames = validated_data.pop('frames', None)

        instance = super().create(validated_data)

        if frames:
            bulk_create(
                models.ValidationFrame,
                [models.ValidationFrame(validation_params=instance, path=frame) for frame in frames]
            )

        return instance

    @transaction.atomic
    def update(
        self, instance: models.ValidationParams, validated_data: dict[str, Any]
    ) -> models.ValidationParams:
        frames = validated_data.pop('frames', None)

        instance = super().update(instance, validated_data)

        if frames:
            models.ValidationFrame.objects.filter(validation_params=instance).delete()

            bulk_create(
                models.ValidationFrame,
                [models.ValidationFrame(validation_params=instance, path=frame) for frame in frames]
            )

        return instance

class DataSerializer(serializers.ModelSerializer):
    """
    Read more about parameters here:
    https://docs.cvat.ai/docs/manual/basics/create-annotation-task/#advanced-configuration
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
        child=serializers.CharField(max_length=MAX_FILENAME_LENGTH),
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
        child=serializers.CharField(max_length=MAX_FILENAME_LENGTH),
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
    validation_params = ValidationParamsSerializer(allow_null=True, required=False)

    class Meta:
        model = models.Data
        fields = (
            'chunk_size', 'image_quality', 'start_frame', 'stop_frame', 'frame_filter',
            'client_files', 'server_files', 'remote_files',
            'use_zip_chunks', 'server_files_exclude',
            'cloud_storage_id', 'use_cache', 'copy_data', 'storage_method',
            'sorting_method', 'filename_pattern',
            'job_file_mapping', 'upload_file_order', 'validation_params'
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

        validation_params = attrs.pop('validation_params', None)
        if validation_params:
            validation_params_serializer = ValidationParamsSerializer(data=validation_params)
            validation_params_serializer.is_valid(raise_exception=True)
            attrs['validation_params'] = validation_params_serializer.validated_data

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        files = self._pop_data(validated_data)
        validation_params = validated_data.pop('validation_params', None)

        db_data = models.Data.objects.create(**validated_data)
        db_data.make_dirs()

        self._create_files(db_data, files)

        db_data.save()

        if validation_params:
            validation_params_serializer = ValidationParamsSerializer(data=validation_params)
            validation_params_serializer.is_valid(raise_exception=True)
            db_data.validation_params = validation_params_serializer.save(task_data=db_data)

        return db_data

    @transaction.atomic
    def update(self, instance, validated_data):
        validation_params = validated_data.pop('validation_params', None)

        files = self._pop_data(validated_data)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        self._create_files(instance, files)

        instance.save()

        if validation_params:
            validation_params_serializer = ValidationParamsSerializer(
                instance=getattr(instance, "validation_params", None), data=validation_params
            )
            validation_params_serializer.is_valid(raise_exception=True)
            instance.validation_params = validation_params_serializer.save(task_data=instance)

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
                bulk_create(
                    files_model,
                    [files_model(data=instance, **f) for f in files[files_type]]
                )

class TaskReadListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        if isinstance(data, list) and data:
            # Optimized prefetch only for the current page
            page: list[models.Task] = data

            # Annotate page objects
            # We do it explicitly here and not in the LIST queryset to avoid
            # doing the same DB computations twice - one time for the page retrieval
            # and another one for the COUNT(*) request to get the total count
            page_task_ids = set(t.id for t in page)
            job_summary_fields = [m.value for m in models.TaskQuerySet.JobSummaryFields]
            job_counts = {
                task["id"]: task
                for task in models.Task.objects
                .filter(id__in=page_task_ids)
                .with_job_summary()
                .values("id", *job_summary_fields)
            }

            for task in page:
                task_job_summary = job_counts.get(task.id)
                for k in job_summary_fields:
                    setattr(task, k, task_job_summary[k])

        return super().to_representation(data)

@extend_schema_serializer(deprecate_fields=["organization"])
class TaskReadSerializer(serializers.ModelSerializer):
    data_chunk_size = serializers.ReadOnlyField(source='data.chunk_size', required=False)
    data_compressed_chunk_type = serializers.ReadOnlyField(source='data.compressed_chunk_type', required=False)
    data_original_chunk_type = serializers.ReadOnlyField(source='data.original_chunk_type', required=False)
    data_cloud_storage_id = serializers.ReadOnlyField(source='data.cloud_storage_id', required=False)
    size = serializers.ReadOnlyField(source='data.size', required=False)
    image_quality = serializers.ReadOnlyField(source='data.image_quality', required=False)
    data = serializers.ReadOnlyField(source='data.id', required=False)
    owner = BasicUserSerializer(required=False, allow_null=True)
    assignee = BasicUserSerializer(allow_null=True, required=False)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    guide_id = serializers.IntegerField(source='annotation_guide.id', required=False, allow_null=True)
    organization_id = serializers.IntegerField(source='organization.id', required=False, read_only=True, allow_null=True)
    dimension = serializers.CharField(allow_blank=True, required=False)
    target_storage = StorageSerializer(required=False, allow_null=True)
    source_storage = StorageSerializer(required=False, allow_null=True)
    jobs = JobsSummarySerializer(url_filter_key='task_id', source='segment_set')
    labels = LabelsSummarySerializer(source='*')
    validation_mode = serializers.CharField(
        source='data.validation_mode', required=False, allow_null=True,
        help_text="Describes how the task validation is performed. Configured at task creation"
    )
    consensus_enabled = serializers.BooleanField(
        source='get_consensus_enabled', required=False, read_only=True
    )

    class Meta:
        model = models.Task
        fields = ('url', 'id', 'name', 'project_id', 'mode', 'owner', 'assignee',
            'bug_tracker', 'created_date', 'updated_date', 'overlap', 'segment_size',
            'status', 'data_chunk_size', 'data_original_chunk_type', 'data_compressed_chunk_type',
            'data_cloud_storage_id', 'guide_id', 'size', 'image_quality', 'data', 'dimension',
            'subset', 'organization_id',
            'organization', # deprecated field
            'target_storage', 'source_storage', 'jobs', 'labels',
            'assignee_updated_date', 'validation_mode', 'consensus_enabled',
        )
        read_only_fields = fields
        extra_kwargs = {
            'organization': { 'allow_null': True },
            'overlap': { 'allow_null': True },
        }
        list_serializer_class = TaskReadListSerializer

    def get_consensus_enabled(self, instance: models.Task) -> bool:
        return instance.consensus_replicas > 0

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['consensus_enabled'] = self.get_consensus_enabled(instance)
        return representation

class TaskWriteSerializer(WriteOnceMixin, serializers.ModelSerializer, OrgTransferableMixin):
    labels = LabelSerializer(many=True, source='label_set', partial=True, required=False)
    owner_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    organization_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    target_storage = StorageSerializer(required=False, allow_null=False)
    source_storage = StorageSerializer(required=False, allow_null=False)
    consensus_replicas = serializers.IntegerField(
        required=False, default=0, min_value=0,
        help_text=textwrap.dedent("""\
            The number of consensus replica jobs for each annotation job.
            Configured at task creation
        """)
    )

    class Meta:
        model = models.Task
        fields = (
            'url', 'id', 'name', 'project_id', 'owner_id', 'assignee_id',
            'bug_tracker', 'overlap', 'segment_size', 'labels', 'subset',
            'target_storage', 'source_storage', 'consensus_replicas',
            'organization_id',
        )
        write_once_fields = ('overlap', 'segment_size', 'consensus_replicas')
        update_only_fields = ('organization_id',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if getattr(self.context.get('view'), 'action', '') == 'create':
            for field in self.Meta.update_only_fields:
                self.fields.pop(field)

    def to_representation(self, instance):
        serializer = TaskReadSerializer(instance, context=self.context)
        return serializer.data

    def validate_consensus_replicas(self, value):
        max_replicas = settings.MAX_CONSENSUS_REPLICAS
        if value and (value == 1 or value < 0 or value > max_replicas):
            raise serializers.ValidationError(
                f"Consensus replicas must be 0 "
                f"or a positive number more than 1 and less than {max_replicas + 1}, "
                f"got {value}"
            )

        return value or 0

    # pylint: disable=no-self-use
    @transaction.atomic
    def create(self, validated_data):
        project_id = validated_data.get("project_id")
        if validated_data.get("label_set") and project_id:
            raise serializers.ValidationError('Task must have only one of Label set or project_id')

        project = None
        if project_id:
            try:
                project = models.Project.objects.get(id=project_id)
            except models.Project.DoesNotExist:
                raise serializers.ValidationError(f'The specified project #{project_id} does not exist.')

            if project.organization != validated_data.get('organization'):
                raise serializers.ValidationError('The task and its project should be in the same organization.')

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

        if validated_data.get('assignee_id'):
            db_task.assignee_updated_date = db_task.updated_date
            db_task.save(update_fields=["assignee_updated_date"])

        return db_task

    @transaction.atomic
    def update_base_properties(
        self,
        instance: models.Task,
        *,
        validated_data: dict[str, Any],
        update_fields: list[str],
    ):
        for field_name in (
            "name", "bug_tracker", "subset", "owner_id", "assignee_id"
        ):
            if field_name in validated_data and (field_value := validated_data[field_name]) != getattr(instance, field_name):
                if field_name != "assignee_id":
                    setattr(instance, field_name, field_value)
                else:
                    instance.update_assignee(field_value)
                update_fields.append(field_name)

    def update_labels(
        self,
        instance: models.Task,
        *,
        validated_data: dict[str, Any],
        update_fields: list[str],
    ):
        if (labels := validated_data.get('label_set')) and instance.project_id is None:
            LabelSerializer.update_labels(labels, parent_instance=instance)
            update_fields.append("updated_date")

    def update_project(
        self,
        instance: models.Task,
        *,
        validated_data: dict[str, Any],
        update_fields: list[str],
    ):
        labels = validated_data.get('label_set', [])
        validated_project_id = validated_data['project_id']

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
        update_fields.append("project")

    # pylint: disable=no-self-use
    @transaction.atomic
    def update(self, instance: models.Task, validated_data: dict):
        update_fields: list[str] = []

        if (
            "organization_id" in validated_data
            and validated_data.get("organization_id") != instance.organization_id
        ):
            self.update_organization(instance, validated_data=validated_data, update_fields=update_fields)
        elif (
            (validated_project_id := validated_data.get("project_id")) is not None and validated_project_id != instance.project_id
        ):
            self.update_project(instance, validated_data=validated_data, update_fields=update_fields)
        else:
            self.update_base_properties(instance, validated_data=validated_data, update_fields=update_fields)
            self.update_labels(instance, validated_data=validated_data, update_fields=update_fields)
            # update source and target storages
            _update_related_storages(instance, validated_data=validated_data)

        if update_fields:
            instance.save(update_fields=list(set(update_fields) | {"updated_date"}))

        if 'label_set' in validated_data and not instance.project_id:
            self.update_child_objects_on_labels_update(instance)

        return instance

    def update_child_objects_on_labels_update(self, instance: models.Task):
        models.Job.objects.filter(
            updated_date__lt=instance.updated_date, segment__task=instance
        ).update(updated_date=instance.updated_date)

    def update_child_objects_on_organization_update(
        self,
        instance: models.Task,
        *,
        organization_id: int | None,
        owner_id: int,
        updated_date: datetime,
    ):
        if instance.data.cloud_storage_id:
            instance.data.cloud_storage = None
            instance.data.save(update_fields=["cloud_storage"])

        models.Job.objects.filter(
            segment__task__id=instance.pk,
            assignee__isnull=False
        ).update(assignee=None, assignee_updated_date=updated_date)

    def _validate_org_transferring(self, attrs: dict[str, Any]):
        if "project_id" in attrs.keys():
            raise serializers.ValidationError("A task cannot be moved into a project and into an organization at the same time")
        elif self.instance.project_id:
            raise serializers.ValidationError("Only top-level resources can be moved between workspaces")
        super()._validate_org_transferring(attrs)

    def validate(self, attrs):
        if self.instance and "organization_id" in attrs.keys():
            self._validate_org_transferring(attrs)

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

@extend_schema_serializer(deprecate_fields=["organization"])
class ProjectReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True, required=False, read_only=True)
    assignee = BasicUserSerializer(allow_null=True, required=False, read_only=True)
    guide_id = serializers.IntegerField(source='annotation_guide.id', required=False, allow_null=True)
    organization_id = serializers.IntegerField(source='organization.id', required=False, read_only=True, allow_null=True)
    task_subsets = serializers.ListField(child=serializers.CharField(), required=False, read_only=True)
    dimension = serializers.CharField(max_length=16, required=False, read_only=True, allow_null=True)
    target_storage = StorageSerializer(required=False, allow_null=True, read_only=True)
    source_storage = StorageSerializer(required=False, allow_null=True, read_only=True)
    tasks = TasksSummarySerializer(models.Task, url_filter_key='project_id')
    labels = LabelsSummarySerializer(source='*')

    class Meta:
        model = models.Project
        fields = ('url', 'id', 'name', 'owner', 'assignee', 'guide_id',
            'bug_tracker', 'task_subsets', 'created_date', 'updated_date', 'status', 'dimension',
            'organization', # deprecated field
            'organization_id', 'target_storage', 'source_storage',
            'tasks', 'labels', 'assignee_updated_date'
        )
        read_only_fields = fields
        extra_kwargs = { 'organization': { 'allow_null': True } }

    def to_representation(self, instance):
        response = super().to_representation(instance)

        task_subsets = {task.subset for task in instance.tasks.all() if task.subset}
        task_dimension = next(
            (task.dimension for task in instance.tasks.all() if task.dimension),
            None
        )
        response['task_subsets'] = list(task_subsets)
        response['dimension'] = task_dimension
        return response

class ProjectWriteSerializer(serializers.ModelSerializer, OrgTransferableMixin):
    labels = LabelSerializer(write_only=True, many=True, source='label_set', partial=True, default=[])
    owner_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    organization_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)

    target_storage = StorageSerializer(write_only=True, required=False)
    source_storage = StorageSerializer(write_only=True, required=False)

    class Meta:
        model = models.Project
        fields = ('name', 'labels', 'owner_id', 'assignee_id', 'bug_tracker',
            'target_storage', 'source_storage', 'organization_id'
        )
        update_only_fields = ('organization_id',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if not self.partial:
            for field in self.Meta.update_only_fields:
                self.fields.pop(field)

    def to_representation(self, instance):
        serializer = ProjectReadSerializer(instance, context=self.context)
        return serializer.data

    def validate(self, attrs):
        if self.instance and "organization_id" in attrs.keys():
            self._validate_org_transferring(attrs)

        return attrs

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

        if validated_data.get("assignee_id"):
            db_project.assignee_updated_date = db_project.updated_date
            db_project.save(update_fields=["assignee_updated_date"])

        return db_project

    # FUTURE-TODO: move into a common interface
    def update_base_properties(
        self,
        instance: models.Project,
        *,
        validated_data: dict[str, Any],
        update_fields: list[str],
    ):
        for field_name in (
            "name", "bug_tracker", "owner_id", "assignee_id"
        ):
            if field_name in validated_data and (field_value := validated_data[field_name]) != getattr(instance, field_name):
                if field_name != "assignee_id":
                    setattr(instance, field_name, field_value)
                else:
                    instance.update_assignee(field_value)
                update_fields.append(field_name)

    # pylint: disable=no-self-use
    @transaction.atomic
    def update(self, instance: models.Project, validated_data: dict):
        update_fields: list[str] = []

        if (
            "organization_id" in validated_data
            and validated_data.get("organization_id") != instance.organization_id
        ):
            self.update_organization(instance, validated_data=validated_data, update_fields=update_fields)
        else:
            self.update_base_properties(instance, validated_data=validated_data, update_fields=update_fields)

            if labels := validated_data.get('label_set'):
                LabelSerializer.update_labels(labels, parent_instance=instance)
                update_fields.append("updated_date")

            # update source and target storages
            _update_related_storages(instance, validated_data=validated_data)

        if update_fields:
            instance.save(update_fields=list(set(update_fields) | {"updated_date"}))

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

    def update_child_objects_on_organization_update(
        self,
        instance: models.Project,
        *,
        organization_id: int | None,
        owner_id: int,
        updated_date: datetime,
    ):
        models.Data.objects.filter(
            id__in=models.Task.objects.filter(project=instance).values('data_id'),
        ).update(cloud_storage_id=None)

        instance.tasks.update(
            organization_id=organization_id,
            owner_id=owner_id,
            assignee_id=None,
            assignee_updated_date=updated_date
        )

        models.Job.objects.filter(
            segment__task__project_id=instance.pk,
            assignee__isnull=False
        ).update(assignee=None, assignee_updated_date=updated_date)

        Webhook.objects.filter(project_id=instance.pk).update(organization_id=organization_id)


class AboutSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    description = serializers.CharField(max_length=2048)
    version = serializers.CharField(max_length=64)
    logo_url = serializers.CharField()
    subtitle = serializers.CharField(max_length=1024)

class FrameMetaSerializer(serializers.Serializer):
    width = serializers.IntegerField()
    height = serializers.IntegerField()
    name = serializers.CharField(max_length=MAX_FILENAME_LENGTH)
    related_files = serializers.IntegerField()

    # for compatibility with version 2.3.0
    has_related_context = serializers.SerializerMethodField()

    @extend_schema_field(serializers.BooleanField)
    def get_has_related_context(self, obj: dict) -> bool:
        return obj['related_files'] != 0

class ChapterMetadataSerializer(serializers.Serializer):
    title = serializers.CharField(required=False)

class ChapterSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    start = serializers.IntegerField()
    stop = serializers.IntegerField()
    metadata = ChapterMetadataSerializer(many=False)

class PluginsSerializer(serializers.Serializer):
    GIT_INTEGRATION = serializers.BooleanField()
    ANALYTICS = serializers.BooleanField()
    MODELS = serializers.BooleanField()
    PREDICT = serializers.BooleanField()

class DataMetaReadSerializer(serializers.ModelSerializer):
    frames = FrameMetaSerializer(many=True, allow_null=True)
    chapters = ChapterSerializer(many=True, allow_null=True, required=False)
    image_quality = serializers.IntegerField(min_value=0, max_value=100)
    deleted_frames = serializers.ListField(child=serializers.IntegerField(min_value=0))
    included_frames = serializers.ListField(
        child=serializers.IntegerField(min_value=0), allow_null=True, required=False,
        help_text=textwrap.dedent("""\
        A list of valid frame ids. The None value means all frames are included.
        """))
    chunks_updated_date = serializers.DateTimeField()

    class Meta:
        model = models.Data
        fields = (
            'chapters',
            'chunks_updated_date',
            'chunk_size',
            'size',
            'image_quality',
            'start_frame',
            'stop_frame',
            'frame_filter',
            'frames',
            'deleted_frames',
            'included_frames',
            'storage',
            'cloud_storage_id',
        )
        read_only_fields = fields
        extra_kwargs = {
            'chunks_updated_date': {
                'help_text': textwrap.dedent("""\
                    The date of the last chunk data update.
                    Chunks downloaded before this date are outdated and should be redownloaded.
                """)
            },
            'size': {
                'help_text': textwrap.dedent("""\
                    The number of frames included. Deleted frames do not affect this value.
                """)
            },
        }

class DataMetaWriteSerializer(serializers.ModelSerializer):
    deleted_frames = serializers.ListField(child=serializers.IntegerField(min_value=0), required=False)
    cloud_storage_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = models.Data
        fields = ('deleted_frames', 'cloud_storage_id')

    def validate_cloud_storage_id(self, cloud_storage_id: int):
        try:
            db_storage: models.CloudStorage = models.CloudStorage.objects.get(id=cloud_storage_id)
            storage = db_storage_to_storage_instance(db_storage)
            storage_status = storage.get_status()
            if storage_status != Status.AVAILABLE:
                raise serializers.ValidationError(
                    f"The specified cloud storage '{db_storage.display_name}' is not available."
                )
        except models.CloudStorage.DoesNotExist:
            raise serializers.ValidationError(
                f"The specified cloud storage {cloud_storage_id} does not exist."
            )

        return cloud_storage_id

    def validate_deleted_frames(self, requested_deleted_frames: list[int]):
        requested_deleted_frames_set = set(requested_deleted_frames)
        if len(requested_deleted_frames_set) != len(requested_deleted_frames):
            raise serializers.ValidationError("Deleted frames cannot repeat")

        unknown_requested_deleted_frames = (
            requested_deleted_frames_set.difference(range(self.instance.size))
        )
        if unknown_requested_deleted_frames:
            raise serializers.ValidationError(
                "Unknown frames {} requested for removal".format(
                    format_list(tuple(map(str, sorted(unknown_requested_deleted_frames))))
                )
            )

        validation_layout = getattr(self.instance, 'validation_layout', None)
        if validation_layout and validation_layout.mode == models.ValidationMode.GT_POOL:
            gt_frame_set = set(validation_layout.frames)
            changed_deleted_frames = requested_deleted_frames_set.difference(self.instance.deleted_frames)
            if not gt_frame_set.isdisjoint(changed_deleted_frames):
                raise serializers.ValidationError(
                    f"When task validation mode is {models.ValidationMode.GT_POOL}, "
                    "GT frames can only be deleted and restored via the "
                    "GT job's api/jobs/{id}/data/meta endpoint"
                )

        return requested_deleted_frames

    def update(self, instance: models.Data, validated_data):
        instance = super().update(instance, validated_data)
        db_task = models.Task.objects.filter(data=instance).first()
        if validated_data.get("cloud_storage_id"):
            task_frame_provider = TaskFrameProvider(db_task)
            for quality in models.FrameQuality:
                task_frame_provider.invalidate_chunks(quality=quality)
        if db_task:
            db_task.touch()
        return instance


class JobDataMetaWriteSerializer(serializers.ModelSerializer):
    deleted_frames = serializers.ListField(child=serializers.IntegerField(min_value=0))

    class Meta:
        model = models.Job
        fields = ('deleted_frames',)

    @transaction.atomic
    def update(self, instance: models.Job, validated_data: dict[str, Any]) -> models.Job:
        db_segment = instance.segment
        db_task = db_segment.task
        db_data = db_task.data

        deleted_frames = validated_data['deleted_frames']

        task_frame_provider = TaskFrameProvider(db_task)
        segment_rel_frame_set = set(
            map(task_frame_provider.get_rel_frame_number, db_segment.frame_set)
        )

        unknown_deleted_frames = set(deleted_frames) - segment_rel_frame_set
        if unknown_deleted_frames:
            raise serializers.ValidationError("Frames {} do not belong to the job".format(
                format_list(list(map(str, unknown_deleted_frames)))
            ))

        updated_deleted_validation_frames = None
        updated_deleted_task_frames = None

        if instance.type == models.JobType.GROUND_TRUTH:
            updated_deleted_validation_frames = deleted_frames + [
                f
                for f in db_data.validation_layout.disabled_frames
                if f not in segment_rel_frame_set
            ]

            if db_data.validation_layout.mode == models.ValidationMode.GT_POOL:
                # GT pool owns its frames, so we exclude them from the task
                # Them and the related honeypots in jobs
                updated_validation_abs_frame_set = set(
                    map(task_frame_provider.get_abs_frame_number, updated_deleted_validation_frames)
                )

                excluded_placeholder_frames = [
                    task_frame_provider.get_rel_frame_number(frame)
                    for frame, real_frame in (
                        models.Image.objects
                        .filter(data=db_data, is_placeholder=True)
                        .values_list('frame', 'real_frame')
                        .iterator(chunk_size=10000)
                    )
                    if real_frame in updated_validation_abs_frame_set
                ]
                updated_deleted_task_frames = deleted_frames + excluded_placeholder_frames
            elif db_data.validation_layout.mode == models.ValidationMode.GT:
                # Regular GT jobs only refer to the task frames, without data ownership
                pass
            else:
                assert False
        else:
            updated_deleted_task_frames = deleted_frames + [
                f
                for f in db_data.deleted_frames
                if f not in segment_rel_frame_set
            ]

        if updated_deleted_validation_frames is not None:
            db_data.validation_layout.disabled_frames = updated_deleted_validation_frames
            db_data.validation_layout.save(update_fields=['disabled_frames'])

        if updated_deleted_task_frames is not None:
            db_data.deleted_frames = updated_deleted_task_frames
            db_data.save(update_fields=['deleted_frames'])

        db_task.touch()
        if db_task.project:
            db_task.project.touch()

        return instance

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

    def _validate_id_absent(self, value):
        if value is not None:
            raise serializers.ValidationError("must be absent")
        return value

    def _validate_id_present(self, value):
        if value is None:
            raise serializers.ValidationError("must be present and not null")
        return value

    @cached_property
    def validate_id(self):
        # avoid circular import
        from cvat.apps.dataset_manager.task import PatchAction

        # It would've been better to determine the validator in `__init__`,
        # but in a nested serializer the top-level context doesn't actually become
        # accessible until after initialization.
        if action := self.context.get("annotation_action"):
            if action == PatchAction.CREATE:
                return self._validate_id_absent
            elif action == PatchAction.UPDATE:
                # Logically, we should return _validate_id_present here.
                # However, due to the way the implementation historically worked,
                # passing annotations without IDs would work as a "create" operation.
                # There are almost certainly clients relying on this, so keep allowing it.
                return None
            elif action == PatchAction.DELETE:
                return self._validate_id_present
            else:
                assert False, f"Unknown action {action!r}"

        return None

class LabeledImageSerializer(AnnotationSerializer):
    attributes = AttributeValSerializer(many=True, default=[])

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

    def validate(self, attrs):
        shape_type = attrs["type"]

        num_points = len(attrs.get("points", ()))

        def bad_num_points_unless(condition: bool) -> None:
            if not condition:
                raise serializers.ValidationError(
                    {"points": f"invalid length for shape type '{shape_type}'"}
                )

        if shape_type in {models.ShapeType.RECTANGLE, models.ShapeType.ELLIPSE}:
            bad_num_points_unless(num_points == 4)
        elif shape_type == models.ShapeType.POLYGON:
            bad_num_points_unless(num_points >= 6 and num_points % 2 == 0)
        elif shape_type == models.ShapeType.POLYLINE:
            bad_num_points_unless(num_points >= 4 and num_points % 2 == 0)
        elif shape_type == models.ShapeType.POINTS:
            bad_num_points_unless(num_points >= 2 and num_points % 2 == 0)
        elif shape_type == models.ShapeType.CUBOID:
            bad_num_points_unless(num_points == 16)
        elif shape_type == models.ShapeType.MASK:
            bad_num_points_unless(num_points >= 5)
        elif shape_type == models.ShapeType.SKELETON:
            bad_num_points_unless(num_points == 0)
        else:
            assert False, f"Unknown shape type '{shape_type}'"

        return attrs

class SubLabeledShapeSerializer(ShapeSerializer, AnnotationSerializer):
    attributes = AttributeValSerializer(many=True, default=[])

class LabeledShapeSerializer(SubLabeledShapeSerializer):
    elements = SubLabeledShapeSerializer(many=True, required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)

        num_elements = len(attrs.get("elements", ()))

        if attrs["type"] == models.ShapeType.SKELETON:
            if num_elements == 0:
                raise serializers.ValidationError(
                    {"elements": "at least one required for skeleton shape"}
                )
        else:
            if num_elements != 0:
                raise serializers.ValidationError(
                    {"elements": "not allowed for non-skeleton shape"}
                )

        return attrs

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
            result['attributes'] = _convert_attributes(tag['attributes'])
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
            result['attributes'] = _convert_attributes(shape['attributes'])
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
                'rotation', 'points', 'attributes',
            ]
            result = _convert_annotation(track, ['id', 'label_id', 'frame', 'group', 'source'])
            result['shapes'] = [_convert_annotation(shape, shape_keys) for shape in track['shapes']]
            result['attributes'] = _convert_attributes(track['attributes'])
            for shape in result['shapes']:
                shape['attributes'] = _convert_attributes(shape['attributes'])
            if track.get('elements', None) is not None and track['parent'] is None:
                result['elements'] = [convert_track(element) for element in track['elements']]
            return result

        return convert_track(instance)

class TrackedShapeSerializer(ShapeSerializer):
    id = serializers.IntegerField(default=None, allow_null=True)
    frame = serializers.IntegerField(min_value=0)
    attributes = AttributeValSerializer(many=True, default=[])

class SubLabeledTrackSerializer(AnnotationSerializer):
    shapes = TrackedShapeSerializer(many=True, allow_empty=True)
    attributes = AttributeValSerializer(many=True, default=[])

class LabeledTrackSerializer(SubLabeledTrackSerializer):
    elements = SubLabeledTrackSerializer(many=True, required=False)

class LabeledDataSerializer(serializers.Serializer):
    version = serializers.IntegerField(default=0) # TODO: remove
    tags   = LabeledImageSerializer(many=True, default=[])
    shapes = LabeledShapeSerializer(many=True, default=[])
    tracks = LabeledTrackSerializer(many=True, default=[])

class FileInfoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=MAX_FILENAME_LENGTH)
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
            'Create Amazon S3 cloud storage with credentials',
            description='',
            value={
                'provider_type': models.CloudProviderChoice.AMAZON_S3,
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
            'Create Amazon S3 cloud storage without credentials',
            value={
                'provider_type': models.CloudProviderChoice.AMAZON_S3,
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
                'provider_type': models.CloudProviderChoice.AZURE_BLOB_STORAGE,
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
        if provider_type == models.CloudProviderChoice.AZURE_BLOB_STORAGE:
            if not attrs.get('account_name', '') and not attrs.get('connection_string', ''):
                raise serializers.ValidationError('Account name or connection string for Azure container was not specified')

        # Amazon S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html?icmpid=docs_amazons3_console
        # ABS: https://learn.microsoft.com/en-us/rest/api/storageservices/naming-and-referencing-containers--blobs--and-metadata#container-names
        # GCS: https://cloud.google.com/storage/docs/buckets#naming
        ALLOWED_RESOURCE_NAME_SYMBOLS = (
            string.ascii_lowercase + string.digits + "-"
        )

        if provider_type == models.CloudProviderChoice.GOOGLE_CLOUD_STORAGE:
            ALLOWED_RESOURCE_NAME_SYMBOLS += "_."
        elif provider_type == models.CloudProviderChoice.AMAZON_S3:
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
            bulk_create(models.Manifest, manifest_file_instances)

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
                bulk_create(models.Manifest, manifest_instances)
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
    instance: models.Project | models.Task,
    *,
    validated_data: dict[str, Any],
    workspace_transferring: bool = False,
    dst_organization_id: int | None = None
) -> None:
    for storage_type in ('source_storage', 'target_storage'):
        # storage_instance maybe None
        storage_instance: models.Storage | None = getattr(instance, storage_type, None)

        new_conf = validated_data.pop(storage_type, {})

        if not new_conf:
            if (
                not workspace_transferring
                or workspace_transferring and (
                    not storage_instance or storage_instance and not storage_instance.cloud_storage_id
                )
            ):
                continue

            try:
                original_cs = models.CloudStorage.objects.annotate(Count("manifests")).get(pk=storage_instance.cloud_storage_id)
            except models.CloudStorage.DoesNotExist:
                # generally should not occur
                new_conf = {
                    "location": models.Location.LOCAL,
                    "cloud_storage_id": None,
                }
            else:
                similar_ones: list[models.CloudStorage] = []
                msg_no_similar_cs = "Could not find a similar cloud storage in the new workspace"

                qs_with_similar_ones = models.CloudStorage.objects.filter(
                    provider_type=original_cs.provider_type,
                    resource=original_cs.resource,
                    organization_id=dst_organization_id,
                ).annotate(Count("manifests")).filter(manifests__count=original_cs.manifests__count)

                for cs in qs_with_similar_ones:
                    if (
                        cs.get_specific_attributes() != original_cs.get_specific_attributes()
                        # we do not need to compare manifest contents since the content
                        # will be synchronized with the original CS file on the next content request
                        or list(cs.manifests.values_list("filename", flat=True).order_by("filename"))
                        != list(original_cs.manifests.values_list("filename", flat=True).order_by("filename"))
                    ):
                        continue

                    similar_ones.append(cs)

                if len(similar_ones) != 1:
                    raise serializers.ValidationError(msg_no_similar_cs)

                new_conf = {
                    "location": models.Location.CLOUD_STORAGE,
                    "cloud_storage_id": similar_ones[0].pk
                }

        storage_serializer = StorageSerializer(storage_instance, data=new_conf)
        storage_serializer.is_valid(raise_exception=True)

        storage_instance = storage_serializer.save()
        setattr(instance, storage_type, storage_instance)


def _configure_related_storages(validated_data: dict[str, Any]) -> dict[str, models.Storage | None]:
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
    filename = serializers.CharField(required=True, max_length=MAX_FILENAME_LENGTH)
    owner = BasicUserSerializer(required=False)

    class Meta:
        model = models.Asset
        fields = ('uuid', 'filename', 'created_date', 'owner', 'guide_id', )
        read_only_fields = fields

class AssetWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    file = serializers.FileField(required=True, write_only=True, allow_empty_file=False, max_length=MAX_FILENAME_LENGTH)
    guide_id = serializers.IntegerField(required=True)

    def validate_file(self, value):
        if not isinstance(value, UploadedFile):
            raise serializers.ValidationError("Invalid asset_file type. Expected an UploadedFile instance.")

        if value.size / (1024 * 1024) > settings.ASSET_MAX_SIZE_MB:
            raise serializers.ValidationError(f"Maximum size of asset is {settings.ASSET_MAX_SIZE_MB} MB")

        if value.content_type not in settings.ASSET_SUPPORTED_TYPES:
            raise serializers.ValidationError(f"File is not supported as an asset. Supported are {settings.ASSET_SUPPORTED_TYPES}")

        return value

    def create(self, validated_data):
        asset_file = validated_data.pop("file")
        asset_uuid = str(uuid.uuid4())
        dirname = os.path.join(settings.ASSETS_ROOT, asset_uuid)
        basename = asset_file.name
        filename = os.path.join(dirname, basename)
        os.makedirs(dirname)

        try:
            if asset_file.content_type in ("image/jpeg", "image/png"):
                image = Image.open(asset_file)
                if any(x > settings.ASSET_MAX_IMAGE_SIZE for x in image.size):
                    scale_factor = settings.ASSET_MAX_IMAGE_SIZE / max(image.size)
                    image = image.resize(int(x * scale_factor) for x in image.size)
                image.save(filename)
            else:
                with open(filename, "wb") as destination:
                    for chunk in asset_file.chunks():
                        destination.write(chunk)

            av_scan_paths(dirname)
            return models.Asset.objects.create(
                **validated_data,
                uuid=asset_uuid,
                filename=basename,
                content_size=get_path_size(dirname),
            )
        except Exception:
            if os.path.exists(filename):
                os.remove(filename)

            os.rmdir(dirname)
            raise

    class Meta:
        model = models.Asset
        fields = ("guide_id", "file", )
        write_once_fields = ("guide_id", )


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

    class Meta:
        model = models.AnnotationGuide
        fields = ('id', 'task_id', 'project_id', 'markdown', )
