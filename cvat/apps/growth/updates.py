# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Runtime delivery of Hugo-authored content, shared across users and API workers."""

import hashlib
import json
import logging
import re
import time
from collections.abc import Callable
from datetime import datetime, timezone
from http import HTTPStatus
from typing import Any, TypeVar, cast
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils.dateparse import parse_datetime
from django.utils.module_loading import import_string
from django.utils.timezone import now
from rest_framework.exceptions import APIException, NotFound

from cvat import VERSION
from cvat.utils.http import make_requests_session

from . import release_sections
from .models import UserGrowthData
from .sources import HTTP_TIMEOUT, STALE_TTL, read_response_text
from .types import (
    EDITIONS,
    RELEASE_VERSION_PATTERN,
    AnnouncementPreview,
    AnnouncementProvider,
    AnnouncementSource,
    ContentKind,
    Edition,
    OnStale,
    UpdateSource,
)

logger = logging.getLogger(__name__)
ANNOUNCEMENT_LIMIT = 5
REFRESH_LOCK_TTL = 20
RETRY_DELAY = 30
FEED_SCHEMA_VERSION = 1
MAX_CTA_LENGTH = 80
DocumentT = TypeVar("DocumentT")


class UpdatesUnavailable(APIException):
    status_code = HTTPStatus.SERVICE_UNAVAILABLE
    default_detail = "What's New is temporarily unavailable."


def version_parts(value: Any) -> tuple[int, ...]:
    if not isinstance(value, str) or not re.fullmatch(RELEASE_VERSION_PATTERN, value):
        raise ValueError("Expected a release version in X.Y.Z format")
    return tuple(int(part) for part in value.split("."))


def publication_date(value: Any) -> datetime:
    parsed = parse_datetime(value) if isinstance(value, str) else None
    if parsed is None or parsed.tzinfo is None:
        raise ValueError("Expected a publication timestamp with a timezone")
    return parsed


def edition() -> Edition:
    try:
        return Edition(settings.CVAT_UPDATES_EDITION)
    except ValueError:
        choices = ", ".join(EDITIONS)
        raise UpdatesUnavailable(f"CVAT_UPDATES_EDITION must be one of: {choices}.") from None


def _base_url(public: bool = False) -> str:
    value = settings.CVAT_UPDATES_PUBLIC_URL if public else settings.CVAT_UPDATES_SOURCE_URL
    parsed = urlsplit(value)
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.username
        or parsed.password
    ):
        raise UpdatesUnavailable("The documentation source is not configured correctly.")
    return value.rstrip("/") + "/"


def _public_url(path: str) -> str:
    return urljoin(_base_url(public=True), path)


def _document(
    path: str, decode: Callable[[str], DocumentT], *, on_stale: OnStale | None = None
) -> DocumentT:
    """Retain the last valid copy beyond its freshness window and revalidate it."""
    url = urljoin(_base_url(), path)
    key = "cvat:updates:" + hashlib.sha256((url + _base_url(public=True)).encode()).hexdigest()
    saved = cache.get(key)
    if saved and time.time() - saved["checked_at"] < max(0, settings.CVAT_UPDATES_CACHE_TTL):
        if saved.get("stale") and on_stale:
            on_stale()
        return saved["data"]

    # Concurrent readers can use the last valid copy while another worker refreshes it.
    lock_key = key + ":refresh"
    if not cache.add(lock_key, True, timeout=REFRESH_LOCK_TTL):
        if saved:
            if on_stale:
                on_stale()
            return saved["data"]
        raise UpdatesUnavailable()

    try:
        headers = {}
        if saved:
            if saved.get("etag"):
                headers["If-None-Match"] = saved["etag"]
            if saved.get("last_modified"):
                headers["If-Modified-Since"] = saved["last_modified"]
        with make_requests_session() as session:
            # Only configured sources are contacted. Redirects must not escape them.
            with session.get(
                url, headers=headers, timeout=HTTP_TIMEOUT, stream=True, allow_redirects=False
            ) as response:
                if response.status_code == HTTPStatus.NOT_MODIFIED and saved:
                    saved["checked_at"] = time.time()
                    saved.pop("stale", None)
                    cache.set(key, saved, timeout=STALE_TTL)
                    return saved["data"]
                if response.status_code != HTTPStatus.OK:
                    raise ValueError(f"Documentation source returned HTTP {response.status_code}")
                data = decode(read_response_text(response))
                cache.set(
                    key,
                    {
                        "data": data,
                        "checked_at": time.time(),
                        "etag": response.headers.get("ETag"),
                        "last_modified": response.headers.get("Last-Modified"),
                    },
                    timeout=STALE_TTL,
                )
                return data
    except (requests.RequestException, ValueError, TypeError, KeyError) as exc:
        reason = type(exc).__name__ if isinstance(exc, requests.RequestException) else str(exc)
        logger.warning("Could not refresh What's New document %s: %s", path, reason)
        if saved:
            # Back off briefly without discarding the last valid document.
            saved["checked_at"] = (
                time.time() - max(0, settings.CVAT_UPDATES_CACHE_TTL) + RETRY_DELAY
            )
            saved["stale"] = True
            cache.set(key, saved, timeout=STALE_TTL)
            if on_stale:
                on_stale()
            return saved["data"]
        raise UpdatesUnavailable() from None
    finally:
        cache.delete(lock_key)


