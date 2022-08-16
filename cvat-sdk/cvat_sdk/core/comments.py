# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.model_proxy import (
    Entity,
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelProxy,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    Repo,
)


class _CommentProxy(ModelProxy[models.CommentRead, apis.CommentsApi]):
    _api_member_name = "comments_api"


class Comment(models.ICommentRead, _CommentProxy, Entity, ModelUpdateMixin, ModelDeleteMixin):
    _model_partial_update_arg = "patched_comment_write_request"


class CommentsRepo(
    _CommentProxy,
    Repo,
    ModelListMixin[Comment],
    ModelCreateMixin[Comment],
    ModelRetrieveMixin[Comment],
):
    _entity_type = Comment
