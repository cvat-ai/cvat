# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from rest_framework import serializers

from . import models


class ApiTokenReadSerializer(serializers.ModelSerializer):
    created_date = serializers.DateTimeField(source="created", read_only=True)
    owner = serializers.IntegerField(source="user.id", read_only=True)
    value = serializers.CharField(source="raw_token", required=False)

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


class ApiTokenWriteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True, allow_blank=False)
    expiry_date = serializers.DateTimeField(required=False, allow_null=True)
    read_only = serializers.BooleanField(required=False)

    class Meta:
        model = models.ApiToken
        fields = (
            "name",
            "expiry_date",
            "read_only",
        )

    def to_representation(self, instance):
        return ApiTokenReadSerializer().to_representation(instance)

    def create(self, validated_data: dict[str, Any]) -> models.ApiToken:
        instance, raw_token = models.ApiToken.objects.create_key(
            **validated_data, user=self.context["request"].user
        )
        instance.raw_token = raw_token
        return instance
