from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from cvat.apps.organizations.models import Organization
from cvat.apps.engine.serializers import RqStatusSerializer


class _BaseImportSerializer(serializers.Serializer):

    def create(self, validated_data):
        raise NotImplementedError('Creating export data is not allowed')

    def update(self, instance, validated_data):
        raise NotImplementedError('Updating export data is not allowed')


class _ImportAnnotationSerializer(_BaseImportSerializer):
    lowerx = serializers.FloatField()
    lowery = serializers.FloatField()
    upperx = serializers.FloatField()
    uppery = serializers.FloatField()
    label = serializers.CharField(max_length=128)
    points = serializers.CharField(max_length=255, allow_null=True, default=None)
    type = serializers.CharField(max_length=255, allow_null=True, default=None)
    upc = serializers.CharField(max_length=128)


class _ImportPriceTagSerializer(_BaseImportSerializer):
    lowerx = serializers.FloatField(allow_null=True, default=None)
    lowery = serializers.FloatField(allow_null=True, default=None)
    upperx = serializers.FloatField(allow_null=True, default=None)
    uppery = serializers.FloatField(allow_null=True, default=None)
    label = serializers.CharField(max_length=128)
    points = serializers.CharField(max_length=255, allow_null=True, default=None)
    type = serializers.CharField(max_length=255, allow_null=True, default=None)
    upc = serializers.CharField(max_length=128, allow_blank=True, allow_null=True, default=None)


class _ImportImageSerializer(_BaseImportSerializer):
    items = serializers.ListSerializer(child=_ImportAnnotationSerializer())
    image = serializers.URLField(allow_null=True, default=None)
    planogram_title = serializers.CharField(allow_null=True, default=None)
    processing_action_id = serializers.IntegerField(allow_null=True, default=None)
    price_tags = serializers.ListSerializer(child=_ImportPriceTagSerializer(),
                                            default=None, allow_null=True)


class ImportSerializer(_BaseImportSerializer):
    image_quality = serializers.IntegerField(min_value=0, max_value=100, default=70)
    segment_size = serializers.IntegerField(min_value=0, default=0)
    workspace = serializers.CharField(max_length=16, allow_null=True, default=settings.IMPORT_WORKSPACE,
                                      help_text='Organization short name. Case sensitive.')
    export_by = serializers.CharField(allow_null=True, default=None)
    retailer_codename = serializers.CharField(allow_null=True, default=None)
    images = serializers.ListSerializer(child=_ImportImageSerializer())

    def validate_workspace(self, value):
        if value is None or Organization.objects.filter(slug=value).exists():
            return value
        raise ValidationError(f'Workspace "{value}" does not exist!')


class _ImportResponseImageSerializer(_BaseImportSerializer):
    id = serializers.IntegerField()
    image = serializers.URLField()


class ImportResponseSerializer(_BaseImportSerializer):
    task_id = serializers.IntegerField(allow_null=True, default=None)
    preview = serializers.URLField(allow_null=True, default=None)
    images = serializers.ListSerializer(child=_ImportResponseImageSerializer(),
                                        allow_null=True, default=None)
    status = RqStatusSerializer(allow_null=True, default=None)
