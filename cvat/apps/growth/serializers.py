# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.utils.timezone import now
from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from cvat.apps.engine.serializers import BasicUserSerializer

from .models import UserGrowthData
from .policies import is_github_prompt_enabled, is_github_prompt_on_cooldown


class UserGrowthDataSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(source="user", read_only=True)
    github_prompt_shown = serializers.BooleanField(required=False)
    github_prompt_enabled = serializers.SerializerMethodField()

    class Meta:
        model = UserGrowthData
        fields = (
            "id",
            "owner",
            "github_prompt_shown",
            "github_prompt_support_clicked",
            "github_prompt_enabled",
            "promotion_notifications_allowed",
            "last_seen_release_notes_version",
            "last_seen_announcements_date",
        )
        read_only_fields = (
            "id",
            "owner",
            "github_prompt_enabled",
            "last_seen_release_notes_version",
            "last_seen_announcements_date",
        )

    def to_representation(self, instance: UserGrowthData) -> dict:
        representation = super().to_representation(instance)
        representation["github_prompt_shown"] = is_github_prompt_on_cooldown(instance)
        return representation

    def get_github_prompt_enabled(self, instance: UserGrowthData) -> bool:
        organization = self.context["request"].iam_context["organization"]
        return is_github_prompt_enabled(instance.user, organization, instance)

    def validate(self, attrs: dict) -> dict:
        for field in ("github_prompt_shown", "github_prompt_support_clicked"):
            if field in attrs and attrs[field] is not True:
                raise serializers.ValidationError({field: "This value can only be set to true."})
        return attrs

    def update(self, instance: UserGrowthData, validated_data: dict) -> UserGrowthData:
        shown = validated_data.pop("github_prompt_shown", False)
        support_clicked = validated_data.pop("github_prompt_support_clicked", False)
        update_fields = []

        if shown:
            instance.github_prompt_shown_at = now()
            update_fields.append("github_prompt_shown_at")
        if support_clicked and not instance.github_prompt_support_clicked:
            instance.github_prompt_support_clicked = True
            update_fields.append("github_prompt_support_clicked")
        if "promotion_notifications_allowed" in validated_data:
            instance.promotion_notifications_allowed = validated_data[
                "promotion_notifications_allowed"
            ]
            update_fields.append("promotion_notifications_allowed")

        if update_fields:
            instance.save(update_fields=update_fields)
        return instance


class UpdatesAcknowledgementSerializer(serializers.Serializer):
    release_version = serializers.RegexField(
        r"^[0-9]+\.[0-9]+\.[0-9]+$", required=False, max_length=64
    )
    announcements_seen_at = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Specify a release version or announcements timestamp."
            )
        return attrs


class UpdatesStateSerializer(serializers.Serializer):
    last_seen_release_notes_version = serializers.CharField(allow_null=True)
    last_seen_announcements_date = serializers.DateTimeField(allow_null=True)
    promotion_notifications_allowed = serializers.BooleanField()


@extend_schema_serializer(many=False)
class UpdatesIndexSerializer(serializers.Serializer):
    edition = serializers.ChoiceField(choices=("community", "enterprise", "saas"))
    state = UpdatesStateSerializer()
    releases = serializers.ListField(child=serializers.DictField())
    announcements = serializers.ListField(child=serializers.DictField())
    canAcknowledgeAnnouncements = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.CharField())
    releaseHistoryURL = serializers.URLField()
    announcementHistoryURL = serializers.URLField()
    updatesHistoryURL = serializers.URLField()


class UpdatesContentSerializer(serializers.Serializer):
    body = serializers.CharField()
    baseURL = serializers.URLField()
