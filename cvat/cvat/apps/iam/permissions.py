# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import operator
from abc import ABCMeta, abstractmethod
from collections.abc import Sequence
from enum import Enum
from functools import cached_property
from pathlib import Path
from typing import TYPE_CHECKING, Any, TypeAlias, TypeVar

from attrs import define, field
from django.apps import AppConfig
from django.conf import settings
from django.db.models import Model, Q
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization
from cvat.utils.http import make_requests_session

from .utils import add_opa_rules_path

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet

    from cvat.apps.engine.types import ExtendedRequest


class StrEnum(str, Enum):
    def __str__(self) -> str:
        return self.value


@define
class PermissionResult:
    allow: bool
    reasons: list[str] = field(factory=list)


def get_organization(request, obj):
    # Try to get organization from an object otherwise, return the organization that is specified in query parameters
    if isinstance(obj, Organization):
        return obj

    if obj:
        try:
            org_id = obj.organization_id
        except AttributeError as exc:
            # Skip initialization of organization for those objects that don't related with organization
            view = request.parser_context.get("view")
            if view and view.basename in settings.OBJECTS_NOT_RELATED_WITH_ORG:
                return request.iam_context["organization"]

            raise exc

        if not org_id:
            return None

        try:
            # If the object belongs to an organization transitively via the parent object
            # there might be no organization field, because it has to be defined and implemented
            # manually
            try:
                return obj.organization
            except AttributeError:
                return Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            return None

    return request.iam_context["organization"]


def get_membership(request, organization):
    if organization is None:
        return None

    return Membership.objects.filter(
        organization=organization, user=request.user, is_active=True
    ).first()


IamContext: TypeAlias = dict[str, Any]


def build_iam_context(
    request, organization: Organization | None, membership: Membership | None
) -> IamContext:
    return {
        "user_id": request.user.id,
        "group_name": request.iam_context["privilege"],
        "org_id": getattr(organization, "id", None),
        "org_slug": getattr(organization, "slug", None),
        "org_owner_id": organization.owner_id if organization else None,
        "org_role": getattr(membership, "role", None),
    }


def get_iam_context(request, obj) -> dict[str, Any]:
    organization = get_organization(request, obj)
    membership = get_membership(request, organization)

    return build_iam_context(request, organization, membership)


