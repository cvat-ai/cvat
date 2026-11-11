# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Runtime delivery of Hugo-authored content, shared across users and API workers."""

import hashlib
import json
import logging
import re
import time
from datetime import timezone
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

logger = logging.getLogger(__name__)
MAX_DOCUMENT_SIZE = 2 * 1024 * 1024
STALE_TTL = 7 * 24 * 60 * 60
KINDS = ("release-notes", "announcements")
EDITIONS = release_sections.EDITIONS
ANNOUNCEMENT_LIMIT = 5


class UpdatesUnavailable(APIException):
    status_code = 503
    default_detail = "What's New is temporarily unavailable."


def version_parts(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", value):
        raise ValueError("Expected a release version in X.Y.Z format")
    return tuple(int(part) for part in value.split("."))


def publication_date(value):
    parsed = parse_datetime(value) if isinstance(value, str) else None
    if parsed is None or parsed.tzinfo is None:
        raise ValueError("Expected a publication timestamp with a timezone")
    return parsed


def edition():
    value = settings.CVAT_UPDATES_EDITION
    if value not in EDITIONS:
        raise UpdatesUnavailable("The What's New edition is not configured correctly.")
    return value


def _base_url(public=False):
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


def _public_url(path):
    return urljoin(_base_url(public=True), path)


def _document(path, decode, *, on_stale=None):
    """Retain the last valid copy beyond its freshness window and revalidate it."""
    url = urljoin(_base_url(), path)
    # v5 derives release highlights from article headings rather than authored summaries.
    key = "cvat:updates:v5:" + hashlib.sha256((url + _base_url(public=True)).encode()).hexdigest()
    saved = cache.get(key)
    if saved and time.time() - saved["checked_at"] < max(0, settings.CVAT_UPDATES_CACHE_TTL):
        if saved.get("stale") and on_stale:
            on_stale()
        return saved["data"]

    # Redis cache.add prevents a burst of page loads from fetching the same file.
    lock_key = key + ":refresh"
    if not cache.add(lock_key, True, timeout=20):
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
                url, headers=headers, timeout=(3, 5), stream=True, allow_redirects=False
            ) as response:
                if response.status_code == 304 and saved:
                    saved["checked_at"] = time.time()
                    saved.pop("stale", None)
                    cache.set(key, saved, timeout=STALE_TTL)
                    return saved["data"]
                if response.status_code != 200:
                    raise ValueError("Unexpected documentation response")
                chunks, size = [], 0
                for chunk in response.iter_content(64 * 1024):
                    size += len(chunk)
                    if size > MAX_DOCUMENT_SIZE:
                        raise ValueError("Documentation file is too large")
                    chunks.append(chunk)
                data = decode(b"".join(chunks).decode("utf-8"))
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
    except (requests.RequestException, ValueError, TypeError, KeyError):
        logger.warning("Could not refresh What's New document: %s", path)
        if saved:
            # Back off briefly without discarding the last valid document.
            saved["checked_at"] = time.time() - max(0, settings.CVAT_UPDATES_CACHE_TTL) + 30
            saved["stale"] = True
            cache.set(key, saved, timeout=STALE_TTL)
            if on_stale:
                on_stale()
            return saved["data"]
        raise UpdatesUnavailable() from None
    finally:
        cache.delete(lock_key)


def _content_path(value, kind):
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


def _preview_media(value):
    if not value:
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


def _index(body, kind):
    feed = json.loads(body)
    if (
        not isinstance(feed, dict)
        or feed.get("schemaVersion") != 1
        or not isinstance(feed.get("entries"), list)
    ):
        raise ValueError("Invalid index")
    entries, ids = [], set()
    for raw in feed["entries"]:
        if not isinstance(raw, dict):
            raise ValueError("Invalid entry")
        identifier = raw.get("version") if kind == "release-notes" else raw.get("id")
        if kind == "release-notes":
            version_parts(identifier)
        elif not isinstance(identifier, str) or not re.fullmatch(
            r"[a-z0-9][a-z0-9_-]{0,127}", identifier
        ):
            raise ValueError("Invalid announcement ID")
        if identifier in ids:
            raise ValueError("Duplicate content ID")
        ids.add(identifier)
        for field in ("title", "description"):
            if not isinstance(raw.get(field), str) or (field == "title" and not raw[field].strip()):
                raise ValueError("Invalid content metadata")
        published = publication_date(raw.get("publishedAt"))
        flag = "announce" if kind == "release-notes" else "popup"
        if not isinstance(raw.get(flag), bool):
            raise ValueError("Invalid presentation flag")
        path = _content_path(raw.get("markdownURL"), kind)
        entry = {
            "title": raw["title"],
            "description": raw["description"],
            "publishedAt": published.astimezone(timezone.utc).isoformat(),
            "markdownURL": _public_url(path),
            "contentPath": path,
            flag: raw[flag],
        }
        if kind == "release-notes":
            audiences = raw.get("editions", list(EDITIONS))
            sections = raw.get("hasEditionSections", False)
            if not isinstance(sections, bool):
                raise ValueError("Invalid release section metadata")
            highlights = raw.get("highlights", [])
            if not isinstance(highlights, list):
                raise ValueError("Invalid release highlights")
            for highlight in highlights:
                if (
                    not isinstance(highlight, dict)
                    or not isinstance(highlight.get("text"), str)
                    or not highlight["text"].strip()
                    or not isinstance(highlight.get("editions"), list)
                    or not highlight["editions"]
                    or any(value not in EDITIONS for value in highlight["editions"])
                ):
                    raise ValueError("Invalid release highlight")
            entry.update(
                version=identifier,
                url=_public_url(path.removesuffix("index.md")),
                editions=audiences,
                hasEditionSections=sections,
                highlights=highlights,
            )
        else:
            audiences = raw.get("editions")
            article = urlsplit(raw.get("url", ""))
            if (
                article.scheme not in ("https", "http")
                or not article.netloc
                or article.username
                or article.password
            ):
                raise ValueError("Invalid article URL")
            entry.update(id=identifier, url=article.geturl(), editions=audiences)
            cta = raw.get("cta", "Read announcement")
            image_alt = raw.get("imageAlt", raw["title"])
            if (
                not isinstance(cta, str)
                or not cta.strip()
                or len(cta) > 80
                or not isinstance(image_alt, str)
            ):
                raise ValueError("Invalid announcement preview")
            entry.update(
                imageURL=_preview_media(raw.get("imageURL", "")),
                videoURL=_preview_media(raw.get("videoURL", "")),
                imageAlt=image_alt,
                cta=cta,
            )
        if (
            not isinstance(audiences, list)
            or not audiences
            or any(not isinstance(value, str) or value not in EDITIONS for value in audiences)
            or len(set(audiences)) != len(audiences)
        ):
            raise ValueError("Expected a non-empty list of content editions")
        entries.append(entry)
    return entries