def _content_path(value: Any, kind: ContentKind) -> str:
    """Map a published URL to a path below the configured documentation source."""
    if not isinstance(value, str):
        raise ValueError("Missing Markdown URL")
    public_base = urlsplit(_base_url(public=True))
    source_base = urlsplit(_base_url())
    parsed = urlsplit(urljoin(_base_url(public=True), value))
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Invalid Markdown URL")
    if (parsed.scheme, parsed.netloc) not in {
        (public_base.scheme, public_base.netloc),
        (source_base.scheme, source_base.netloc),
    }:
        raise ValueError("Markdown must belong to the configured source")
    base_path = public_base.path.rstrip("/") + "/"
    if not parsed.path.startswith(base_path):
        raise ValueError("Invalid Markdown path")
    path = parsed.path[len(base_path) :]
    if not re.fullmatch(rf"{kind}/[A-Za-z0-9_-][A-Za-z0-9._/-]*/index\.md", path):
        raise ValueError("Invalid Markdown path")
    if any(part in (".", "..") for part in path.split("/")):
        raise ValueError("Invalid Markdown path")
    return path


def _preview_media(value: Any) -> str:
    if value == "":
        return ""
    if not isinstance(value, str):
        raise ValueError("Invalid preview media URL")
    parsed = urlsplit(urljoin(_base_url(public=True), value))
    if (
        parsed.scheme not in ("https", "http")
        or not parsed.netloc
        or parsed.username
        or parsed.password
    ):
        raise ValueError("Invalid preview media URL")
    source = urlsplit(_base_url())
    public = urlsplit(_base_url(public=True))
    if (parsed.scheme, parsed.netloc) == (source.scheme, source.netloc):
        parsed = parsed._replace(scheme=public.scheme, netloc=public.netloc)
    elif parsed.scheme == "http" and (parsed.scheme, parsed.netloc) != (
        public.scheme,
        public.netloc,
    ):
        raise ValueError("External preview media requires HTTPS")
    return urlunsplit(parsed)


def _editions(value: Any) -> list[Edition]:
    if (
        not isinstance(value, list)
        or not value
        or any(not isinstance(item, str) or item not in EDITIONS for item in value)
        or len(set(value)) != len(value)
    ):
        raise ValueError("Expected a non-empty list of unique content editions")
    return [Edition(item) for item in value]


def _release_fields(raw: dict[str, Any]) -> dict[str, Any]:
    sections = raw["hasEditionSections"]
    if not isinstance(sections, bool):
        raise ValueError("Invalid release section metadata")
    highlights = raw["highlights"]
    if not isinstance(highlights, list):
        raise ValueError("Expected a list of release highlights")
    for highlight in highlights:
        if (
            not isinstance(highlight, dict)
            or not isinstance(highlight.get("text"), str)
            or not highlight["text"].strip()
        ):
            raise ValueError("Invalid release highlight")
        highlight["editions"] = _editions(highlight.get("editions"))
    return {
        "version": raw["version"],
        "hasEditionSections": sections,
        "highlights": highlights,
    }


