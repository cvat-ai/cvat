# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime
from typing import Any

from django.utils.timezone import now
from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from cvat.apps.engine.serializers import BasicUserSerializer

from .models import UserGrowthData
from .policies import is_github_prompt_enabled, is_github_prompt_on_cooldown
from .types import (
    EDITION_PATTERN,
    RELEASE_VERSION_PATTERN,
    AnnouncementSource,
)


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
    release_version = serializers.RegexField(RELEASE_VERSION_PATTERN, required=False, max_length=64)
    announcements_seen_at = serializers.DateTimeField(required=False)

    def validate_announcements_seen_at(self, value: datetime) -> datetime:
        if value > now():
            raise serializers.ValidationError("This timestamp cannot be in the future.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "Specify a release version or announcements timestamp."
            )
        return attrs


class UpdatesStateSerializer(serializers.Serializer):
    last_seen_release_notes_version = serializers.CharField(allow_blank=True)
    last_seen_announcements_date = serializers.DateTimeField(allow_null=True)
    promotion_notifications_allowed = serializers.BooleanField()


class ReleaseNoteSerializer(serializers.Serializer):
    version = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    published_at = serializers.DateTimeField(source="publishedAt")
    announce = serializers.BooleanField()
    editions = serializers.ListField(child=serializers.RegexField(EDITION_PATTERN))
    url = serializers.URLField()
    markdown_url = serializers.URLField(source="markdownURL")
    has_edition_sections = serializers.BooleanField(source="hasEditionSections")
    highlights = serializers.ListField(child=serializers.CharField(allow_blank=True))


class AnnouncementPreviewSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    published_at = serializers.DateTimeField(source="publishedAt")
    announce = serializers.BooleanField()
    editions = serializers.ListField(child=serializers.RegexField(EDITION_PATTERN))
    url = serializers.URLField()
    source = serializers.ChoiceField(choices=AnnouncementSource)
    image_url = serializers.URLField(source="imageURL", required=False, allow_blank=True)
    video_url = serializers.URLField(source="videoURL", required=False, allow_blank=True)
    image_alt = serializers.CharField(source="imageAlt", required=False, allow_blank=True)
    cta = serializers.CharField(
        required=False,
        help_text="Call-to-action button label for opening the announcement URL.",
    )
    label = serializers.CharField(required=False)
    markdown_url = serializers.URLField(source="markdownURL", required=False)


@extend_schema_serializer(many=False)
class UpdatesSummarySerializer(serializers.Serializer):
    edition = serializers.RegexField(EDITION_PATTERN)
    state = UpdatesStateSerializer()
    latest_release = ReleaseNoteSerializer(allow_null=True)
    latest_announced_release = ReleaseNoteSerializer(allow_null=True)
    announcements = AnnouncementPreviewSerializer(many=True)
    unavailable_sources = serializers.ListField(
        child=serializers.ChoiceField(choices=AnnouncementSource),
        help_text="Sources that could not be refreshed; their content may be missing or stale.",
    )
    release_history_url = serializers.URLField(source="releaseHistoryURL")
    announcement_history_url = serializers.URLField(source="announcementHistoryURL")
    updates_history_url = serializers.URLField(source="updatesHistoryURL")
