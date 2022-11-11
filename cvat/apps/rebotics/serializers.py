import requests
from io import BytesIO
from urllib.parse import urlparse

from rest_framework import serializers
from django.core.files import File

from cvat.rebotics.utils import fix_between
import exceptions


class BaseImportSerializer(serializers.Serializer):

    def create(self, **kwargs):
        raise NotImplementedError('Creating export data is not allowed')

    def update(self, instance, validated_data):
        raise NotImplementedError('Updating export data is not allowed')


class ImportResponseSerializer(BaseImportSerializer):
    id = ...        # image id in cvat.
    image = ...     # image link
    preview = ...   # preview link
    training = ...  # ?


class ImportAnnotationSerializer(BaseImportSerializer):
    lowerx = serializers.FloatField()
    lowery = serializers.FloatField()
    upperx = serializers.FloatField()
    uppery = serializers.FloatField()
    label = serializers.CharField(max_length=128)
    upc = serializers.CharField(max_length=128)
    points = serializers.CharField(max_length=255, required=False, allow_null=True)
    type = serializers.CharField(max_length=255, required=False, allow_null=True)

    # fix coordinates somewhere so they are not out of bounds.
    # fix_between(), etc.


class ImportPriceTagSerializer(ImportAnnotationSerializer):
    upc = serializers.CharField(max_length=128, allow_blank=True, allow_null=True, required=False)


class ImportSerializer(BaseImportSerializer):
    items = serializers.ListSerializer(child=ImportAnnotationSerializer())
    image = serializers.URLField()
    export_by = serializers.CharField(required=False, allow_null=True)
    planogram_title = serializers.CharField(required=False, allow_null=True)
    retailer_codename = serializers.CharField(required=False, allow_null=True)
    processing_action_id = serializers.IntegerField(required=False, allow_null=True)
    price_tags = serializers.ListSerializer(
        child=ImportPriceTagSerializer(),
        required=False,
        allow_null=True
    )

    # may need it.
    @staticmethod
    def __get_image_from_url(image_url):
        image_response = requests.get(image_url, verify=False)
        if image_response.status_code != requests.codes.ok:
            raise exceptions.ImportByAPIError('Getting image by URL error')
        img_tmp_file = BytesIO(image_response.content)
        img_tmp_name = urlparse(image_url).path.split('/')[-1]
        return File(img_tmp_file, img_tmp_name)
