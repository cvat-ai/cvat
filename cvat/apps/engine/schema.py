# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Sequence, Type
from rest_framework import serializers
from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.plumbing import force_instance, build_basic_type
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.serializers import PolymorphicProxySerializerExtension


def _copy_serializer(
    instance: serializers.Serializer,
    *,
    _new_type: Type[serializers.Serializer] = None,
    **kwargs
) -> serializers.Serializer:
    _new_type = _new_type or type(instance)
    instance_kwargs = instance._kwargs
    instance_kwargs['partial'] = instance.partial # this can be set separately
    instance_kwargs.update(kwargs)
    return _new_type(*instance._args, **instance._kwargs)


class _FieldReplacerExtension(OpenApiSerializerExtension):
    """
    Allows to replace separate fields using the target fields.
    """

    _EXPECTED_TARGET_FIELDS: Sequence[str]

    def _get_field(
        self,
        instance: serializers.ModelSerializer,
        source_name: str,
        field_name: str,
        expected_field_names: Sequence[str]
    ) -> serializers.ModelField:
        child_instance = force_instance(instance.fields[source_name].child)
        assert isinstance(child_instance, serializers.ModelSerializer)

        child_fields = child_instance.fields
        assert child_fields.keys() == set(expected_field_names) # protection from implementation changes
        return child_fields[field_name]

    def _sanitize_field(self, field: serializers.ModelField) -> serializers.ModelField:
        field.source = None
        field.source_attrs = []
        return field

    def _make_field(self, instance: serializers.Serializer,
            source_name: str, field_name: str) -> serializers.ModelField:
        return self._sanitize_field(self._get_field(instance, source_name, field_name,
            expected_field_names=self._EXPECTED_TARGET_FIELDS))

    def _make_resulting_serializer(self, auto_schema, direction,
            instance: serializers.Serializer) -> Type[serializers.Serializer]:
        raise NotImplementedError

    def map_serializer(self, auto_schema, direction):
        assert issubclass(self.target_class, serializers.ModelSerializer)

        instance = self.target
        assert isinstance(instance, serializers.ModelSerializer)

        new_type = self._make_resulting_serializer(auto_schema=auto_schema,
            direction=direction, instance=instance)

        return auto_schema._map_serializer(
            _copy_serializer(instance, _new_type=new_type, context={'view': auto_schema.view}),
            direction, bypass_extensions=False)

class DataSerializerExtension(_FieldReplacerExtension):
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

    _EXPECTED_TARGET_FIELDS = {'file'}

    def _make_resulting_serializer(self, auto_schema, direction, instance):
        class _Override(self.target_class): # pylint: disable=inherit-non-class
            client_files = serializers.ListField(
                child=self._make_field(instance, 'client_files', 'file'), default=[])
            server_files = serializers.ListField(
                child=self._make_field(instance, 'server_files', 'file'), default=[])
            remote_files = serializers.ListField(
                child=self._make_field(instance, 'remote_files', 'file'), default=[])

        return _Override

class ManifestSerializerExtension(OpenApiSerializerExtension):
    # ManifestSerializer mimics a string
    # By default, it is mapped to an object with a filename field, but it is used as a string
    # This class changes the result to be a simple string

    target_class = 'cvat.apps.engine.serializers.ManifestSerializer'

    def map_serializer(self, auto_schema, direction):
        assert issubclass(self.target_class, serializers.ModelSerializer)

        instance = self.target
        assert isinstance(instance, serializers.ModelSerializer)

        assert instance.fields.keys() == {'filename'}
        return build_basic_type(OpenApiTypes.STR)

class WriteOnceSerializerExtension(OpenApiSerializerExtension):
    """
    Enables support for cvat.apps.engine.serializers.WriteOnceMixin in drf-spectacular.
    Doesn't block other extensions on the target serializer.
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
        return auto_schema._map_serializer(
            _copy_serializer(self.target, context={
                'view': auto_schema.view,
                self._PROCESSED_INDICATOR_NAME: True
            }),
            direction, bypass_extensions=False)

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


__all__ = [] # No public symbols here
