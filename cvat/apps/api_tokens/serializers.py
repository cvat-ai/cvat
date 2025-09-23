# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import textwrap
from typing import Any

from rest_framework import serializers

from cvat.apps.engine.serializers import BasicUserSerializer

from . import models


class ApiTokenReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(required=False)

    value = serializers.CharField(
        source="raw_token",
        required=False,
        help_text="The raw value of the token. Must be saved by the user, returned only once",
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
            "created_date": {"source": "created"},
            "expiry_date": {"help_text": "Once API token expires, clients cannot use it anymore."},
            "name": {"help_text": "A free-form name for the API token."},
            "last_used_date": {
                "help_text": textwrap.dedent(
                    """\
                    The last use date of the token. This field is NOT updated after each
                    user request. The minimum expected resolution should be 1 day.
                    """
                )
            },
        }

        read_only_fields = fields


class ApiTokenWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ApiToken
        fields = (
            "name",
            "expiry_date",
            "read_only",
        )

        extra_kwargs = {
            "name": {
                "required": True,
                "allow_blank": False,
                "help_text": "A free-form name for the API token. Doesn't have to be unique",
            },
            "expiry_date": {
                "allow_null": True,
                "help_text": textwrap.dedent(
                    """\
                    Once API token expires, clients cannot use it anymore.
                    If not set, the token will not expire.
                """
                ),
            },
        }

    def to_representation(self, instance):
        return ApiTokenReadSerializer(context=self.context).to_representation(instance)

    def create(self, validated_data: dict[str, Any]) -> models.ApiToken:
        instance, raw_token = models.ApiToken.objects.create_key(
            **validated_data, owner=self.context["request"].user
        )
        instance.raw_token = raw_token
        return instance
