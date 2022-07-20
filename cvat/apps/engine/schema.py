# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from drf_spectacular.extensions import OpenApiSerializerExtension
from drf_spectacular.plumbing import force_instance
from drf_spectacular.serializers import PolymorphicProxySerializerExtension


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
        assert isinstance(self.target_class, type)

        instance = force_instance(self.target_class)
        assert isinstance(instance, serializers.ModelSerializer)

        def _get_field(instance, source_name, field_name):
            child_instance = force_instance(instance.fields[source_name].child)
            child_fields = child_instance.fields
            assert child_fields.keys() == {'file'} # protect from changes
            return child_fields[field_name]

        def _sanitize_field(field):
            field.source = None
            field.source_attrs = []
            return field

        def _make_field(source_name, field_name):
            return _sanitize_field(_get_field(instance, source_name, field_name))

        class _Override(self.target_class): # pylint: disable=inherit-non-class
            client_files = serializers.ListField(child=_make_field('client_files', 'file'), default=[])
            server_files = serializers.ListField(child=_make_field('server_files', 'file'), default=[])
            remote_files = serializers.ListField(child=_make_field('remote_files', 'file'), default=[])

        return auto_schema._map_serializer(_Override(), direction, bypass_extensions=False)

class CustomProxySerializerExtension(PolymorphicProxySerializerExtension):
    """
    Allows to patch PolymorphicProxySerializer-based schema.

    Override "target_component" in children classes.
    """
    priority = 0 # restore normal priority

    target_component: str = ''

    @classmethod
    def _matches(cls, target) -> bool:
        if cls == __class__:
            return False

        if not super()._matches(target):
            return False

        return target.component_name == cls.target_component

class AnyOfProxySerializerExtension(CustomProxySerializerExtension):
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