class OpenPolicyAgentPermission(metaclass=ABCMeta):
    url: str
    user_id: int
    group_name: str | None
    org_id: int | None
    org_owner_id: int | None
    org_role: str | None
    scope: str
    obj: Any | None

    @classmethod
    @abstractmethod
    def _get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Any) -> list:
        """Method to override to define scopes based on the request"""

    @classmethod
    def get_scopes(cls, request: ExtendedRequest, view: ViewSet, obj: Any):
        # rest_framework.viewsets.ViewSetMixin.initialize_request implementation
        if view.action is None:
            view.http_method_not_allowed(request)

        try:
            scopes = cls._get_scopes(request, view, obj)
            # prevent code bugs when _get_scope defines scopes "softly"
            assert all(scopes)
            return scopes
        except KeyError:
            assert (
                False
            ), f"Permissions for the ({view.basename}, {view.action}, {request.method}) triplet are not defined"

    @classmethod
    @abstractmethod
    def create(
        cls,
        request: ExtendedRequest,
        view: ViewSet,
        obj: Any | None,
        iam_context: IamContext | None,
    ) -> Sequence[OpenPolicyAgentPermission]: ...

    @classmethod
    def create_base_perm(
        cls,
        request: ExtendedRequest,
        view,
        scope,
        iam_context: IamContext | None,
        obj: Any | None = None,
        **kwargs,
    ):
        if not iam_context and request:
            iam_context = get_iam_context(request, obj)

        return cls(scope=scope, obj=obj, **iam_context, **kwargs)

    @classmethod
    def create_scope_list(cls, request: ExtendedRequest, iam_context: IamContext | None = None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)

        return cls(**iam_context, scope="list")

    @cached_property
    def payload(self):
        return self.get_opa_payload()

    def get_opa_payload(self):
        return {
            "input": {
                "scope": self.scope,
                **self.get_opa_auth_payload(),
                **self.get_opa_resource_payload(),
            }
        }

    def get_opa_auth_payload(self):
        return {
            "auth": {
                "user": {
                    "id": self.user_id,
                    "privilege": self.group_name,
                },
                "organization": (
                    {
                        "id": self.org_id,
                        "owner": {
                            "id": self.org_owner_id,
                        },
                        "user": {
                            "role": self.org_role,
                        },
                    }
                    if self.org_id is not None
                    else None
                ),
            },
        }

    def get_opa_resource_payload(self):
        return {"resource": self.get_resource()}

    @abstractmethod
    def get_resource(self):
        return None

    def __init__(self, **kwargs):
        self.obj = None
        for name, val in kwargs.items():
            setattr(self, name, val)

    def check_access(self) -> PermissionResult:
        with make_requests_session() as session:
            response = session.post(self.url, json=self.payload)
            output = response.json()["result"]

        allow = False
        reasons = []
        if isinstance(output, dict):
            allow = output["allow"]
            reasons = output.get("reasons", [])
        elif isinstance(output, bool):
            allow = output
        else:
            raise ValueError("Unexpected response format")

        return PermissionResult(allow=allow, reasons=reasons)

    def filter(self, queryset):
        url = self.url.replace("/allow", "/filter")

        with make_requests_session() as session:
            r = session.post(url, json=self.payload).json()["result"]

        q_objects = []
        ops_dict = {
            "|": operator.or_,
            "&": operator.and_,
            "~": operator.not_,
        }
        for item in r:
            if isinstance(item, str):
                val1 = q_objects.pop()
                if item == "~":
                    q_objects.append(ops_dict[item](val1))
                else:
                    val2 = q_objects.pop()
                    q_objects.append(ops_dict[item](val1, val2))
            else:
                q_objects.append(Q(**item))

        if q_objects:
            assert len(q_objects) == 1
        else:
            q_objects.append(Q())

        # By default, a QuerySet will not eliminate duplicate rows. If your
        # query spans multiple tables (e.g. members__user_id, owner_id), it's
        # possible to get duplicate results when a QuerySet is evaluated.
        # That's when you'd use distinct().
        return queryset.filter(q_objects[0]).distinct()

    @classmethod
    def get_per_field_update_scopes(cls, request, scopes_per_field):
        """
        Returns the list of required scopes for a PATCH endpoint where different
        request body fields are associated with different scopes.
        """

        assert request.method == "PATCH"

        # Even if no fields are modified, a PATCH request typically returns the
        # new state of the object, so we need to make sure the user has permissions
        # to view it.
        scopes = [cls.Scopes.VIEW]

        try:
            scopes.extend({scopes_per_field[field_name] for field_name in request.data})
        except KeyError as ex:
            raise PermissionDenied("Attempted to update an unknown field") from ex

        return scopes


T = TypeVar("T", bound=Model)


def is_public_obj(obj: T) -> bool:
    return getattr(obj, "is_public", False)


class PolicyEnforcer(BasePermission):
    def _check_permission(
        self, request: ExtendedRequest, view: ViewSet, obj
    ) -> tuple[bool, list[OpenPolicyAgentPermission]]:
        def _check_permissions():
            # DRF can send OPTIONS request. Internally it will try to get
            # information about serializers for PUT and POST requests (clone
            # request and replace the http method). To avoid handling
            # ('POST', 'metadata') and ('PUT', 'metadata') in every request,
            # the condition below is enough.
            if self.is_metadata_request(request, view) or obj and is_public_obj(obj):
                return True

            assert hasattr(
                view, "iam_permission_class"
            ), f"View {view} has no 'iam_permission_class' attribute"

            perm_class = view.iam_permission_class
            iam_context = get_iam_context(request, obj)

            for perm in perm_class.create(request, view, obj, iam_context=iam_context):
                checked_permissions.append(perm)
                result = perm.check_access()
                if not result.allow:
                    return False

            return True

        checked_permissions = []
        allow = _check_permissions()
        return allow, checked_permissions

    def check_permission(self, request, view, obj) -> bool:
        return self._check_permission(request, view, obj)[0]

    def has_permission(self, request, view):
        if not view.detail:
            return self.check_permission(request, view, None)
        else:
            return True  # has_object_permission will be called later

    def has_object_permission(self, request, view, obj):
        return self.check_permission(request, view, obj)

    @staticmethod
    def is_metadata_request(request, view):
        return request.method == "OPTIONS" or (
            request.method == "POST" and view.action == "metadata" and len(request.data) == 0
        )


class IsAuthenticatedOrReadPublicResource(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        return bool(
            (request.user and request.user.is_authenticated)
            or (request.method == "GET" and is_public_obj(obj))
        )


def load_app_iam_rules(config: AppConfig) -> None:
    """
    Ensures that OPA rules from the given app are loaded.

    This function should be called from the AppConfig.ready() method of every
    app that defines OPA rules.
    """
    add_opa_rules_path(Path(config.path, "rules"))
