# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from cvat.apps.engine.models import (Task, Job, Label, AttributeSpec,
    Segment, ClientFile, ServerFile, RemoteFile, Plugin)
from cvat.apps.engine.log import slogger

from django.contrib.auth.models import User, Group
import os
import shutil
import json

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeSpec
        fields = ('id', 'name', 'mutable', 'input_type', 'default_value',
            'values')

    def to_internal_value(self, data):
        attribute = data.copy()
        attribute['values'] = '\n'.join(data['values'])
        return attribute

    def to_representation(self, instance):
        attribute = super().to_representation(instance)
        attribute['values'] = attribute['values'].split('\n')
        return attribute


class LabelSerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, source='attributespec_set',
        default=[])
    class Meta:
        model = Label
        fields = ('id', 'name', 'attributes')

class JobSerializer(serializers.ModelSerializer):
    task_id = serializers.ReadOnlyField(source="segment.task.id")
    start_frame = serializers.ReadOnlyField(source="segment.start_frame")
    stop_frame = serializers.ReadOnlyField(source="segment.stop_frame")

    class Meta:
        model = Job
        fields = ('url', 'id', 'assignee', 'status', 'start_frame',
            'stop_frame', 'max_shape_id', 'task_id')
        read_only_fields = ('max_shape_id',)

class SimpleJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ('url', 'id', 'assignee', 'status', 'max_shape_id')
        read_only_fields = ('max_shape_id',)

class SegmentSerializer(serializers.ModelSerializer):
    jobs = SimpleJobSerializer(many=True, source='job_set')

    class Meta:
        model = Segment
        fields = ('start_frame', 'stop_frame', 'jobs')

class ClientFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientFile
        fields = ('file', )

    def to_internal_value(self, data):
        return {'file': data}

    def to_representation(self, instance):
        upload_dir = instance.task.get_upload_dirname()
        return instance.file.path[len(upload_dir) + 1:]

class ServerFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServerFile
        fields = ('file', )

class RemoteFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RemoteFile
        fields = ('file', )

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
        model = Task
        fields = ('client_files', 'server_files', 'remote_files')

    def update(self, instance, validated_data):
        client_files = validated_data.pop('clientfile_set')
        server_files = validated_data.pop('serverfile_set')
        remote_files = validated_data.pop('remotefile_set')

        for file in client_files:
            client_file = ClientFile(task=instance, **file)
            client_file.save()

        for file in server_files:
            server_file = ServerFile(task=instance, **file)
            server_file.save()

        for file in remote_files:
            remote_file = RemoteFile(task=instance, **file)
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
    image_quality = serializers.IntegerField(min_value=0, max_value=100,
        default=50)

    class Meta:
        model = Task
        fields = ('url', 'id', 'name', 'size', 'mode', 'owner', 'assignee',
            'bug_tracker', 'created_date', 'updated_date', 'overlap',
            'segment_size', 'z_order', 'flipped', 'status', 'labels', 'segments',
            'image_quality')
        read_only_fields = ('size', 'mode', 'created_date', 'updated_date',
            'status')
        write_once_fields = ('overlap', 'segment_size')
        ordering = ['-id']

    def create(self, validated_data):
        labels = validated_data.pop('label_set')
        db_task = Task.objects.create(size=0, **validated_data)
        for label in labels:
            attributes = label.pop('attributespec_set')
            db_label = Label.objects.create(task=db_task, **label)
            for attr in attributes:
                AttributeSpec.objects.create(label=db_label, **attr)

        task_path = db_task.get_task_dirname()
        if os.path.isdir(task_path):
            shutil.rmtree(task_path)

        upload_dir = db_task.get_upload_dirname()
        os.makedirs(upload_dir)
        output_dir = db_task.get_data_dirname()
        os.makedirs(output_dir)

        return db_task

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.owner = validated_data.get('owner', instance.owner)
        instance.assignee = validated_data.get('assignee', instance.assignee)
        instance.bug_tracker = validated_data.get('bug_tracker',
            instance.bug_tracker)
        instance.z_order = validated_data.get('z_order', instance.z_order)
        instance.flipped = validated_data.get('flipped', instance.flipped)
        instance.image_quality = validated_data.get('image_quality',
            instance.image_quality)
        labels = validated_data.get('label_set', [])
        for label in labels:
            attributes = label.pop('attributespec_set', [])
            (db_label, created) = Label.objects.get_or_create(task=instance,
                name=label['name'])
            if created:
                slogger.task[instance.id].info("New {} label was created"
                    .format(db_label.name))
            else:
                slogger.task[instance.id].info("{} label was updated"
                    .format(db_label.name))
            for attr in attributes:
                (db_attr, created) = AttributeSpec.objects.get_or_create(
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

        return instance


class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True,
        slug_field='name', queryset=Group.objects.all())

    class Meta:
        model = User
        fields = ('url', 'id', 'username', 'first_name', 'last_name', 'email',
            'groups', 'is_staff', 'is_superuser', 'is_active', 'last_login',
            'date_joined', 'groups')
        read_only_fields = ('last_login', 'date_joined')
        write_only_fields = ('password', )
        ordering = ['-id']

class ExceptionSerializer(serializers.Serializer):
    system = serializers.CharField(max_length=255)
    client = serializers.CharField(max_length=255)

    task = serializers.IntegerField(allow_null=True)
    job = serializers.IntegerField(allow_null=True)

    message = serializers.CharField(max_length=4096)
    filename = serializers.URLField()
    line = serializers.IntegerField()
    column = serializers.IntegerField()
    stack = serializers.CharField(max_length=8192,
        style={'base_template': 'textarea.html'}, allow_null=True)


class AboutSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=128)
    description = serializers.CharField(max_length=2048)
    version = serializers.CharField(max_length=64)

class ImageMetaSerializer(serializers.Serializer):
    width = serializers.IntegerField()
    height = serializers.IntegerField()

class PluginSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plugin
        fields = ('name', 'description', 'maintainer', 'created_at',
            'updated_at')
