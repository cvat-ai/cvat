# Copyright (C) 2019-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import re
import shutil

from tempfile import NamedTemporaryFile

from rest_framework import serializers, exceptions
from django.contrib.auth.models import User, Group

from cvat.apps.dataset_manager.formats.utils import get_label_color
from cvat.apps.engine import models
from cvat.apps.engine.cloud_provider import get_cloud_storage_instance, Credentials, Status
from cvat.apps.engine.log import slogger
from cvat.apps.engine.utils import parse_specific_attributes

from drf_spectacular.utils import OpenApiExample, extend_schema_serializer

class BasicUserSerializer(serializers.ModelSerializer):
    def validate(self, data):
        if hasattr(self, 'initial_data'):
            unknown_keys = set(self.initial_data.keys()) - set(self.fields.keys())
            if unknown_keys:
                if set(['is_staff', 'is_superuser', 'groups']) & unknown_keys:
                    message = 'You do not have permissions to access some of' + \
                        ' these fields: {}'.format(unknown_keys)
                else:
                    message = 'Got unknown fields: {}'.format(unknown_keys)
                raise serializers.ValidationError(message)
        return data

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

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AttributeSpec
        fields = ('id', 'name', 'mutable', 'input_type', 'default_value',
            'values')

    # pylint: disable=no-self-use
    def to_internal_value(self, data):
        attribute = data.copy()
        attribute['values'] = '\n'.join(map(lambda x: x.strip(), data.get('values', [])))
        return attribute

    def to_representation(self, instance):
        if instance:
            attribute = super().to_representation(instance)
            attribute['values'] = attribute['values'].split('\n')
        else:
            attribute = instance

        return attribute

class LabelSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    attributes = AttributeSerializer(many=True, source='attributespec_set',
        default=[])
    color = serializers.CharField(allow_blank=True, required=False)
    deleted = serializers.BooleanField(required=False, help_text="Delete label if value is true from proper Task/Project object")

    class Meta:
        model = models.Label
        fields = ('id', 'name', 'color', 'attributes', 'deleted')

    def validate(self, attrs):
        if attrs.get('deleted') == True and attrs.get('id') is None:
            raise serializers.ValidationError('Deleted label must have an ID')

        return attrs

    @staticmethod
    def update_instance(validated_data, parent_instance):
        attributes = validated_data.pop('attributespec_set', [])
        instance = dict()
        if isinstance(parent_instance, models.Project):
            instance['project'] = parent_instance
            logger = slogger.project[parent_instance.id]
        else:
            instance['task'] = parent_instance
            logger = slogger.task[parent_instance.id]
        if not validated_data.get('id') is None:
            try:
                db_label = models.Label.objects.get(id=validated_data['id'],
                    **instance)
            except models.Label.DoesNotExist:
                raise exceptions.NotFound(detail='Not found label with id #{} to change'.format(validated_data['id']))
            db_label.name = validated_data.get('name', db_label.name)
            logger.info("{}({}) label was updated".format(db_label.name, db_label.id))
        else:
            db_label = models.Label.objects.create(name=validated_data.get('name'), **instance)
            logger.info("New {} label was created".format(db_label.name))
        if validated_data.get('deleted') == True:
            db_label.delete()
            return
        if not validated_data.get('color', None):
            label_colors = [l.color for l in
                instance[tuple(instance.keys())[0]].label_set.exclude(id=db_label.id).order_by('id')
            ]
            db_label.color = get_label_color(db_label.name, label_colors)
        else:
            db_label.color = validated_data.get('color', db_label.color)
        db_label.save()
        for attr in attributes:
            (db_attr, created) = models.AttributeSpec.objects.get_or_create(
                label=db_label, name=attr['name'], defaults=attr)
            if created:
                logger.info("New {} attribute for {} label was created"
                    .format(db_attr.name, db_label.name))
            else:
                logger.info("{} attribute for {} label was updated"
                    .format(db_attr.name, db_label.name))

                # FIXME: need to update only "safe" fields
                db_attr.default_value = attr.get('default_value', db_attr.default_value)
                db_attr.mutable = attr.get('mutable', db_attr.mutable)
                db_attr.input_type = attr.get('input_type', db_attr.input_type)
                db_attr.values = attr.get('values', db_attr.values)
                db_attr.save()

class JobCommitSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.JobCommit
        fields = ('id', 'owner', 'data', 'timestamp', 'scope')


class JobReadSerializer(serializers.ModelSerializer):
    task_id = serializers.ReadOnlyField(source="segment.task.id")
    project_id = serializers.ReadOnlyField(source="get_project_id", allow_null=True)
    start_frame = serializers.ReadOnlyField(source="segment.start_frame")
    stop_frame = serializers.ReadOnlyField(source="segment.stop_frame")
    assignee = BasicUserSerializer(allow_null=True)
    dimension = serializers.CharField(max_length=2, source='segment.task.dimension')
    labels = LabelSerializer(many=True, source='get_labels')
    data_chunk_size = serializers.ReadOnlyField(source='segment.task.data.chunk_size')
    data_compressed_chunk_type = serializers.ReadOnlyField(source='segment.task.data.compressed_chunk_type')
    mode = serializers.ReadOnlyField(source='segment.task.mode')
    bug_tracker = serializers.CharField(max_length=2000, source='get_bug_tracker',
        allow_null=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'task_id', 'project_id', 'assignee',
            'dimension', 'labels', 'bug_tracker', 'status', 'stage', 'state', 'mode',
            'start_frame', 'stop_frame', 'data_chunk_size', 'data_compressed_chunk_type')
        read_only_fields = fields

class JobWriteSerializer(serializers.ModelSerializer):
    assignee = serializers.IntegerField(allow_null=True, required=False)
    def to_representation(self, instance):
        serializer = JobReadSerializer(instance, context=self.context)
        return serializer.data

    def create(self, validated_data):
        instance = super().create(validated_data)
        db_commit = models.JobCommit(job=instance, scope='create',
            owner=self.context['request'].user, data=validated_data)
        db_commit.save()

        return instance

    def update(self, instance, validated_data):
        state = validated_data.get('state')
        stage = validated_data.get('stage')
        if stage:
            if stage == models.StageChoice.ANNOTATION:
                status = models.StatusChoice.ANNOTATION
            elif stage == models.StageChoice.ACCEPTANCE and state == models.StateChoice.COMPLETED:
                status = models.StatusChoice.COMPLETED
            else:
                status = models.StatusChoice.VALIDATION

            validated_data['status'] = status
            if stage != instance.stage and not state:
                validated_data['state'] = models.StateChoice.NEW

        assignee = validated_data.get('assignee')
        if assignee is not None:
            validated_data['assignee'] = User.objects.get(id=assignee)

        instance = super().update(instance, validated_data)
        db_commit = models.JobCommit(job=instance, scope='update',
            owner=self.context['request'].user, data=validated_data)
        db_commit.save()

        return instance


    class Meta:
        model = models.Job
        fields = ('assignee', 'stage', 'state')

class SimpleJobSerializer(serializers.ModelSerializer):
    assignee = BasicUserSerializer(allow_null=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'status', 'stage', 'state')
        read_only_fields = fields

class SegmentSerializer(serializers.ModelSerializer):
    jobs = SimpleJobSerializer(many=True, source='job_set')

    class Meta:
        model = models.Segment
        fields = ('start_frame', 'stop_frame', 'jobs')
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