def _announcement_fields(raw: dict[str, Any]) -> dict[str, str]:
    cta = raw.get("cta", "Read announcement")
    image_alt = raw.get("imageAlt", raw["title"])
    if (
        not isinstance(cta, str)
        or not cta.strip()
        or len(cta) > MAX_CTA_LENGTH
        or not isinstance(image_alt, str)
    ):
        raise ValueError("Invalid announcement preview")
    return {
        "id": raw["id"],
        "imageURL": _preview_media(raw.get("imageURL", "")),
        "videoURL": _preview_media(raw.get("videoURL", "")),
        "imageAlt": image_alt,
        "cta": cta,
    }


def _index(body: str, kind: ContentKind) -> list[dict[str, Any]]:
    feed = json.loads(body)
    if (
        not isinstance(feed, dict)
        or feed.get("schemaVersion") != FEED_SCHEMA_VERSION
        or not isinstance(feed.get("entries"), list)
    ):
        raise ValueError("Invalid updates index")
    entries = []
    identifiers = set()
    for raw in feed["entries"]:
        if not isinstance(raw, dict):
            raise ValueError("Invalid updates entry")
        match kind:
            case ContentKind.RELEASE_NOTES:
                identifier = raw["version"]
                version_parts(identifier)
                flag = "announce"
                fields = _release_fields(raw)
            case ContentKind.ANNOUNCEMENTS:
                identifier = raw["id"]
                if not isinstance(identifier, str) or not re.fullmatch(
                    r"[a-z0-9][a-z0-9_-]{0,127}", identifier
                ):
                    raise ValueError("Invalid announcement ID")
                flag = "popup"
                fields = _announcement_fields(raw)
            case _:
                raise AssertionError(f"Unexpected content kind: {kind}")
        if identifier in identifiers:
            raise ValueError("Duplicate content ID")
        identifiers.add(identifier)
        for field in ("title", "description"):
            if not isinstance(raw.get(field), str) or (field == "title" and not raw[field].strip()):
                raise ValueError("Invalid content metadata")
        if not isinstance(raw.get(flag), bool):
            raise ValueError("Invalid presentation flag")
        path = _content_path(raw.get("markdownURL"), kind)
        entries.append(
            {
                "title": raw["title"],
                "description": raw["description"],
                "publishedAt": publication_date(raw.get("publishedAt"))
                .astimezone(timezone.utc)
                .isoformat(),
                "markdownURL": _public_url(path),
                "url": _public_url(path.removesuffix("index.md")),
                "contentPath": path,
                "editions": _editions(raw["editions"]),
                flag: raw[flag],
                **fields,
            }
        )
    return entries


def entries(kind: ContentKind, *, on_stale: OnStale | None = None) -> list[dict[str, Any]]:
    data = _document(f"{kind}/index.json", lambda body: _index(body, kind), on_stale=on_stale)
    published = [item.copy() for item in data if publication_date(item["publishedAt"]) <= now()]
    current_edition = edition()
    published = [item for item in published if current_edition in item["editions"]]
    if kind == ContentKind.RELEASE_NOTES:
        published = [item for item in published if version_parts(item["version"]) <= VERSION[:3]]
        for item in published:
            item["highlights"] = [
                highlight["text"]
                for highlight in item["highlights"]
                if current_edition in highlight["editions"]
            ] or [item["description"]]
        return sorted(published, key=lambda item: version_parts(item["version"]), reverse=True)
    match kind:
        case ContentKind.ANNOUNCEMENTS:
            return sorted(
                published, key=lambda item: publication_date(item["publishedAt"]), reverse=True
            )
        case _:
            raise AssertionError(f"Unexpected content kind: {kind}")


def _article_key(value: str) -> tuple[str, str]:
    parsed = urlsplit(value)
    # Tracking parameters, fragments, and a trailing slash do not make a new post.
    return parsed.netloc.lower(), parsed.path.rstrip("/")


def external_announcements(*, on_stale: OnStale | None = None) -> list[AnnouncementPreview]:
    """Load optional previews using the same fields as Hugo announcements.

    The callable must implement AnnouncementProvider. An unconfigured provider
    contributes no previews; an unavailable provider raises UpdatesUnavailable.
    """
    provider = settings.CVAT_UPDATES_ANNOUNCEMENT_PROVIDER
    if provider is None:
        return []
    try:
        load = cast(AnnouncementProvider, import_string(provider))
    except (ImportError, AttributeError):
        logger.error("Could not load the configured announcement provider")
        raise UpdatesUnavailable() from None
    return load(edition=edition(), limit=ANNOUNCEMENT_LIMIT, on_stale=on_stale)


