# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import re
import shutil

from rest_framework import serializers
from django.contrib.auth.models import User, Group

from cvat.apps.engine import models
from cvat.apps.engine.log import slogger
from cvat.apps.dataset_manager.formats.utils import get_label_color

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
        ordering = ['-id']

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
        ordering = ['-id']

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
    attributes = AttributeSerializer(many=True, source='attributespec_set',
        default=[])
    color = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = models.Label
        fields = ('id', 'name', 'color', 'attributes')

class JobCommitSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.JobCommit
        fields = ('id', 'version', 'author', 'message', 'timestamp')

class JobSerializer(serializers.ModelSerializer):
    task_id = serializers.ReadOnlyField(source="segment.task.id")
    start_frame = serializers.ReadOnlyField(source="segment.start_frame")
    stop_frame = serializers.ReadOnlyField(source="segment.stop_frame")
    assignee = BasicUserSerializer(allow_null=True, required=False)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'assignee_id', 'status', 'start_frame',
            'stop_frame', 'task_id')

class SimpleJobSerializer(serializers.ModelSerializer):
    assignee = BasicUserSerializer(allow_null=True)
    assignee_id = serializers.IntegerField(write_only=True, allow_null=True)

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'assignee_id', 'status')

class SegmentSerializer(serializers.ModelSerializer):
    jobs = SimpleJobSerializer(many=True, source='job_set')

    class Meta:
        model = models.Segment
        fields = ('start_frame', 'stop_frame', 'jobs')

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

    class Meta:
        model = models.Data
        fields = ('chunk_size', 'size', 'image_quality', 'start_frame', 'stop_frame', 'frame_filter',
            'compressed_chunk_type', 'original_chunk_type', 'client_files', 'server_files', 'remote_files', 'use_zip_chunks',
            'use_cache')

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

    # pylint: disable=no-self-use
    def create(self, validated_data):
        client_files = validated_data.pop('client_files')
        server_files = validated_data.pop('server_files')
        remote_files = validated_data.pop('remote_files')
        validated_data.pop('use_zip_chunks')
        validated_data.pop('use_cache')
        db_data = models.Data.objects.create(**validated_data)

        data_path = db_data.get_data_dirname()
        if os.path.isdir(data_path):
            shutil.rmtree(data_path)

        os.makedirs(db_data.get_compressed_cache_dirname())
        os.makedirs(db_data.get_original_cache_dirname())
        os.makedirs(db_data.get_upload_dirname())

        for f in client_files:
            client_file = models.ClientFile(data=db_data, **f)
            client_file.save()

        for f in server_files:
            server_file = models.ServerFile(data=db_data, **f)
            server_file.save()

        for f in remote_files:
            remote_file = models.RemoteFile(data=db_data, **f)
            remote_file.save()

        db_data.save()
        return db_data

class TaskSerializer(WriteOnceMixin, serializers.ModelSerializer):
    labels = LabelSerializer(many=True, source='label_set', partial=True)
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

    class Meta:
        model = models.Task
        fields = ('url', 'id', 'name', 'mode', 'owner', 'assignee', 'owner_id', 'assignee_id',
            'bug_tracker', 'created_date', 'updated_date', 'overlap',
            'segment_size', 'status', 'labels', 'segments',
            'project', 'data_chunk_size', 'data_compressed_chunk_type', 'data_original_chunk_type', 'size', 'image_quality', 'data')
        read_only_fields = ('mode', 'created_date', 'updated_date', 'status', 'data_chunk_size', 'owner', 'asignee',
            'data_compressed_chunk_type', 'data_original_chunk_type', 'size', 'image_quality', 'data')
        write_once_fields = ('overlap', 'segment_size')
        ordering = ['-id']

    # pylint: disable=no-self-use
    def create(self, validated_data):
        labels = validated_data.pop('label_set')
        db_task = models.Task.objects.create(**validated_data)
        label_names = list()
        for label in labels:
            attributes = label.pop('attributespec_set')
            if not label.get('color', None):
                label['color'] = get_label_color(label['name'], label_names)
            label_names.append(label['name'])
            db_label = models.Label.objects.create(task=db_task, **label)
            for attr in attributes:
                models.AttributeSpec.objects.create(label=db_label, **attr)

        task_path = db_task.get_task_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        os.makedirs(db_task.get_task_logs_dirname())
        os.makedirs(db_task.get_task_artifacts_dirname())

        db_task.save()
        return db_task

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner_id = validated_data.get('owner_id', instance.owner_id)
        instance.assignee_id = validated_data.get('assignee_id', instance.assignee_id)
        instance.bug_tracker = validated_data.get('bug_tracker',
            instance.bug_tracker)
        instance.project = validated_data.get('project', instance.project)
        labels = validated_data.get('label_set', [])
        for label in labels:
            attributes = label.pop('attributespec_set', [])
            (db_label, created) = models.Label.objects.get_or_create(task=instance,
                name=label['name'])
            if created:
                slogger.task[instance.id].info("New {} label was created"
                    .format(db_label.name))
            else:
                slogger.task[instance.id].info("{} label was updated"
                    .format(db_label.name))
            if not label.get('color', None):
                label_names = [l.name for l in
                    instance.label_set.all().exclude(id=db_label.id).order_by('id')
                ]
                db_label.color = get_label_color(db_label.name, label_names)
            else:
                db_label.color = label.get('color', db_label.color)
            db_label.save()
            for attr in attributes:
                (db_attr, created) = models.AttributeSpec.objects.get_or_create(
                    label=db_label, name=attr['name'], defaults=attr)
                if created:
                    slogger.task[instance.id].info("New {} attribute for {} label was created"
                        .format(db_attr.name, db_label.name))
                else:
                    slogger.task[instance.id].info("{} attribute for {} label was updated"
                        .format(db_attr.name, db_label.name))

                    # FIXME: need to update only "safe" fields
                    db_attr.default_value = attr.get('default_value', db_attr.default_value)
                    db_attr.mutable = attr.get('mutable', db_attr.mutable)
                    db_attr.input_type = attr.get('input_type', db_attr.input_type)
                    db_attr.values = attr.get('values', db_attr.values)
                    db_attr.save()

        instance.save()
        return instance

    def validate_labels(self, value):
        if not value:
            raise serializers.ValidationError('Label set must not be empty')
        label_names = [label['name'] for label in value]
        if len(label_names) != len(set(label_names)):
            raise serializers.ValidationError('All label names must be unique for the task')
        return value


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Project
        fields = ('url', 'id', 'name', 'owner', 'assignee', 'bug_tracker',
            'created_date', 'updated_date', 'status')
        read_only_fields = ('created_date', 'updated_date', 'status')
        ordering = ['-id']

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

class PluginsSerializer(serializers.Serializer):
    GIT_INTEGRATION = serializers.BooleanField()
    ANALYTICS = serializers.BooleanField()
    MODELS = serializers.BooleanField()

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
