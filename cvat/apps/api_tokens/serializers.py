# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from rest_framework import serializers

from . import models


class ApiTokenReadSerializer(serializers.ModelSerializer):
    value = serializers.CharField(
        source="raw_token",
        required=False,
        help_text="The raw value of the token. Must be saved by the user, shown only once",
    )

    class Meta:
        model = models.ApiToken
        fields = (
            "id",
            "name",
            "created_date",
            "updated_date",
            "expiry_date",
            "last_used_date",
            "read_only",
            "owner",
            "value",
        )

        extra_kwargs = {
            "created_date": {"source": "created", "read_only": True},
            "owner": {"source": "owner_id", "read_only": True},
        }


class ApiTokenWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ApiToken
        fields = (
            "name",
            "expiry_date",
            "read_only",
        )

        extra_kwargs = {
            "name": {"required": True, "allow_blank": False},
            "expiry_date": {"allow_null": True},
        }

    def to_representation(self, instance):
        return ApiTokenReadSerializer().to_representation(instance)

    def create(self, validated_data: dict[str, Any]) -> models.ApiToken:
        instance, raw_token = models.ApiToken.objects.create_key(
            **validated_data, owner=self.context["request"].user
        )
        instance.raw_token = raw_token
        return instance
