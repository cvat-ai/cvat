import requests
from io import BytesIO
from urllib.parse import urlparse

from rest_framework import serializers
from django.core.files import File

from cvat.rebotics.utils import fix_between
import exceptions


# TODO: replace models to cvat models.

class DetectionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.DetectionImage
        fields = [
            'id',
            'image',
            'preview',
            'training',
        ]


class DetectionAnnotationImportSerializer(serializers.Serializer):
    """Supporting serializer, used by DetectionImageImportSerializer to implement datastructure of annotation"""

    lowerx = serializers.FloatField()
    lowery = serializers.FloatField()
    upperx = serializers.FloatField()
    uppery = serializers.FloatField()
    label = serializers.CharField(max_length=128)
    upc = serializers.CharField(max_length=128)
    points = serializers.CharField(max_length=255, required=False, allow_null=True)
    type = serializers.CharField(max_length=255, required=False, allow_null=True)

    def update(self, instance, validated_data):
        raise NotImplementedError('Updating export data is not allowed')

    def create(self, **kwargs):
        raise NotImplementedError('Creating export data is not allowed')


class DetectionAnnotationImportPriceTagSerializer(DetectionAnnotationImportSerializer):
    upc = serializers.CharField(max_length=128, allow_blank=True, allow_null=True, required=False)


class DetectionImageImportSerializer(serializers.Serializer):
    """Serializer, used to accept data from retailer instances"""

    items = serializers.ListSerializer(child=DetectionAnnotationImportSerializer())
    image = serializers.URLField()
    export_by = serializers.CharField(required=False, allow_null=True)
    planogram_title = serializers.CharField(required=False, allow_null=True)
    retailer_codename = serializers.CharField(required=False, allow_null=True)
    processing_action_id = serializers.IntegerField(required=False, allow_null=True)
    price_tags = serializers.ListSerializer(
        child=DetectionAnnotationImportPriceTagSerializer(),
        required=False,
        allow_null=True
    )

    def create(self, validated_data):
        detection_image = models.DetectionImage.objects.create(
            image=self.__get_image_from_url(validated_data['image']),
            exported_by=validated_data.get('export_by'),
            planogram_title=validated_data.get('planogram_title'),
            retailer=validated_data.get('retailer_codename'),
            scan_id=validated_data.get('processing_action_id')
        )

        width = detection_image.image.width
        height = detection_image.image.height

        items_to_create = []
        for item in validated_data['items']:
            points = item.get('points')
            item_type = item.get('type', RECTANGLE)
            label, created = models.DetectionClass.objects.get_or_create(code=item['upc'])

            if not label.title or label.title != item['label']:
                label.title = item['label']
                label.save()

            items_to_create.append(models.DetectionAnnotation(
                image=detection_image,
                detection_class=label,
                lowerx=fix_between(item['lowerx'], 0, width),
                lowery=fix_between(item['lowery'], 0, height),
                upperx=fix_between(item['upperx'], 0, width),
                uppery=fix_between(item['uppery'], 0, height),
                points=points,
                type=item_type
            ))

        price_tag_items = validated_data.get('price_tags', [])
        price_tag_label, created = models.DetectionClass.objects.get_or_create(code='All PRICE TAGS')
        if not price_tag_label.title:
            price_tag_label.title = 'All PRICE TAGS'
            price_tag_label.save()

        for price_tag in price_tag_items:
            lowerx = fix_between(price_tag['lowerx'], 0, width)
            lowery = fix_between(price_tag['lowery'], 0, height)
            upperx = fix_between(price_tag['upperx'], 0, width)
            uppery = fix_between(price_tag['uppery'], 0, height)

            items_to_create.append(models.DetectionAnnotation(
                image=detection_image,
                detection_class=price_tag_label,
                lowerx=lowerx,
                lowery=lowery,
                upperx=upperx,
                uppery=uppery
            ))

        models.DetectionAnnotation.objects.bulk_create(items_to_create)

        return detection_image

    def update(self, instance, validated_data):
        raise NotImplementedError('Updating export data is not allowed')

    @staticmethod
    def __get_image_from_url(image_url):
        image_response = requests.get(image_url, verify=False)
        if image_response.status_code != requests.codes.ok:
            raise exceptions.ImportByAPIError('Getting image by URL error')
        img_tmp_file = BytesIO(image_response.content)
        img_tmp_name = urlparse(image_url).path.split('/')[-1]
        return File(img_tmp_file, img_tmp_name)
