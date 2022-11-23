from rest_framework import serializers
from cvat.apps.engine.models import Data, RemoteFile


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
    upc = serializers.CharField(max_length=128)
    points = serializers.CharField(max_length=255, required=False, allow_null=True)
    type = serializers.CharField(max_length=255, required=False, allow_null=True)


class _ImportPriceTagSerializer(_ImportAnnotationSerializer):
    upc = serializers.CharField(max_length=128, allow_blank=True, allow_null=True, required=False)


class ImportImageSerializer(_BaseImportSerializer):
    items = serializers.ListSerializer(child=_ImportAnnotationSerializer())
    image = serializers.URLField()
    export_by = serializers.CharField(required=False, allow_null=True)
    planogram_title = serializers.CharField(required=False, allow_null=True)
    retailer_codename = serializers.CharField(required=False, allow_null=True)
    processing_action_id = serializers.IntegerField(required=False, allow_null=True)
    price_tags = serializers.ListSerializer(
        child=_ImportPriceTagSerializer(),
        required=False,
        allow_null=True
    )


class ImportResponseSerializer(_BaseImportSerializer):
    id = serializers.IntegerField()
    image = serializers.URLField()
    preview = serializers.URLField()
