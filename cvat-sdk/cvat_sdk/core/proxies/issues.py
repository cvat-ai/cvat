# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.helpers import get_paginated_collection
from cvat_sdk.core.proxies.model_proxy import (
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    build_model_bases,
)

_CommentEntityBase, _CommentRepoBase = build_model_bases(
    models.CommentRead, apis.CommentsApi, api_member_name="comments_api"
)


class Comment(
    models.ICommentRead,
    _CommentEntityBase,
    ModelUpdateMixin[models.IPatchedCommentWriteRequest],
    ModelDeleteMixin,
):
    _model_partial_update_arg = "patched_comment_write_request"


class CommentsRepo(
    _CommentRepoBase,
    ModelListMixin[Comment],
    ModelCreateMixin[Comment, models.ICommentWriteRequest],
    ModelRetrieveMixin[Comment],
):
    _entity_type = Comment


_IssueEntityBase, _IssueRepoBase = build_model_bases(
    models.IssueRead, apis.IssuesApi, api_member_name="issues_api"
)


class Issue(
    models.IIssueRead,
    _IssueEntityBase,
    ModelUpdateMixin[models.IPatchedIssueWriteRequest],
    ModelDeleteMixin,
):
    _model_partial_update_arg = "patched_issue_write_request"

    def get_comments(self) -> list[Comment]:
        # IssueRead does not expose `organization`, so we have to look it up
        # via the parent job. Without an explicit org context the comments
        # endpoint returns an empty list rather than raising — see
        # test_org_maintainer_can_get_issue_comments_without_explicit_org_context.
        return [
            Comment(self._client, m)
            for m in get_paginated_collection(
                self._client.api_client.comments_api.list_endpoint,
                org_id=self._client.jobs.retrieve(self.job).organization,
                issue_id=self.id,
            )
        ]


class IssuesRepo(
    _IssueRepoBase,
    ModelListMixin[Issue],
    ModelCreateMixin[Issue, models.IIssueWriteRequest],
    ModelRetrieveMixin[Issue],
):
    _entity_type = Issue
