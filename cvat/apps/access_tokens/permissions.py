# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import re
from collections.abc import Sequence
from pathlib import Path
from types import NoneType
from typing import TYPE_CHECKING, Any, ClassVar, TypeAlias

from attrs import frozen
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

from .models import AccessToken

if TYPE_CHECKING:
    from rest_framework.viewsets import ViewSet

    # importing without TYPE_CHECKING leads to an error in issubclass() check in IAM
    # https://github.com/python/cpython/issues/101162
    from cvat.apps.iam.permissions import IamContext


class AccessTokenPermissionBase(OpenPolicyAgentPermission):
    access_token: AccessToken | None

    @classmethod
    def get_access_token_from_request(cls, request: ExtendedRequest) -> AccessToken | None:
        access_token = getattr(request, "auth", None)
        if not isinstance(access_token, AccessToken):
            access_token = None

        return access_token

    @classmethod
    def create_base_perm(
        cls,
        request,
        view,
        scope,
        iam_context,
        obj=None,
        access_token: AccessToken | None = None,
        **kwargs,
    ):
        return super(AccessTokenPermissionBase, cls).create_base_perm(
            request=request,
            view=view,
            scope=scope,
            iam_context=iam_context,
            obj=obj,
            access_token=access_token or cls.get_access_token_from_request(request),
            **kwargs,
        )

    @classmethod
    def create_scope_list(cls, request: ExtendedRequest, iam_context: IamContext | None = None):
        if not iam_context and request:
            iam_context = get_iam_context(request, None)

        return cls(
            **iam_context, access_token=cls.get_access_token_from_request(request), scope="list"
        )

    def __init__(self, **kwargs):
        assert isinstance(kwargs["access_token"], AccessToken | NoneType)
        super().__init__(**kwargs)


class AccessTokenPermission(AccessTokenPermissionBase):
    obj: AccessToken | None

    class Scopes(StrEnum):
        CREATE = "create"
        LIST = "list"
        VIEW = "view"
        UPDATE = "update"
        DELETE = "delete"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []

        if view.basename == "access_token":
            for scope in cls.get_scopes(request, view, obj):
                perm = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(perm)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/access_tokens/allow"

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
                "owner": {"id": self.obj.owner_id},
            }
        elif self.scope == self.Scopes.VIEW:  # self
            data = {
                "id": self.access_token.id,
                "owner": {"id": self.access_token.owner_id},
            }

        return data


@frozen
class PluginInfo:
    file_path: Path
    package: str
    original_package: str


PluginCollection: TypeAlias = dict[str, list[PluginInfo]]


class AccessTokenPermissionPluginManager:
    PLUGIN_PACKAGE_PREFIX = "access_token_plugin."
    PLUGIN_FILE_EXT = ".rego"

    @classmethod
    def _build_plugin_descriptor(cls, p: Path) -> PluginInfo:
        package = cls._get_plugin_package_name(p)

        package_parts = re.fullmatch(
            r"(([\w\.]+\.)?" + re.escape(cls.PLUGIN_PACKAGE_PREFIX) + r")([\w\.]+)", package
        )
        if not package_parts:
            raise Exception(
                "Access token plugins must have '{}' "
                "in their package name, found '{}' in '{}'".format(
                    cls.PLUGIN_PACKAGE_PREFIX, package, p
                )
            )

        return PluginInfo(
            file_path=p,
            package=package,
            original_package=package_parts.group(3),
        )

    @classmethod
    def _get_plugin_package_name(cls, p: Path) -> str:
        package_regex = r"package\s+([\w\.]+)"

        for line in p.open():
            match = re.fullmatch(package_regex, line.strip())
            if match:
                return match.group(1)

        raise ValueError(f"Could not find package declaration in '{p}'")

    @classmethod
    def _collect_plugins(cls, *, plugin_dirs: Sequence[Path]) -> PluginCollection:
        plugin_dirs = set(p.resolve() for p in plugin_dirs)
        plugin_filename_pattern = f"*{cls.PLUGIN_PACKAGE_PREFIX}*{cls.PLUGIN_FILE_EXT}"

        plugins: dict[str, PluginInfo] = {}
        for plugin_dir in plugin_dirs:
            for plugin_path in plugin_dir.glob(plugin_filename_pattern):
                if not plugin_path.is_file():
                    continue

                plugin = cls._build_plugin_descriptor(plugin_path)

                plugin_key = plugin.package
                if plugin_key in plugins:
                    existing_plugin = plugins[plugin_key]
                    raise Exception(
                        f"Access token permission plugin '{plugin.package}' "
                        f"already found in '{existing_plugin.file_path}'"
                    )

                plugins[plugin_key] = plugin

        plugins_by_source_package = grouped(plugins.values(), key=lambda p: p.original_package)

        return plugins_by_source_package

    _manager_instance: ClassVar[AccessTokenPermissionPluginManager] = None

    def __init__(self):
        self._cached_plugins: tuple[int, PluginCollection] = (0, {})  # (hash, plugins)

    @property
    def plugins(self) -> PluginCollection:
        from cvat.apps.iam.utils import _OPA_RULES_PATHS

        # Not really a strong hash, but there's no "official" way to remove rules after
        # they're registered. Another option would be to have a dedicated reload() method
        # that has to be called explicitly in the apps that update rule paths.
        opa_rules_hash = len(_OPA_RULES_PATHS)

        if self._cached_plugins[0] != opa_rules_hash:
            self._cached_plugins = (
                opa_rules_hash,
                self._collect_plugins(plugin_dirs=_OPA_RULES_PATHS),
            )

        return self._cached_plugins[1]

    @classmethod
    def get_instance(cls) -> AccessTokenPermissionPluginManager:
        if cls._manager_instance is None:
            cls._manager_instance = AccessTokenPermissionPluginManager()

        return cls._manager_instance

    @classmethod
    def get_plugins(cls, original_package: str) -> Sequence[PluginInfo]:
        return cls.get_instance().plugins.get(original_package, [])


