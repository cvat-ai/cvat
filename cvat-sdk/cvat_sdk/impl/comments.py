# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk import apis, models
from cvat_sdk.impl.model_proxy import ModelCrudMixin, ModelProxy


class CommentProxy(
    models.ICommentRead,
    ModelProxy[models.ICommentRead, models.CommentRead, apis.CommentsApi],
    ModelCrudMixin,
):
    _api_member_name = "comments_api"
    _model_partial_update_arg = "patched_comment_write_request"
