from .event_type import EventTypeChoice
from .models import Webhook, WebhookContentTypeChoice, WebhookTypeChoice
from rest_framework import serializers
from cvat.apps.engine.serializers import BasicUserSerializer


class EventsSerializer(serializers.MultipleChoiceField):
    def __init__(self, *args, **kwargs):
        super().__init__(choices=EventTypeChoice.choices(), *args, **kwargs)

    def to_representation(self, value):
        return super().to_representation(value.split(","))

    def to_internal_value(self, data):
        return ",".join(super().to_internal_value(data))


class WebhookReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(read_only=True)

    events = EventsSerializer(read_only=True)

    type = serializers.ChoiceField(choices=WebhookTypeChoice.choices())
    content_type = serializers.ChoiceField(choices=WebhookContentTypeChoice.choices())

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if ret.get("type", "") == WebhookTypeChoice.ORGANIZATION.value:
            ret.pop(WebhookTypeChoice.ORGANIZATION.value)
        elif ret.get("type", "") == WebhookTypeChoice.PROJECT.value:
            ret.pop(WebhookTypeChoice.PROJECT.value)
        return ret

    class Meta:
        model = Webhook
        fields = [
            "id",
            "url",
            "type",
            "content_type",
            "is_active",
            "enable_ssl",
            "created_date",
            "updated_date",
            "owner",
            "project",
            "organization",
            "events",
        ]
        read_only_fields = fields


class WebhookWriteSerializer(serializers.ModelSerializer):
    events = EventsSerializer(write_only=True)

    # Q: should be owner_id required or not?
    owner_id = serializers.IntegerField(
        write_only=True, allow_null=True, required=False
    )

    # TO-DO: require one and only one not null field from these two
    organization_id = serializers.IntegerField(
        write_only=True, allow_null=True, required=False
    )
    project_id = serializers.IntegerField(
        write_only=True, allow_null=True, required=False
    )

    def to_representation(self, instance):
        serializer = WebhookReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Webhook
        fields = [
            "url",
            "type",
            "content_type",
            "secret",
            "is_active",
            "enable_ssl",
            "owner_id",
            "project_id",
            "organization_id",
            "events",
        ]

    def create(self, validated_data):
        db_webhook = Webhook.objects.create(**validated_data)
        return db_webhook