class AccessTokenPluginPermissionBase(AccessTokenPermissionBase):
    pass


class AccessTokenPluginPermission(AccessTokenPluginPermissionBase):
    request: ExtendedRequest
    view: ViewSet

    @classmethod
    def find_extensions(cls, original_permission: OpenPolicyAgentPermission) -> Sequence[str]:
        opa_base_url = settings.IAM_OPA_DATA_URL + "/"

        if not (
            original_permission.url.startswith(opa_base_url)
            and original_permission.url.endswith("/allow")
        ):
            raise ValueError(
                "Permission {}: unknown URL format ('{}')".format(
                    type(original_permission), original_permission.url
                )
            )

        original_package = (
            original_permission.url.removeprefix(opa_base_url)
            .removesuffix("/allow")
            .replace("/", ".")
        )
        return [p.package for p in AccessTokenPermissionPluginManager.get_plugins(original_package)]

    original_permission: OpenPolicyAgentPermission

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return []

    @classmethod
    # pylint: disable-next=arguments-differ
    def create(
        cls,
        request,
        view,
        obj,
        iam_context,
        permissions: list[OpenPolicyAgentPermission],
    ) -> Sequence[AccessTokenPluginPermission]:
        extra_permissions = []

        if not cls.get_access_token_from_request(request):
            return extra_permissions

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
                AccessTokenReadOnlyDefaultPermission.create(request, view, obj, iam_context)
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
    ) -> AccessTokenPluginPermission:
        return cls(
            request=request,
            view=view,
            **iam_context or get_iam_context(request, obj),
            obj=obj,
            access_token=request.auth,
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
                "id": self.access_token.id,
                "read_only": self.access_token.read_only,
            }
            if self.access_token is not None
            else None
        )
        return value


class AccessTokenReadOnlyDefaultPermission(AccessTokenPluginPermissionBase):
    """
    Disallows any unsafe (non HEAD, OPTIONS, GET) requests for
    read-only token-authenticated clients.

    This is a default fallback implementation. If you want to redefine the default logic for
    a specific view, add a permission plugin via the AccessTokenPluginPermission system.
    """

    REJECTION_REASON = "Access token is read only"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []

        if (
            AccessTokenPermissionBase.get_access_token_from_request(request)
            and request.auth.read_only
            and request.method not in SAFE_METHODS
        ):
            permissions.append(
                cls(
                    request=request,
                    view=view,
                    **iam_context or get_iam_context(request, obj),
                    obj=obj,
                    access_token=request.auth,
                )
            )

        return permissions

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return []

    def get_resource(self):
        return {}

    def filter(self, queryset):
        raise NotImplementedError("Method is not allowed")

    def check_access(self):
        return PermissionResult(allow=False, reasons=[self.REJECTION_REASON])


class PolicyEnforcer(iam_permissions.PolicyEnforcer):
    def _check_permission_plugins(
        self,
        request: ExtendedRequest,
        view: ViewSet,
        obj: Any | None,
        *,
        checked_permissions: list[OpenPolicyAgentPermission],
    ):
        for original_perm in checked_permissions.copy():
            extra_permissions = AccessTokenPluginPermission.create(
                request, view, obj, None, [original_perm]
            )
            for perm in extra_permissions:
                checked_permissions.append(perm)
                result = perm.check_access()
                if not result.allow:
                    return False

        return True

    def _check_permission(self, request, view, obj):
        allow, checked_permissions = super()._check_permission(request, view, obj)

        if allow:
            allow = self._check_permission_plugins(
                request=request, view=view, obj=obj, checked_permissions=checked_permissions
            )

        return allow, checked_permissions
