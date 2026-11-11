# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Callable
from enum import StrEnum
from typing import NotRequired, Protocol, TypedDict


class Edition(StrEnum):
    COMMUNITY = "community"
    ENTERPRISE = "enterprise"
    SAAS = "saas"


class ContentKind(StrEnum):
    RELEASE_NOTES = "release-notes"
    ANNOUNCEMENTS = "announcements"


class UpdateSource(StrEnum):
    RELEASE_NOTES = ContentKind.RELEASE_NOTES
    ANNOUNCEMENTS = ContentKind.ANNOUNCEMENTS
    EXTERNAL_ANNOUNCEMENTS = "external-announcements"


class AnnouncementSource(StrEnum):
    HUGO = "hugo"
    EXTERNAL = "external"


EDITIONS = tuple(Edition)
RELEASE_VERSION_PATTERN = r"^[0-9]+\.[0-9]+\.[0-9]+$"
OnStale = Callable[[], None]


class AnnouncementPreview(TypedDict):
    id: str
    title: str
    description: str
    publishedAt: str
    url: str
    editions: list[Edition]
    popup: bool
    imageURL: NotRequired[str]
    videoURL: NotRequired[str]
    imageAlt: NotRequired[str]
    cta: NotRequired[str]
    label: NotRequired[str]
    source: NotRequired[AnnouncementSource]
    markdownURL: NotRequired[str]


class AnnouncementProvider(Protocol):
    def __call__(
        self, *, edition: Edition, limit: int, on_stale: OnStale | None = None
    ) -> list[AnnouncementPreview]:
        """Return published edition-matching previews, newest first, up to limit.

        Keep IDs and timezone-aware publication timestamps stable across edits.
        Call on_stale for incomplete data; raise UpdatesUnavailable if no feed is usable.
        """
        ...