class WriteOnceMixin:

    """Adds support for write once fields to serializers.

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

    def get_extra_kwargs(self):
        extra_kwargs = super().get_extra_kwargs()

        # We're only interested in PATCH/PUT.
        if 'update' in getattr(self.context.get('view'), 'action', ''):
            return self._set_write_once_fields(extra_kwargs)

        return extra_kwargs

    def _set_write_once_fields(self, extra_kwargs):
        """Set all fields in `Meta.write_once_fields` to read_only."""
        write_once_fields = getattr(self.Meta, 'write_once_fields', None)
        if not write_once_fields:
            return extra_kwargs

        if not isinstance(write_once_fields, (list, tuple)):
            raise TypeError(
                'The `write_once_fields` option must be a list or tuple. '
                'Got {}.'.format(type(write_once_fields).__name__)
            )

        for field_name in write_once_fields:
            kwargs = extra_kwargs.get(field_name, {})
            kwargs['read_only'] = True
            extra_kwargs[field_name] = kwargs

        return extra_kwargs

class DataSerializer(serializers.ModelSerializer):
    image_quality = serializers.IntegerField(min_value=0, max_value=100)
    use_zip_chunks = serializers.BooleanField(default=False)
    client_files = ClientFileSerializer(many=True, default=[])
    server_files = ServerFileSerializer(many=True, default=[])
    remote_files = RemoteFileSerializer(many=True, default=[])
    use_cache = serializers.BooleanField(default=False)
    copy_data = serializers.BooleanField(default=False)
    cloud_storage_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)

    class Meta:
        model = models.Data
        fields = ('chunk_size', 'size', 'image_quality', 'start_frame', 'stop_frame', 'frame_filter',
            'compressed_chunk_type', 'original_chunk_type', 'client_files', 'server_files', 'remote_files', 'use_zip_chunks',
            'cloud_storage_id', 'use_cache', 'copy_data', 'storage_method', 'storage', 'sorting_method')

    # pylint: disable=no-self-use
    def validate_frame_filter(self, value):
        match = re.search("step\s*=\s*([1-9]\d*)", value)
        if not match:
            raise serializers.ValidationError("Invalid frame filter expression")
        return value

    # pylint: disable=no-self-use
    def validate_chunk_size(self, value):
        if not value > 0:
            raise serializers.ValidationError('Chunk size must be a positive integer')
        return value

    # pylint: disable=no-self-use
    def validate(self, data):
        if 'start_frame' in data and 'stop_frame' in data \
            and data['start_frame'] > data['stop_frame']:
            raise serializers.ValidationError('Stop frame must be more or equal start frame')
        return data

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

        for extra_key in { 'use_zip_chunks', 'use_cache', 'copy_data' }:
            validated_data.pop(extra_key)

        files = {'client_files': client_files, 'server_files': server_files, 'remote_files': remote_files}
        return files


    # pylint: disable=no-self-use
    def _create_files(self, instance, files):
        if 'client_files' in files:
            client_objects = []
            for f in files['client_files']:
                client_file = models.ClientFile(data=instance, **f)
                client_objects.append(client_file)
            models.ClientFile.objects.bulk_create(client_objects)

        if 'server_files' in files:
            for f in files['server_files']:
                server_file = models.ServerFile(data=instance, **f)
                server_file.save()

        if 'remote_files' in files:
            for f in files['remote_files']:
                remote_file = models.RemoteFile(data=instance, **f)
                remote_file.save()

class TaskSerializer(WriteOnceMixin, serializers.ModelSerializer):
    labels = LabelSerializer(many=True, source='label_set', partial=True, required=False)
    segments = SegmentSerializer(many=True, source='segment_set', read_only=True)
    data_chunk_size = serializers.ReadOnlyField(source='data.chunk_size')
    data_compressed_chunk_type = serializers.ReadOnlyField(source='data.compressed_chunk_type')
    data_original_chunk_type = serializers.ReadOnlyField(source='data.original_chunk_type')
    size = serializers.ReadOnlyField(source='data.size')
    image_quality = serializers.ReadOnlyField(source='data.image_quality')
    data = serializers.ReadOnlyField(source='data.id')
    owner = BasicUserSerializer(required=False)
    owner_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    assignee = BasicUserSerializer(allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    dimension = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = models.Task
        fields = ('url', 'id', 'name', 'project_id', 'mode', 'owner', 'assignee',
            'owner_id', 'assignee_id', 'bug_tracker', 'created_date', 'updated_date',
            'overlap', 'segment_size', 'status', 'labels', 'segments',
            'data_chunk_size', 'data_compressed_chunk_type', 'data_original_chunk_type',
            'size', 'image_quality', 'data', 'dimension', 'subset', 'organization')
        read_only_fields = ('mode', 'created_date', 'updated_date', 'status',
            'data_chunk_size', 'owner', 'assignee', 'data_compressed_chunk_type',
            'data_original_chunk_type', 'size', 'image_quality', 'data',
            'organization')
        write_once_fields = ('overlap', 'segment_size', 'project_id')

    # pylint: disable=no-self-use
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
        db_task = models.Task.objects.create(**validated_data)
        label_colors = list()
        for label in labels:
            attributes = label.pop('attributespec_set')
            if label.get('id', None):
                del label['id']
            if not label.get('color', None):
                label['color'] = get_label_color(label['name'], label_colors)
            label_colors.append(label['color'])
            db_label = models.Label.objects.create(task=db_task, **label)
            for attr in attributes:
                if attr.get('id', None):
                    del attr['id']
                models.AttributeSpec.objects.create(label=db_label, **attr)

        task_path = db_task.get_task_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        os.makedirs(db_task.get_task_logs_dirname())
        os.makedirs(db_task.get_task_artifacts_dirname())

        db_task.save()
        return db_task

    def to_representation(self, instance):
        response = super().to_representation(instance)
        if instance.project_id:
            response["labels"] = LabelSerializer(many=True).to_representation(instance.project.label_set)
        return response

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner_id = validated_data.get('owner_id', instance.owner_id)
        instance.assignee_id = validated_data.get('assignee_id', instance.assignee_id)
        instance.bug_tracker = validated_data.get('bug_tracker',
            instance.bug_tracker)
        instance.subset = validated_data.get('subset', instance.subset)
        labels = validated_data.get('label_set', [])
        if instance.project_id is None:
            for label in labels:
                LabelSerializer.update_instance(label, instance)
        validated_project_id = validated_data.get('project_id')
        if validated_project_id is not None and validated_project_id != instance.project_id:
            project = models.Project.objects.get(id=validated_project_id)
            if project.tasks.count() and project.tasks.first().dimension != instance.dimension:
                    raise serializers.ValidationError(f'Dimension ({instance.dimension}) of the task must be the same as other tasks in project ({project.tasks.first().dimension})')
            if instance.project_id is None:
                for old_label in instance.label_set.all():
                    try:
                        new_label = project.label_set.filter(name=old_label.name).first()
                    except ValueError:
                        raise serializers.ValidationError(f'Target project does not have label with name "{old_label.name}"')
                    old_label.attributespec_set.all().delete()
                    for model in (models.LabeledTrack, models.LabeledShape, models.LabeledImage):
                        model.objects.filter(job__segment__task=instance, label=old_label).update(
                            label=new_label
                        )
                instance.label_set.all().delete()
            else:
                for old_label in instance.project.label_set.all():
                    new_label_for_name = list(filter(lambda x: x.get('id', None) == old_label.id, labels))
                    if len(new_label_for_name):
                        old_label.name = new_label_for_name[0].get('name', old_label.name)
                    try:
                        new_label = project.label_set.filter(name=old_label.name).first()
                    except ValueError:
                        raise serializers.ValidationError(f'Target project does not have label with name "{old_label.name}"')
                    for (model, attr, attr_name) in (
                        (models.LabeledTrack, models.LabeledTrackAttributeVal, 'track'),
                        (models.LabeledShape, models.LabeledShapeAttributeVal, 'shape'),
                        (models.LabeledImage, models.LabeledImageAttributeVal, 'image')
                    ):
                        attr.objects.filter(**{
                            f'{attr_name}__job__segment__task': instance,
                            f'{attr_name}__label': old_label
                        }).delete()
                        model.objects.filter(job__segment__task=instance, label=old_label).update(
                            label=new_label
                        )
            instance.project = project

        instance.save()
        return instance

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
            for old_label in old_labels:
                new_labels = tuple(filter(lambda x: x.get('id') == old_label.id, attrs.get('label_set', [])))
                if len(new_labels):
                    new_label_names.add(new_labels[0].get('name', old_label.name))
                else:
                    new_label_names.add(old_label.name)
            target_project = models.Project.objects.get(id=project_id)
            target_project_label_names = set()
            for label in target_project.label_set.all():
                target_project_label_names.add(label.name)
            if not new_label_names.issubset(target_project_label_names):
                raise serializers.ValidationError('All task or project label names must be mapped to the target project')
        else:
            if 'label_set' in attrs.keys():
                label_names = [label['name'] for label in attrs.get('label_set')]
                if len(label_names) != len(set(label_names)):
                    raise serializers.ValidationError('All label names must be unique for the task')

        return attrs


class ProjectSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Project
        fields = ('id', 'name')
        read_only_fields = ('name',)

class ProjectSerializer(serializers.ModelSerializer):
    labels = LabelSerializer(many=True, source='label_set', partial=True, default=[])
    owner = BasicUserSerializer(required=False, read_only=True)
    owner_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    assignee = BasicUserSerializer(allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    task_subsets = serializers.ListField(child=serializers.CharField(), required=False)
    dimension = serializers.CharField(max_length=16, required=False, read_only=True)

    class Meta:
        model = models.Project
        fields = ('url', 'id', 'name', 'labels', 'tasks', 'owner', 'assignee',
            'owner_id', 'assignee_id', 'bug_tracker', 'task_subsets',
            'created_date', 'updated_date', 'status', 'dimension', 'organization')
        read_only_fields = ('created_date', 'updated_date', 'status', 'owner',
            'assignee', 'task_subsets', 'dimension', 'organization', 'tasks')

    def to_representation(self, instance):
        response = super().to_representation(instance)
        task_subsets = set(instance.tasks.values_list('subset', flat=True))
        task_subsets.discard('')
        response['task_subsets'] = list(task_subsets)
        response['dimension'] = instance.tasks.first().dimension if instance.tasks.count() else None
        return response

    # pylint: disable=no-self-use
    def create(self, validated_data):
        labels = validated_data.pop('label_set')
        db_project = models.Project.objects.create(**validated_data)
        label_colors = list()
        for label in labels:
            if label.get('id', None):
                del label['id']
            attributes = label.pop('attributespec_set')
            if not label.get('color', None):
                label['color'] = get_label_color(label['name'], label_colors)
            label_colors.append(label['color'])
            db_label = models.Label.objects.create(project=db_project, **label)
            for attr in attributes:
                if attr.get('id', None):
                    del attr['id']
                models.AttributeSpec.objects.create(label=db_label, **attr)

        project_path = db_project.get_project_dirname()
        if os.path.isdir(project_path):
            shutil.rmtree(project_path)
        os.makedirs(db_project.get_project_logs_dirname())

        return db_project

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner_id = validated_data.get('owner_id', instance.owner_id)
        instance.assignee_id = validated_data.get('assignee_id', instance.assignee_id)
        instance.bug_tracker = validated_data.get('bug_tracker', instance.bug_tracker)
        labels = validated_data.get('label_set', [])
        for label in labels:
            LabelSerializer.update_instance(label, instance)

        instance.save()
        return instance


    def validate_labels(self, value):
        if value:
            label_names = [label['name'] for label in value]
            if len(label_names) != len(set(label_names)):
                raise serializers.ValidationError('All label names must be unique for the project')
        return value

class ExceptionSerializer(serializers.Serializer):
    system = serializers.CharField(max_length=255)
    client = serializers.CharField(max_length=255)
    time = serializers.DateTimeField()

    job_id = serializers.IntegerField(required=False)
    task_id = serializers.IntegerField(required=False)
    proj_id = serializers.IntegerField(required=False)
    client_id = serializers.IntegerField()

    message = serializers.CharField(max_length=4096)
    filename = serializers.URLField()
    line = serializers.IntegerField()
    column = serializers.IntegerField()
    stack = serializers.CharField(max_length=8192,
        style={'base_template': 'textarea.html'}, allow_blank=True)

class AboutSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    description = serializers.CharField(max_length=2048)
    version = serializers.CharField(max_length=64)

class FrameMetaSerializer(serializers.Serializer):
    width = serializers.IntegerField()
    height = serializers.IntegerField()
    name = serializers.CharField(max_length=1024)
    has_related_context = serializers.BooleanField()

class PluginsSerializer(serializers.Serializer):
    GIT_INTEGRATION = serializers.BooleanField()
    ANALYTICS = serializers.BooleanField()
    MODELS = serializers.BooleanField()
    PREDICT = serializers.BooleanField()

class DataMetaSerializer(serializers.ModelSerializer):
    frames = FrameMetaSerializer(many=True, allow_null=True)
    image_quality = serializers.IntegerField(min_value=0, max_value=100)

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
        )
        read_only_fields = (
            'chunk_size',
            'size',
            'image_quality',
            'start_frame',
            'stop_frame',
            'frame_filter',
            'frames',
        )

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
    group = serializers.IntegerField(min_value=0, allow_null=True)
    source = serializers.CharField(default = 'manual')

class LabeledImageSerializer(AnnotationSerializer):
    attributes = AttributeValSerializer(many=True,
        source="labeledimageattributeval_set")

class ShapeSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=models.ShapeType.choices())
    occluded = serializers.BooleanField()
    z_order = serializers.IntegerField(default=0)
    rotation = serializers.FloatField(default=0, min_value=0, max_value=360)
    points = serializers.ListField(
        child=serializers.FloatField(),
        allow_empty=False,
    )

class LabeledShapeSerializer(ShapeSerializer, AnnotationSerializer):
    attributes = AttributeValSerializer(many=True,
        source="labeledshapeattributeval_set")

class TrackedShapeSerializer(ShapeSerializer):
    id = serializers.IntegerField(default=None, allow_null=True)
    frame = serializers.IntegerField(min_value=0)
    outside = serializers.BooleanField()
    attributes = AttributeValSerializer(many=True,
        source="trackedshapeattributeval_set")

class LabeledTrackSerializer(AnnotationSerializer):
    shapes = TrackedShapeSerializer(many=True, allow_empty=False,
        source="trackedshape_set")
    attributes = AttributeValSerializer(many=True,
        source="labeledtrackattributeval_set")

class LabeledDataSerializer(serializers.Serializer):
    version = serializers.IntegerField()
    tags   = LabeledImageSerializer(many=True)
    shapes = LabeledShapeSerializer(many=True)
    tracks = LabeledTrackSerializer(many=True)

class FileInfoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=1024)
    type = serializers.ChoiceField(choices=["REG", "DIR"])

class LogEventSerializer(serializers.Serializer):
    job_id = serializers.IntegerField(required=False)
    task_id = serializers.IntegerField(required=False)
    proj_id = serializers.IntegerField(required=False)
    client_id = serializers.IntegerField()

    name = serializers.CharField(max_length=64)
    time = serializers.DateTimeField()
    message = serializers.CharField(max_length=4096, required=False)
    payload = serializers.DictField(required=False)
    is_active = serializers.BooleanField()

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
        fields = ('id', 'issue', 'owner', 'message', 'created_date',
            'updated_date')
        read_only_fields = ('id', 'created_date', 'updated_date', 'owner')
        write_once_fields = ('issue', )


class IssueReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True, required=False)
    assignee = BasicUserSerializer(allow_null=True, required=False)
    position = serializers.ListField(
        child=serializers.FloatField(), allow_empty=False
    )
    comments = CommentReadSerializer(many=True)

    class Meta:
        model = models.Issue
        fields = ('id', 'frame', 'position', 'job', 'owner', 'assignee',
            'created_date', 'updated_date', 'comments', 'resolved')
        read_only_fields = fields


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
        fields = ('id', 'frame', 'position', 'job', 'owner', 'assignee',
            'created_date', 'updated_date', 'message', 'resolved')
        read_only_fields = ('id', 'owner', 'created_date', 'updated_date')
        write_once_fields = ('frame', 'position', 'job', 'message', 'owner')

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
    owner = BasicUserSerializer(required=False)
    manifests = ManifestSerializer(many=True, default=[])
    class Meta:
        model = models.CloudStorage
        exclude = ['credentials']
        read_only_fields = ('created_date', 'updated_date', 'owner', 'organization')

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
    key = serializers.CharField(max_length=20, allow_blank=True, required=False)
    secret_key = serializers.CharField(max_length=40, allow_blank=True, required=False)
    key_file = serializers.FileField(required=False)
    account_name = serializers.CharField(max_length=24, allow_blank=True, required=False)
    manifests = ManifestSerializer(many=True, default=[])

    class Meta:
        model = models.CloudStorage
        fields = (
            'provider_type', 'resource', 'display_name', 'owner', 'credentials_type',
            'created_date', 'updated_date', 'session_token', 'account_name', 'key',
            'secret_key', 'key_file', 'specific_attributes', 'description', 'id',
            'manifests', 'organization'
        )
        read_only_fields = ('created_date', 'updated_date', 'owner', 'organization')

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
            if not attrs.get('account_name', ''):
                raise serializers.ValidationError('Account name for Azure container was not specified')
        return attrs

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
        temporary_file = ''
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
            credentials_type = validated_data.get('credentials_type')
        )
        details = {
            'resource': validated_data.get('resource'),
            'credentials': credentials,
            'specific_attributes': parse_specific_attributes(validated_data.get('specific_attributes', ''))
        }
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

            os.makedirs(db_storage.get_storage_logs_dirname(), exist_ok=True)
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

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        credentials = Credentials()
        credentials.convert_from_db({
            'type': instance.credentials_type,
            'value': instance.credentials,
        })
        credentials_dict = {k:v for k,v in validated_data.items() if k in {
            'key','secret_key', 'account_name', 'session_token', 'key_file_path',
            'credentials_type'
        }}

        key_file = validated_data.pop('key_file', None)
        temporary_file = ''
        if key_file:
            with NamedTemporaryFile(mode='wb', prefix='cvat', delete=False) as temp_key:
                temp_key.write(key_file.read())
                temporary_file = temp_key.name
            credentials_dict['key_file_path'] = temporary_file
            key_file.close()
            del key_file

        credentials.mapping_with_new_values(credentials_dict)
        instance.credentials = credentials.convert_to_db()
        instance.credentials_type = validated_data.get('credentials_type', instance.credentials_type)
        instance.resource = validated_data.get('resource', instance.resource)
        instance.display_name = validated_data.get('display_name', instance.display_name)
        instance.description = validated_data.get('description', instance.description)
        instance.specific_attributes = validated_data.get('specific_attributes', instance.specific_attributes)

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
            previos_manifest_names = set(i.filename for i in instance.manifests.all())
            delta_to_delete = tuple(previos_manifest_names - new_manifest_names)
            delta_to_create = tuple(new_manifest_names - previos_manifest_names)
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

class RelatedFileSerializer(serializers.ModelSerializer):

    class Meta:
        model = models.RelatedFile
        fields = '__all__'
        read_only_fields = ('path',)
