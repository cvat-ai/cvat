# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from types import NoneType
from typing import TYPE_CHECKING, Any, ClassVar, Sequence

from attrs import define
from django.conf import settings
from rest_framework.permissions import SAFE_METHODS

from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.engine.utils import grouped
from cvat.apps.iam import permissions as iam_permissions
from cvat.apps.iam.permissions import (
    OpenPolicyAgentPermission,
    PermissionResult,
    StrEnum,
    get_iam_context,
)

from .models import ApiToken

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet

    # importing without TYPE_CHECKING leads to an error in issubclass() check in IAM
    # https://github.com/python/cpython/issues/101162
    from cvat.apps.iam.permissions import IamContext


class ApiTokenPermissionBase(OpenPolicyAgentPermission):
    api_token: ApiToken | None

    @classmethod
    def get_api_token_from_request(cls, request: ExtendedRequest) -> ApiToken | None:
        api_token = getattr(request, "auth", None)
        if not isinstance(api_token, ApiToken):
            api_token = None

        return api_token

    @classmethod
    def create_base_perm(
        cls,
        request,
        view,
        scope,
        iam_context,
        obj=None,
        api_token: ApiToken | None = None,
        **kwargs,
    ):
        return super(ApiTokenPermissionBase, cls).create_base_perm(
            request=request,
            view=view,
            scope=scope,
            iam_context=iam_context,
            obj=obj,
            api_token=api_token or cls.get_api_token_from_request(request),
            **kwargs,
        )

    @classmethod
    def create_scope_list(cls, request: ExtendedRequest, iam_context: IamContext | None = None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)

        return cls(**iam_context, api_token=cls.get_api_token_from_request(request), scope="list")

    def __init__(self, **kwargs):
        assert isinstance(kwargs["api_token"], ApiToken | NoneType)
        super().__init__(**kwargs)


class ApiTokenPermission(ApiTokenPermissionBase):
    obj: ApiToken | None

    class Scopes(StrEnum):
        CREATE = "create"
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"
        DELETE = "delete"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []

        if view.basename == "api_token":
            for scope in cls.get_scopes(request, view, obj):
                perm = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/api_tokens/allow"

    @classmethod
    def _get_scopes(cls, request, view, obj):
        Scopes = cls.Scopes
        return [
            {
                "create": Scopes.CREATE,
                "list": Scopes.LIST,
                "self": Scopes.VIEW,
                "retrieve": Scopes.VIEW,
                "partial_update": Scopes.UPDATE,
                "destroy": Scopes.DELETE,
            }[view.action]
        ]

    def get_resource(self):
        data = None

        if self.obj:
            data = {
                "id": self.obj.id,
                "owner": {"id": self.user_id},
            }
        elif self.scope == self.Scopes.VIEW:  # self
            data = {
                "id": self.api_token.id,
                "owner": {"id": self.user_id},
            }

        return data


class ApiTokenPermissionPluginManager:
    PLUGIN_FILE_PREFIX = "api_token_plugin."
    PLUGIN_FILE_EXT = ".rego"

    PLUGIN_PACKAGE_PREFIX = "api_token_plugin."

    @define
    class PluginInfo:
        file_path: Path
        package: str
        original_package: str

    @classmethod
    def build_plugin_descriptor(cls, p: Path) -> PluginInfo:
        package = cls.get_plugin_package_name(p)
        if not package.startswith(cls.PLUGIN_PACKAGE_PREFIX):
            raise Exception(
                "Api token plugins must have the '{}' "
                "prefix in their package name, found '{}' in '{}'".format(
                    cls.PLUGIN_PACKAGE_PREFIX, package, p
                )
            )

        return cls.PluginInfo(
            file_path=p,
            package=package,
            original_package=package.removeprefix(cls.PLUGIN_PACKAGE_PREFIX),
        )

    @classmethod
    def get_plugin_package_name(cls, p: Path) -> str:
        package_regex = r"package\s+([\w.]+)"

        for line in p.open():
            match = re.fullmatch(package_regex, line.strip())
            if match:
                return match.group(1)

        raise ValueError(f"Could not find package declaration in '{p}'")

    @classmethod
    def collect_plugins(cls) -> dict[str, Sequence[ApiTokenPermissionPluginManager.PluginInfo]]:
        plugin_filename_pattern = f"{cls.PLUGIN_FILE_PREFIX}*{cls.PLUGIN_FILE_EXT}"

        plugins: dict[str, ApiTokenPermissionPluginManager.PluginInfo] = {}
        for p in (Path(__file__).parent / "rules").glob(plugin_filename_pattern):
            if not p.is_file():
                continue

            plugin = cls.build_plugin_descriptor(p)

            plugin_key = plugin.package
            if plugin_key in plugins:
                existing_plugin = plugins[plugin_key]
                raise Exception(
                    f"Api token permission plugin '{plugin.package}' "
                    f"already found in '{existing_plugin.file_path}'"
                )

            plugins[plugin_key] = plugin

        plugins_by_source_package = grouped(plugins.values(), key=lambda p: p.original_package)

        return plugins_by_source_package

    _manager_instance: ClassVar[ApiTokenPermissionPluginManager] = None

    plugins: dict[str, list[ApiTokenPermissionPluginManager.PluginInfo]]

    def __init__(self):
        self.plugins = self.collect_plugins()

    @classmethod
    def _get_instance(cls) -> ApiTokenPermissionPluginManager:
        if cls._manager_instance is None:
            cls._manager_instance = ApiTokenPermissionPluginManager()

        return cls._manager_instance

    @classmethod
    def get_plugins(
        cls, original_package: str
    ) -> Sequence[ApiTokenPermissionPluginManager.PluginInfo]:
        return cls._manager_instance.plugins.get(original_package, [])


