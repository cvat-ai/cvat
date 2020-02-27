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
    class Meta:
        model = models.Label
        fields = ('id', 'name', 'attributes')

class JobCommitSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.JobCommit
        fields = ('id', 'version', 'author', 'message', 'timestamp')

class JobSerializer(serializers.ModelSerializer):
    task_id = serializers.ReadOnlyField(source="segment.task.id")
    start_frame = serializers.ReadOnlyField(source="segment.start_frame")
    stop_frame = serializers.ReadOnlyField(source="segment.stop_frame")

    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'status', 'start_frame',
            'stop_frame', 'task_id')

class SimpleJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Job
        fields = ('url', 'id', 'assignee', 'status')

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
            upload_dir = instance.task.get_upload_dirname()
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

class TaskDataSerializer(serializers.ModelSerializer):
    client_files = ClientFileSerializer(many=True, source='clientfile_set',
        default=[])
    server_files = ServerFileSerializer(many=True, source='serverfile_set',
        default=[])
    remote_files = RemoteFileSerializer(many=True, source='remotefile_set',
        default=[])

    class Meta:
        model = models.Task
        fields = ('client_files', 'server_files', 'remote_files')

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        client_files = validated_data.pop('clientfile_set')
        server_files = validated_data.pop('serverfile_set')
        remote_files = validated_data.pop('remotefile_set')

        for file in client_files:
            client_file = models.ClientFile(task=instance, **file)
            client_file.save()

        for file in server_files:
            server_file = models.ServerFile(task=instance, **file)
            server_file.save()

        for file in remote_files:
            remote_file = models.RemoteFile(task=instance, **file)
            remote_file.save()

        return instance

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

class TaskSerializer(WriteOnceMixin, serializers.ModelSerializer):
    labels = LabelSerializer(many=True, source='label_set', partial=True)
    segments = SegmentSerializer(many=True, source='segment_set', read_only=True)
    image_quality = serializers.IntegerField(min_value=0, max_value=100)

    class Meta:
        model = models.Task
        fields = ('url', 'id', 'name', 'size', 'mode', 'owner', 'assignee',
            'bug_tracker', 'created_date', 'updated_date', 'overlap',
            'segment_size', 'z_order', 'status', 'labels', 'segments',
            'image_quality', 'start_frame', 'stop_frame', 'frame_filter',
            'project')
        read_only_fields = ('size', 'mode', 'created_date', 'updated_date',
            'status')
        write_once_fields = ('overlap', 'segment_size', 'image_quality')
        ordering = ['-id']

    def validate_frame_filter(self, value):
        match = re.search("step\s*=\s*([1-9]\d*)", value)
        if not match:
            raise serializers.ValidationError("Invalid frame filter expression")
        return value

    # pylint: disable=no-self-use
    def create(self, validated_data):
        labels = validated_data.pop('label_set')
        db_task = models.Task.objects.create(size=0, **validated_data)
        db_task.start_frame = validated_data.get('start_frame', 0)
        db_task.stop_frame = validated_data.get('stop_frame', 0)
        db_task.frame_filter = validated_data.get('frame_filter', '')
        for label in labels:
            attributes = label.pop('attributespec_set')
            db_label = models.Label.objects.create(task=db_task, **label)
            for attr in attributes:
                models.AttributeSpec.objects.create(label=db_label, **attr)

        task_path = db_task.get_task_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        upload_dir = db_task.get_upload_dirname()
        os.makedirs(upload_dir)
        output_dir = db_task.get_data_dirname()
        os.makedirs(output_dir)

        return db_task

    # pylint: disable=no-self-use
    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner = validated_data.get('owner', instance.owner)
        instance.assignee = validated_data.get('assignee', instance.assignee)
        instance.bug_tracker = validated_data.get('bug_tracker',
            instance.bug_tracker)
        instance.z_order = validated_data.get('z_order', instance.z_order)
        instance.image_quality = validated_data.get('image_quality',
            instance.image_quality)
        instance.start_frame = validated_data.get('start_frame', instance.start_frame)
        instance.stop_frame = validated_data.get('stop_frame', instance.stop_frame)
        instance.frame_filter = validated_data.get('frame_filter', instance.frame_filter)
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

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Project
        fields = ('url', 'id', 'name', 'owner', 'assignee', 'bug_tracker',
            'created_date', 'updated_date', 'status')
        read_only_fields = ('created_date', 'updated_date', 'status')
        ordering = ['-id']

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
        fields = ('url', 'id', 'username', 'first_name', 'last_name', 'email')
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

class ImageMetaSerializer(serializers.Serializer):
    width = serializers.IntegerField()
    height = serializers.IntegerField()

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

class PluginSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Plugin
        fields = ('name', 'description', 'maintainer', 'created_at',
            'updated_at')

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
