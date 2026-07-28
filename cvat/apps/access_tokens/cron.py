# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.db.models import QuerySet
from django.db.models.functions import Coalesce
from django.utils import timezone

from cvat.apps.access_tokens import models
from cvat.apps.dataset_manager.util import current_function_name
from cvat.apps.engine.log import ServerLogManager


def chunked_bulk_delete(queryset: QuerySet[models.AccessToken], *, chunk_size: int = 1000) -> int:
    total_deleted = 0

    while True:
        ids_to_delete = queryset.values_list("pk", flat=True)[:chunk_size]

        deleted, _ = queryset.model.objects.filter(pk__in=ids_to_delete).delete()
        if not deleted:
            break

        total_deleted += deleted

    return total_deleted


def clear_unusable_access_tokens():
    unusable_threshold_date = timezone.now() - settings.ACCESS_TOKEN_UNUSABLE_TOKEN_TTL

    deleted_expired_count = chunked_bulk_delete(
        models.AccessToken.objects.filter(expiry_date__lt=unusable_threshold_date)
    )

    deleted_revoked_count = chunked_bulk_delete(
        models.AccessToken.objects.filter(revoked=True, updated_date__lt=unusable_threshold_date)
    )

    deleted_stale_count = chunked_bulk_delete(
        models.AccessToken.objects.annotate(
            _last_used=Coalesce("last_used_date", "created")
        ).filter(_last_used__lt=unusable_threshold_date - settings.ACCESS_TOKEN_STALE_PERIOD)
    )

    slogger = ServerLogManager(__name__ + "." + current_function_name())
    slogger.glob.info(
        f"Deleted expired tokens: {deleted_expired_count}, "
        f"deleted revoked tokens: {deleted_revoked_count}, "
        f"deleted stale tokens: {deleted_stale_count}"
    )
