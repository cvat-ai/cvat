# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import importlib
import operator
from abc import ABCMeta, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, TypeVar

from attrs import define, field
from django.apps import AppConfig
from django.conf import settings
from django.db.models import Q, Model
from rest_framework.permissions import BasePermission

from cvat.apps.organizations.models import Membership, Organization
from cvat.utils.http import make_requests_session

from .utils import add_opa_rules_path

class StrEnum(str, Enum):
    def __str__(self) -> str:
        return self.value

@define
class PermissionResult:
    allow: bool
    reasons: List[str] = field(factory=list)

def get_organization(request, obj):
    # Try to get organization from an object otherwise, return the organization that is specified in query parameters
    if isinstance(obj, Organization):
        return obj

    if obj:
        try:
            organization_id = getattr(obj, 'organization_id')
        except AttributeError as exc:
            # Skip initialization of organization for those objects that don't related with organization
            view = request.parser_context.get('view')
            if view and view.basename in settings.OBJECTS_NOT_RELATED_WITH_ORG:
                return request.iam_context['organization']

            raise exc

        try:
            return Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return None

    return request.iam_context['organization']

def get_membership(request, organization):
    if organization is None:
        return None

    return Membership.objects.filter(
        organization=organization,
        user=request.user,
        is_active=True
    ).first()

def build_iam_context(request, organization: Optional[Organization], membership: Optional[Membership]):
    return {
        'user_id': request.user.id,
        'group_name': request.iam_context['privilege'],
        'org_id': getattr(organization, 'id', None),
        'org_slug': getattr(organization, 'slug', None),
        'org_owner_id': getattr(organization.owner, 'id', None)
            if organization else None,
        'org_role': getattr(membership, 'role', None),
    }


def get_iam_context(request, obj) -> Dict[str, Any]:
    organization = get_organization(request, obj)
    membership = get_membership(request, organization)

    return build_iam_context(request, organization, membership)


class OpenPolicyAgentPermission(metaclass=ABCMeta):
    url: str
    user_id: int
    group_name: Optional[str]
    org_id: Optional[int]
    org_owner_id: Optional[int]
    org_role: Optional[str]
    scope: str
    obj: Optional[Any]

    @classmethod
    @abstractmethod
    def create(cls, request, view, obj, iam_context) -> Sequence[OpenPolicyAgentPermission]:
        ...

    @classmethod
    def create_base_perm(cls, request, view, scope, iam_context, obj=None, **kwargs):
        if not iam_context and request:
            iam_context = get_iam_context(request, obj)
        return cls(
            scope=scope,
            obj=obj,
            **iam_context, **kwargs)

    @classmethod
    def create_scope_list(cls, request, iam_context=None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)
        return cls(**iam_context, scope='list')

    def __init__(self, **kwargs):
        self.obj = None
        for name, val in kwargs.items():
            setattr(self, name, val)

        self.payload = {
            'input': {
                'scope': self.scope,
                'auth': {
                    'user': {
                        'id': self.user_id,
                        'privilege': self.group_name
                    },
                    'organization': {
                        'id': self.org_id,
                        'owner': {
                            'id': self.org_owner_id,
                        },
                        'user': {
                            'role': self.org_role,
                        },
                    } if self.org_id is not None else None
                }
            }
        }

        self.payload['input']['resource'] = self.get_resource()

    @abstractmethod
    def get_resource(self):
        return None

    def check_access(self) -> PermissionResult:
        with make_requests_session() as session:
            response = session.post(self.url, json=self.payload)
            output = response.json()['result']

        allow = False
        reasons = []
        if isinstance(output, dict):
            allow = output['allow']
            reasons = output.get('reasons', [])
        elif isinstance(output, bool):
            allow = output
        else:
            raise ValueError("Unexpected response format")

        return PermissionResult(allow=allow, reasons=reasons)

    def filter(self, queryset):
        url = self.url.replace('/allow', '/filter')

        with make_requests_session() as session:
            r = session.post(url, json=self.payload).json()['result']

        q_objects = []
        ops_dict = {
            '|': operator.or_,
            '&': operator.and_,
            '~': operator.not_,
        }
        for item in r:
            if isinstance(item, str):
                val1 = q_objects.pop()
                if item == '~':
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
        # query spans multiple tables (e.g. members__user_id, owner_id), it’s
        # possible to get duplicate results when a QuerySet is evaluated.
        # That’s when you’d use distinct().
        return queryset.filter(q_objects[0]).distinct()

T = TypeVar('T', bound=Model)

def is_public_obj(obj: T) -> bool:
    return getattr(obj, "is_public", False)

class PolicyEnforcer(BasePermission):
    # pylint: disable=no-self-use
    def check_permission(self, request, view, obj) -> bool:
        # DRF can send OPTIONS request. Internally it will try to get
        # information about serializers for PUT and POST requests (clone
        # request and replace the http method). To avoid handling
        # ('POST', 'metadata') and ('PUT', 'metadata') in every request,
        # the condition below is enough.
        if self.is_metadata_request(request, view) or obj and is_public_obj(obj):
            return True

        iam_context = get_iam_context(request, obj)
        for perm_class in OpenPolicyAgentPermission.__subclasses__():
            for perm in perm_class.create(request, view, obj, iam_context):
                result = perm.check_access()
                if not result.allow:
                    return False

        return True

    def has_permission(self, request, view):
        if not view.detail:
            return self.check_permission(request, view, None)
        else:
            return True # has_object_permission will be called later

    def has_object_permission(self, request, view, obj):
        return self.check_permission(request, view, obj)

    @staticmethod
    def is_metadata_request(request, view):
        return request.method == 'OPTIONS' \
            or (request.method == 'POST' and view.action == 'metadata' and len(request.data) == 0)

class IsAuthenticatedOrReadPublicResource(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        return bool(
            request.user and request.user.is_authenticated or
            request.method == 'GET' and is_public_obj(obj)
        )

def load_app_permissions(config: AppConfig) -> None:
    """
    Ensures that permissions and OPA rules from the given app are loaded.

    This function should be called from the AppConfig.ready() method of every
    app that defines a permissions module.
    """
    permissions_module = importlib.import_module(config.name + ".permissions")

    assert any(
        isinstance(attr, type) and issubclass(attr, OpenPolicyAgentPermission)
        for attr in vars(permissions_module).values()
    )

    add_opa_rules_path(Path(config.path, "rules"))