def entries(kind, *, on_stale=None):
    if kind not in KINDS:
        raise NotFound()
    data = _document(f"{kind}/index.json", lambda body: _index(body, kind), on_stale=on_stale)
    published = [item.copy() for item in data if publication_date(item["publishedAt"]) <= now()]
    current_edition = edition()
    published = [item for item in published if current_edition in item["editions"]]
    if kind == "release-notes":
        published = [item for item in published if version_parts(item["version"]) <= VERSION[:3]]
        for item in published:
            item["highlights"] = [
                highlight["text"]
                for highlight in item["highlights"]
                if current_edition in highlight["editions"]
            ] or [item["description"]]
        return sorted(published, key=lambda item: version_parts(item["version"]), reverse=True)
    return sorted(published, key=lambda item: publication_date(item["publishedAt"]), reverse=True)


def _article_key(value):
    parsed = urlsplit(value)
    # Tracking parameters, fragments, and a trailing slash do not make a new post.
    return parsed.netloc.lower(), parsed.path.rstrip("/")


def external_announcements(*, on_stale=None):
    """Load optional previews using the same fields as Hugo announcements.

    Providers receive the edition, preview limit, and a callback to report stale
    or incomplete data. They raise UpdatesUnavailable when no usable feed exists.
    IDs and timezone-aware publication timestamps must remain stable across edits.
    """
    provider = settings.CVAT_UPDATES_ANNOUNCEMENT_PROVIDER
    if provider is None:
        return []
    try:
        load = import_string(provider)
    except (ImportError, AttributeError):
        logger.error("Could not load the configured announcement provider")
        raise UpdatesUnavailable() from None
    return load(edition=edition(), limit=ANNOUNCEMENT_LIMIT, on_stale=on_stale)


def announcement_feed():
    """One edition-filtered batch and one watermark for all announcement sources."""

    merged, errors = {}, set()
    for source, load in (
        ("external-announcements", external_announcements),
        ("announcements", lambda **kwargs: entries("announcements", **kwargs)),
    ):
        try:
            items = load(on_stale=lambda: errors.add(source))
        except UpdatesUnavailable:
            errors.add(source)
            continue
        for item in items:
            item = {key: value for key, value in item.items() if key != "contentPath"}
            item["source"] = "hugo" if source == "announcements" else "external"
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


def state(growth_data):
    return {
        "last_seen_release_notes_version": growth_data.last_seen_release_notes_version,
        "last_seen_announcements_date": growth_data.last_seen_announcements_date,
        "promotion_notifications_allowed": growth_data.promotion_notifications_allowed,
    }


def index(growth_data):
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
            for item in entries("release-notes")
        ]
    except UpdatesUnavailable:
        result["errors"].append("release-notes")
    result["announcements"], announcement_errors = announcement_feed()
    result["errors"].extend(announcement_errors)
    # A partial feed must not advance a shared watermark past missing content.
    result["canAcknowledgeAnnouncements"] = not announcement_errors
    result["releaseHistoryURL"] = _public_url("release-notes/")
    result["announcementHistoryURL"] = _public_url("announcements/")
    result["updatesHistoryURL"] = _public_url("updates/")
    return result


def content(kind, identifier):
    key = "version" if kind == "release-notes" else "id"
    entry = next((entry for entry in entries(kind) if entry[key] == identifier), None)
    if not entry:
        raise NotFound("This content is not available.")

    def decode(body):
        if not body.strip() or re.search(r"<!doctype\s+html|<html[\s>]", body, re.IGNORECASE):
            raise ValueError("Expected Markdown")
        if kind == "release-notes" and entry["hasEditionSections"]:
            release_sections.validate(body)
        return body

    # Keep the shared source intact in the cache; filter only the response body.
    body = _document(entry["contentPath"], decode)
    if kind == "release-notes" and entry["hasEditionSections"]:
        body = release_sections.for_edition(body, edition())
        if body is None:
            raise NotFound("This release has no sections for the current edition.")
    return {"body": body, "baseURL": entry["markdownURL"]}