def announcement_feed() -> tuple[list[AnnouncementPreview], list[UpdateSource]]:
    """One edition-filtered batch and one watermark for all announcement sources."""

    merged: dict[tuple[str, str], AnnouncementPreview] = {}
    errors: set[UpdateSource] = set()
    for source, load in (
        (UpdateSource.EXTERNAL_ANNOUNCEMENTS, external_announcements),
        (UpdateSource.ANNOUNCEMENTS, lambda **kwargs: entries(ContentKind.ANNOUNCEMENTS, **kwargs)),
    ):
        try:
            items = load(on_stale=lambda: errors.add(source))
        except UpdatesUnavailable:
            errors.add(source)
            continue
        for item in items:
            item = {key: value for key, value in item.items() if key != "contentPath"}
            item["source"] = (
                AnnouncementSource.HUGO
                if source == UpdateSource.ANNOUNCEMENTS
                else AnnouncementSource.EXTERNAL
            )
            key = _article_key(item["url"])
            previous = merged.get(key)
            if previous:
                # Hugo controls the copy if the same article is also authored there.
                # Keep the newest date and either source's automatic-popup eligibility.
                item["publishedAt"] = max(
                    (previous["publishedAt"], item["publishedAt"]),
                    key=publication_date,
                )
                item["popup"] = previous["popup"] or item["popup"]
            merged[key] = item
    items = sorted(
        merged.values(),
        key=lambda item: (publication_date(item["publishedAt"]), item["id"]),
        reverse=True,
    )[:ANNOUNCEMENT_LIMIT]
    return items, sorted(errors)


def state(growth_data: UserGrowthData) -> dict[str, Any]:
    return {
        "last_seen_release_notes_version": growth_data.last_seen_release_notes_version,
        "last_seen_announcements_date": growth_data.last_seen_announcements_date,
        "promotion_notifications_allowed": growth_data.promotion_notifications_allowed,
    }


def index(growth_data: UserGrowthData) -> dict[str, Any]:
    result = {
        "edition": edition(),
        "state": state(growth_data),
        "errors": [],
        "releases": [],
        "announcements": [],
    }
    try:
        result["releases"] = [
            {key: value for key, value in item.items() if key != "contentPath"}
            for item in entries(ContentKind.RELEASE_NOTES)
        ]
    except UpdatesUnavailable:
        result["errors"].append(UpdateSource.RELEASE_NOTES)
    result["announcements"], announcement_errors = announcement_feed()
    result["errors"].extend(announcement_errors)
    # A partial feed must not advance a shared watermark past missing content.
    result["canAcknowledgeAnnouncements"] = not announcement_errors
    result["releaseHistoryURL"] = _public_url("release-notes/")
    result["announcementHistoryURL"] = _public_url("announcements/")
    result["updatesHistoryURL"] = _public_url("updates/")
    return result


def content(kind: ContentKind, identifier: str) -> dict[str, str]:
    match kind:
        case ContentKind.RELEASE_NOTES:
            key = "version"
        case ContentKind.ANNOUNCEMENTS:
            key = "id"
        case _:
            raise AssertionError(f"Unexpected content kind: {kind}")
    entry = next((entry for entry in entries(kind) if entry[key] == identifier), None)
    if not entry:
        raise NotFound("This content is not available.")

    def decode(body):
        if not body.strip() or re.search(r"<!doctype\s+html|<html[\s>]", body, re.IGNORECASE):
            raise ValueError("Expected Markdown")
        if kind == ContentKind.RELEASE_NOTES and entry["hasEditionSections"]:
            release_sections.validate(body)
        return body

    # Keep the shared source intact in the cache; filter only the response body.
    body = _document(entry["contentPath"], decode)
    if kind == ContentKind.RELEASE_NOTES and entry["hasEditionSections"]:
        body = release_sections.for_edition(body, edition())
        if body is None:
            raise NotFound("This release has no sections for the current edition.")
    return {"body": body, "baseURL": entry["markdownURL"]}
