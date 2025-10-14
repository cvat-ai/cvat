# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.db.models import QuerySet
from django.db.models.functions import Coalesce
from django.utils import timezone

from cvat.apps.api_tokens import models
from cvat.apps.dataset_manager.util import current_function_name
from cvat.apps.engine.log import ServerLogManager


def chunked_bulk_delete(queryset: QuerySet[models.ApiToken], *, chunk_size: int = 1000) -> int:
    total_deleted = 0

    while True:
        ids_to_delete = queryset.values_list("pk", flat=True)[:chunk_size]

        deleted, _ = queryset.model.objects.filter(pk__in=ids_to_delete).delete()
        if not deleted:
            break

        total_deleted += deleted

    return total_deleted


def clear_unusable_api_tokens():
    unusable_threshold_date = timezone.now() - settings.API_TOKEN_UNUSABLE_TOKEN_TTL

    deleted_expired_count = chunked_bulk_delete(
        models.ApiToken.objects.filter(expiry_date__lt=unusable_threshold_date)
    )

    deleted_revoked_count = chunked_bulk_delete(
        models.ApiToken.objects.filter(revoked=True, updated_date__lt=unusable_threshold_date)
    )

    deleted_stale_count = chunked_bulk_delete(
        models.ApiToken.objects.annotate(_last_used=Coalesce("last_used_date", "created")).filter(
            _last_used__lt=unusable_threshold_date - settings.API_TOKEN_STALE_PERIOD
        )
    )

    slogger = ServerLogManager(__name__ + "." + current_function_name())
    slogger.glob.info(
        f"Deleted expired: {deleted_expired_count}, "
        f"deleted revoked: {deleted_revoked_count}, "
        f"deleted stale: {deleted_stale_count}"
    )
