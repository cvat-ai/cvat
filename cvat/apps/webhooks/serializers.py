# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers

from cvat.apps.engine.models import Project
from cvat.apps.engine.serializers import BasicUserSerializer, WriteOnceMixin

from .event_type import EventTypeChoice, ProjectEvents, OrganizationEvents
from .models import (
    Webhook,
    WebhookContentTypeChoice,
    WebhookTypeChoice,
    WebhookDelivery,
)


class EventTypeValidator:
    requires_context = True

    def get_webhook_type(self, attrs, serializer):
        if serializer.instance is not None:
            return serializer.instance.type
        return attrs.get("type")

    def __call__(self, attrs, serializer):
        if attrs.get("events") is not None:
            webhook_type = self.get_webhook_type(attrs, serializer)
            events = set(EventTypesSerializer().to_representation(attrs["events"]))
            if (
                webhook_type == WebhookTypeChoice.PROJECT
                and not events.issubset(set(ProjectEvents.events))
            ) or (
                webhook_type == WebhookTypeChoice.ORGANIZATION
                and not events.issubset(set(OrganizationEvents.events))
            ):
                raise serializers.ValidationError(
                    f"Invalid events list for {webhook_type} webhook"
                )


class EventTypesSerializer(serializers.MultipleChoiceField):
    def __init__(self, *args, **kwargs):
        super().__init__(choices=EventTypeChoice.choices(), *args, **kwargs)

    def to_representation(self, value):
        if isinstance(value, list):
            return sorted(super().to_representation(value))
        return sorted(list(super().to_representation(value.split(","))))

    def to_internal_value(self, data):
        return ",".join(super().to_internal_value(data))


class EventsSerializer(serializers.Serializer):
    webhook_type = serializers.ChoiceField(choices=WebhookTypeChoice.choices())
    events = EventTypesSerializer()


class WebhookReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(read_only=True, required=False, allow_null=True)

    events = EventTypesSerializer(read_only=True)

    project_id = serializers.IntegerField(required=False, allow_null=True)
    type = serializers.ChoiceField(choices=WebhookTypeChoice.choices())
    content_type = serializers.ChoiceField(choices=WebhookContentTypeChoice.choices())

    last_status = serializers.IntegerField(
        source="deliveries.last.status_code", read_only=True
    )

    last_delivery_date = serializers.DateTimeField(
        source="deliveries.last.updated_date", read_only=True
    )

    class Meta:
        model = Webhook
        fields = (
            "id",
            "url",
            "target_url",
            "description",
            "type",
            "content_type",
            "is_active",
            "enable_ssl",
            "created_date",
            "updated_date",
            "owner",
            "project_id",
            "organization",
            "events",
            "last_status",
            "last_delivery_date",
        )
        read_only_fields = fields
        extra_kwargs = {
            "organization": {"allow_null": True},
        }


class WebhookWriteSerializer(WriteOnceMixin, serializers.ModelSerializer):
    events = EventTypesSerializer(write_only=True)

    project_id = serializers.IntegerField(
        write_only=True, allow_null=True, required=False
    )

    def to_representation(self, instance):
        serializer = WebhookReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Webhook
        fields = (
            "target_url",
            "description",
            "type",
            "content_type",
            "secret",
            "is_active",
            "enable_ssl",
            "project_id",
            "events",
        )
        write_once_fields = ("type", "project_id")
        validators = [EventTypeValidator()]

    def create(self, validated_data):
        if (project_id := validated_data.get('project_id')) is not None:
            validated_data['organization'] = Project.objects.get(pk=project_id).organization

        db_webhook = Webhook.objects.create(**validated_data)
        return db_webhook


class WebhookDeliveryReadSerializer(serializers.ModelSerializer):
    webhook_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = WebhookDelivery
        fields = (
            "id",
            "webhook_id",
            "event",
            "status_code",
            "redelivery",
            "created_date",
            "updated_date",
            "changed_fields",
            "request",
            "response",
        )
        read_only_fields = fields
