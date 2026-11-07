# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Published CVAT website posts for the shared announcement feed."""

import hashlib
import json
import logging
import re
import time
from datetime import timezone
from urllib.parse import urlsplit

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils.timezone import now

from cvat.utils.http import make_requests_session

from .updates import (
    ANNOUNCEMENT_LIMIT,
    MAX_DOCUMENT_SIZE,
    STALE_TTL,
    UpdatesUnavailable,
    edition,
    publication_date,
)

logger = logging.getLogger(__name__)
CACHE_TTL = 300
PRODUCTS = {
    "community": "69d73497c223a41cd7b1efdb",
    "enterprise": "69d734905c273eb0aecb2d5e",
    "saas": "69d7348368ce8d13484259cb",
}
CATEGORIES = {
    "86ba4f5204a1d6a801c7bf52aea0a4a3": "Monthly Digest",
    "81334b7b89e0f26fcb6c0909b1d6bf0c": "Feature Highlight",
}


def _preview(item, product):
    if item.get("isArchived") or item.get("isDraft"):
        return None
    fields = item["fieldData"]
    if product not in (fields.get("available-in-products") or []):
        return None
    # Editorial publication date stays stable when Webflow republishes the site.
    published = publication_date(fields.get("date-created"))
    if published > now():
        return None
    identifier, slug = item["id"], fields["slug"]
    if not re.fullmatch(r"[a-f0-9]{24}", identifier) or not re.fullmatch(r"[a-z0-9_-]+", slug):
        raise ValueError("Invalid Webflow item identity")
    title = fields.get("seo-title") or fields.get("name")
    description = fields.get("seo-description") or ""
    if not isinstance(title, str) or not title.strip() or not isinstance(description, str):
        raise ValueError("Invalid Webflow preview text")
    image = fields.get("thumbnail-image") or fields.get("main-image") or {}
    image_url = image.get("url", "")
    image_alt = image.get("alt") or title
    if not isinstance(image_alt, str):
        raise ValueError("Invalid Webflow image description")
    # Browser images come from Webflow's public HTTPS CDN, never the CMS API.
    parsed = urlsplit(image_url)
    if image_url and (
        parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password
    ):
        raise ValueError("Invalid Webflow preview image")
    return {
        "id": "webflow-" + identifier,
        "title": title.strip(),
        "description": description.strip(),
        "publishedAt": published.astimezone(timezone.utc).isoformat(),
        "url": "https://www.cvat.ai/resources/changelog/" + slug,
        "imageURL": image_url,
        "imageAlt": image_alt,
        "cta": "Read full post",
        "label": CATEGORIES.get(fields.get("changelog-category"), "Website update"),
        "popup": True,
        "editions": [
            name
            for name, identifier in PRODUCTS.items()
            if identifier in fields["available-in-products"]
        ],
    }


def previews(*, on_stale=None):
    token = settings.CVAT_UPDATES_WEBFLOW_TOKEN
    collection = settings.CVAT_UPDATES_WEBFLOW_COLLECTION
    if not token and not collection:
        return []
    if not token or not re.fullmatch(r"[a-f0-9]{24}", collection):
        raise UpdatesUnavailable("The website preview collection is not configured correctly.")
    product = PRODUCTS[edition()]
    key = (
        "cvat:webflow-previews:v2:"
        + hashlib.sha256((collection + product + token).encode()).hexdigest()
    )
    saved = cache.get(key)
    if saved and time.time() - saved["checked_at"] < CACHE_TTL:
        if saved.get("stale") and on_stale:
            on_stale()
        return saved["data"]
    lock_key = key + ":refresh"
    if not cache.add(lock_key, True, timeout=60):
        if saved:
            if on_stale:
                on_stale()
            return saved["data"]
        raise UpdatesUnavailable()
    try:
        result, malformed = [], False
        with make_requests_session() as session:
            session.headers["Authorization"] = "Bearer " + token
            # Sort by the authored date, not lastPublished (site-wide republishing
            # changes lastPublished for multiple old posts at once).
            for offset in range(0, 1000, 100):
                with session.get(
                    f"https://api-cdn.webflow.com/v2/collections/{collection}/items/live",
                    params={"limit": 100, "offset": offset, "sort[date-created]": "desc"},
                    timeout=(3, 5),
                    stream=True,
                    allow_redirects=False,
                ) as response:
                    if response.status_code != 200:
                        raise ValueError("Unexpected Webflow response")
                    chunks, size = [], 0
                    for chunk in response.iter_content(64 * 1024):
                        size += len(chunk)
                        if size > MAX_DOCUMENT_SIZE:
                            raise ValueError("Webflow response is too large")
                        chunks.append(chunk)
                    payload = json.loads(b"".join(chunks))
                items = payload["items"]
                if not isinstance(items, list):
                    raise ValueError("Invalid Webflow items")
                for item in items:
                    try:
                        preview = _preview(item, product)
                    except (ValueError, TypeError, KeyError, AttributeError):
                        logger.warning("Skipping a malformed website preview")
                        malformed = True
                        continue
                    if preview:
                        result.append(preview)
                        if len(result) >= ANNOUNCEMENT_LIMIT:
                            break
                if (
                    len(result) >= ANNOUNCEMENT_LIMIT
                    or offset + len(items) >= payload["pagination"]["total"]
                ):
                    break
        result = sorted(result, key=lambda item: (item["publishedAt"], item["id"]), reverse=True)[
            :ANNOUNCEMENT_LIMIT
        ]
        cache.set(
            key, {"data": result, "checked_at": time.time(), "stale": malformed}, timeout=STALE_TTL
        )
        if malformed and on_stale:
            on_stale()
        return result
    except (requests.RequestException, ValueError, TypeError, KeyError):
        logger.warning("Could not refresh website previews")
        if saved:
            saved["checked_at"] = time.time() - CACHE_TTL + 30
            saved["stale"] = True
            cache.set(key, saved, timeout=STALE_TTL)
            if on_stale:
                on_stale()
            return saved["data"]
        raise UpdatesUnavailable() from None
    finally:
        cache.delete(lock_key)
