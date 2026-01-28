# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.proxies.model_proxy import (
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    build_model_bases,
)

_OrganizationEntityBase, _OrganizationRepoBase = build_model_bases(
    models.OrganizationRead, apis.OrganizationsApi, api_member_name="organizations_api"
)


class Organization(
    models.IOrganizationRead,
    _OrganizationEntityBase,
    ModelUpdateMixin[models.IPatchedOrganizationWriteRequest],
    ModelDeleteMixin,
):
    _model_partial_update_arg = "patched_organization_write_request"


class OrganizationsRepo(
    _OrganizationRepoBase,
    ModelCreateMixin[Organization, models.IOrganizationWriteRequest],
    ModelListMixin[Organization],
    ModelRetrieveMixin[Organization],
):
    _entity_type = Organization
