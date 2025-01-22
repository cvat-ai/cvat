# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap

from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.plumbing import build_basic_type, force_instance
from drf_spectacular.serializers import PolymorphicProxySerializerExtension
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers


def _copy_serializer(
    instance: serializers.Serializer,
    *,
    _new_type: type[serializers.Serializer] = None,
    **kwargs
) -> serializers.Serializer:
    _new_type = _new_type or type(instance)
    instance_kwargs = instance._kwargs
    instance_kwargs['partial'] = instance.partial # this can be set separately
    instance_kwargs.update(kwargs)
    return _new_type(*instance._args, **instance._kwargs)

class _SerializerTransformer:
    def __init__(self, serializer_instance: serializers.ModelSerializer) -> None:
        self.serializer_instance = serializer_instance

    def _get_field(
        self,
        source_name: str,
        field_name: str
    ) -> serializers.ModelField:
        child_instance = force_instance(self.serializer_instance.fields[source_name].child)
        assert isinstance(child_instance, serializers.ModelSerializer)

        child_fields = child_instance.fields
        assert child_fields.keys() == {field_name} # protection from implementation changes
        return child_fields[field_name]

    @staticmethod
    def _sanitize_field(field: serializers.ModelField) -> serializers.ModelField:
        field.source = None
        field.source_attrs = []
        return field

    def make_field(self, source_name: str, field_name: str) -> serializers.ModelField:
        return self._sanitize_field(self._get_field(source_name, field_name))

class DataSerializerExtension(OpenApiSerializerExtension):
    # *FileSerializer mimics a FileField
    # but it is mapped as an object with a file field, which
    # is different from what we have for a regular file
    # field - a string of binary format.
    # This class replaces the generated schema as if it was:
    # *_files = serializers.ListField(child=serializers.FileField(allow_empty_file=False))
    #
    # Also, the generator doesn't work with the correct OpenAPI definition,
    # where FileField-like structure (plain type) is referenced in args.
    # So, this class overrides the whole field.

    target_class = 'cvat.apps.engine.serializers.DataSerializer'

    def map_serializer(self, auto_schema, direction):
        assert issubclass(self.target_class, serializers.ModelSerializer)

        instance = self.target
        assert isinstance(instance, serializers.ModelSerializer)

        serializer_transformer = _SerializerTransformer(instance)
        source_client_files = instance.fields['client_files']
        source_server_files = instance.fields['server_files']
        source_remote_files = instance.fields['remote_files']

        class _Override(self.target_class): # pylint: disable=inherit-non-class
            client_files = serializers.ListField(
                child=serializer_transformer.make_field('client_files', 'file'),
                default=source_client_files.default,
                help_text=source_client_files.help_text,
            )
            server_files = serializers.ListField(
                child=serializer_transformer.make_field('server_files', 'file'),
                default=source_server_files.default,
                help_text=source_server_files.help_text,
            )
            remote_files = serializers.ListField(
                child=serializer_transformer.make_field('remote_files', 'file'),
                default=source_remote_files.default,
                help_text=source_remote_files.help_text,
            )

        return auto_schema._map_serializer(
            _copy_serializer(instance, _new_type=_Override, context={'view': auto_schema.view}),
            direction, bypass_extensions=False)

class WriteOnceSerializerExtension(OpenApiSerializerExtension):
    """
    Enables support for cvat.apps.engine.serializers.WriteOnceMixin in drf-spectacular.
    Doesn't block other extensions on the target serializer.

    Removes the WriteOnceMixin class docstring from derived class descriptions.
    """

    match_subclasses = True
    target_class = 'cvat.apps.engine.serializers.WriteOnceMixin'
    _PROCESSED_INDICATOR_NAME = 'write_once_serializer_extension_processed'

    @classmethod
    def _matches(cls, target) -> bool:
        if super()._matches(target):
            # protect from recursive invocations
            assert isinstance(target, serializers.Serializer)
            processed = target.context.get(cls._PROCESSED_INDICATOR_NAME, False)
            return not processed
        return False

    def map_serializer(self, auto_schema, direction):
        from cvat.apps.engine.serializers import WriteOnceMixin

        schema = auto_schema._map_serializer(
            _copy_serializer(self.target, context={
                'view': auto_schema.view,
                self._PROCESSED_INDICATOR_NAME: True
            }),
            direction, bypass_extensions=False)

        if schema.get('description') == textwrap.dedent(WriteOnceMixin.__doc__).strip():
            del schema['description']

        return schema