def load_permission_plugins():
    ApiTokenPermissionPluginManager._get_instance()


class ApiTokenPluginPermissionBase(ApiTokenPermissionBase):
    pass


class ApiTokenPluginPermission(ApiTokenPluginPermissionBase):
    request: ExtendedRequest
    view: ViewSet

    @classmethod
    def find_extensions(cls, original_permission: OpenPolicyAgentPermission) -> Sequence[str]:
        if not (
            original_permission.url.startswith(settings.IAM_OPA_DATA_URL)
            and original_permission.url.endswith("/allow")
        ):
            raise ValueError(
                "Permission {}: unknown URL format ('{}')".format(
                    type(original_permission), original_permission.url
                )
            )

        original_package = (
            original_permission.url.removeprefix(settings.IAM_OPA_DATA_URL + "/")
            .removesuffix("/allow")
            .replace("/", ".")
        )
        return [p.package for p in ApiTokenPermissionPluginManager.get_plugins(original_package)]

    original_permission: OpenPolicyAgentPermission

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return []

    @classmethod
    # pylint: disable-next=signature-differs
    def create(
        cls,
        request,
        view,
        obj,
        iam_context,
        permissions: list[OpenPolicyAgentPermission],
    ) -> Sequence[ApiTokenPluginPermission]:
        extra_permissions = []

        if not cls.get_api_token_from_request(request):
            return extra_permissions

        # TODO: maybe check only the root (request) view extensions, without deps?
        for permission in permissions:
            for extension in cls.find_extensions(permission):
                extra_permissions.append(
                    cls.create_for_extension(
                        request=request,
                        view=view,
                        iam_context=iam_context,
                        obj=obj,
                        original_permission=permission,
                        extension_package=extension,
                    )
                )

        if not extra_permissions:
            extra_permissions.extend(
                ApiTokenReadOnlyDefaultPermission.create(request, view, obj, iam_context)
            )

        return extra_permissions

    @classmethod
    def create_for_extension(
        cls,
        request: ExtendedRequest,
        view: ViewSet,
        obj: Any | None,
        iam_context: dict | None,
        original_permission: OpenPolicyAgentPermission,
        extension_package: str,
    ) -> ApiTokenPluginPermission:
        return cls(
            request=request,
            view=view,
            **iam_context or get_iam_context(request, obj),
            obj=obj,
            api_token=request.auth,
            original_permission=original_permission,
            extension_package=extension_package,
        )

    @classmethod
    def create_base_perm(cls, *args, **kwargs):
        raise NotImplementedError("Function is not allowed")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        original_permission: OpenPolicyAgentPermission = kwargs["original_permission"]
        self.scope = original_permission.scope

        extension_package: str = kwargs.pop("extension_package")
        self.url = settings.IAM_OPA_DATA_URL + f'/{extension_package.replace(".", "/")}/allow'

    def get_resource(self):
        return self.original_permission.get_resource()

    def get_opa_auth_payload(self):
        value = self.original_permission.get_opa_auth_payload()
        value["auth"]["token"] = (
            {
                "id": self.api_token.id,
                "read_only": self.api_token.read_only,
            }
            if self.api_token is not None
            else None
        )
        return value


class ApiTokenReadOnlyDefaultPermission(ApiTokenPluginPermissionBase):
    """
    Disallows any unsafe (non HEAD, OPTIONS, GET) requests for
    read-only API token-authenticated clients.

    This is a default fallback implementation. If you want to redefine the default logic for
    a specific view, add a permission plugin via the ApiTokenPluginPermission system.
    """

    REJECTION_REASON = "API token is read only"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []

        if (
            ApiTokenPermissionBase.get_api_token_from_request(request)
            and request.auth.read_only
            and request.method not in SAFE_METHODS
        ):
            permissions.append(
                cls(
                    request=request,
                    view=view,
                    **iam_context or get_iam_context(request, obj),
                    obj=obj,
                    api_token=request.auth,
                )
            )

        return permissions

    @classmethod
    def _get_scopes(cls, request, view, obj):
        raise []

    def get_resource(self):
        return {}

    def filter(self, queryset):
        raise NotImplementedError("Method is not allowed")

    def check_access(self):
        return PermissionResult(allow=False, reasons=[self.REJECTION_REASON])


class PolicyEnforcer(iam_permissions.PolicyEnforcer):
    @lru_cache(maxsize=1, typed=True)
    def _collect_permission_types(self):
        types = super()._collect_permission_types()
        return [
            t
            for t in types
            if not issubclass(t, ApiTokenPluginPermissionBase)
            if t is not ApiTokenPermissionBase
        ]

    def _check_permission(self, request, view, obj):
        allow, checked_permissions = super()._check_permission(request, view, obj)

        def _check_permissions():
            for original_perm in checked_permissions[:]:
                extra_permissions = ApiTokenPluginPermission.create(
                    request, view, obj, None, [original_perm]
                )
                for perm in extra_permissions:
                    checked_permissions.append(perm)
                    result = perm.check_access()
                    if not result.allow:
                        return False

            return True

        if allow:
            allow = _check_permissions()

        return allow, checked_permissions