class OpenApiTypeProxySerializerExtension(PolymorphicProxySerializerExtension):
    """
    Provides support for OpenApiTypes in the PolymorphicProxySerializer list
    """
    priority = 0 # restore normal priority

    def _process_serializer(self, auto_schema, serializer, direction):
        if isinstance(serializer, OpenApiTypes):
            schema = build_basic_type(serializer)
            return (None, schema)
        else:
            return super()._process_serializer(auto_schema=auto_schema,
                serializer=serializer, direction=direction)

    def map_serializer(self, auto_schema, direction):
        """ custom handling for @extend_schema's injection of PolymorphicProxySerializer """
        result = super().map_serializer(auto_schema=auto_schema, direction=direction)

        if isinstance(self.target.serializers, dict):
            required = OpenApiTypes.NONE not in self.target.serializers.values()
        else:
            required = OpenApiTypes.NONE not in self.target.serializers

        if not required:
            result['nullable'] = True

        return result

class ComponentProxySerializerExtension(OpenApiTypeProxySerializerExtension):
    """
    Allows to patch PolymorphicProxySerializer-based component schema.

    Override the "target_component" field in children classes.
    """
    priority = 1 # higher than in the parent class

    target_component: str = ''

    @classmethod
    def _matches(cls, target) -> bool:
        if cls == __class__:
            return False

        if not super()._matches(target):
            return False

        return target.component_name == cls.target_component

class AnyOfProxySerializerExtension(ComponentProxySerializerExtension):
    """
    Replaces oneOf with anyOf in the generated schema. Useful when
    no disciminator field is available, and the options are
    not mutually-exclusive.
    """

    def map_serializer(self, auto_schema, direction):
        schema = super().map_serializer(auto_schema, direction)
        schema['anyOf'] = schema.pop('oneOf')
        return schema

class MetaUserSerializerExtension(AnyOfProxySerializerExtension):
    # Need to replace oneOf to anyOf for MetaUser variants
    # Otherwise, clients cannot distinguish between classes
    # using just input data. Also, we can't use discrimintator
    # field here, because these serializers don't have such.
    target_component = 'MetaUser'

class PolymorphicProjectSerializerExtension(AnyOfProxySerializerExtension):
    # Need to replace oneOf to anyOf for PolymorphicProject variants
    # Otherwise, clients cannot distinguish between classes
    # using just input data. Also, we can't use discrimintator
    # field here, because these serializers don't have such.
    target_component = 'PolymorphicProject'

class _CloudStorageSerializerExtension(OpenApiSerializerExtension):

    def map_serializer(self, auto_schema, direction):
        assert issubclass(self.target_class, serializers.ModelSerializer)

        instance = self.target
        assert isinstance(instance, serializers.ModelSerializer)

        serializer_transformer = _SerializerTransformer(instance)

        class _Override(self.target_class): # pylint: disable=inherit-non-class
            manifests = serializers.ListField(
                child=serializer_transformer.make_field('manifests', 'filename'), default=[])

        return auto_schema._map_serializer(
            _copy_serializer(instance, _new_type=_Override, context={'view': auto_schema.view}),
            direction, bypass_extensions=False)

class CloudStorageReadSerializerExtension(_CloudStorageSerializerExtension):
    target_class = 'cvat.apps.engine.serializers.CloudStorageReadSerializer'

class CloudStorageWriteSerializerExtension(_CloudStorageSerializerExtension):
    target_class = 'cvat.apps.engine.serializers.CloudStorageWriteSerializer'


__all__ = [] # No public symbols here
