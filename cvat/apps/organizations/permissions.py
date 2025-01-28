# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum

from .models import Membership


class OrganizationPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"
        DELETE = "delete"
        UPDATE = "update"
        VIEW = "view"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == "organization":
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/organizations/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "create": Scopes.CREATE,
                "destroy": Scopes.DELETE,
                "partial_update": Scopes.UPDATE,
                "retrieve": Scopes.VIEW,
            }[view.action]
        ]

    def get_resource(self):
        if self.obj:
            membership = Membership.objects.filter(organization=self.obj, user=self.user_id).first()
            return {
                "id": self.obj.id,
                "owner": {"id": self.obj.owner_id},
                "user": {"role": membership.role if membership else None},
            }
        elif self.scope.startswith(__class__.Scopes.CREATE.value):
            return {"id": None, "owner": {"id": self.user_id}, "user": {"role": "owner"}}
        else:
            return None


class InvitationPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        CREATE = "create"
        DELETE = "delete"
        ACCEPT = "accept"
        DECLINE = "decline"
        RESEND = "resend"
        VIEW = "view"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == "invitation":
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(
                    request, view, scope, iam_context, obj, role=request.data.get("role")
                )
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.role = kwargs.get("role")
        self.url = settings.IAM_OPA_DATA_URL + "/invitations/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [
            {
                "list": Scopes.LIST,
                "create": Scopes.CREATE,
                "destroy": Scopes.DELETE,
                "partial_update": (
                    Scopes.ACCEPT if "accepted" in request.query_params else Scopes.RESEND
                ),
                "retrieve": Scopes.VIEW,
                "accept": Scopes.ACCEPT,
                "decline": Scopes.DECLINE,
                "resend": Scopes.RESEND,
            }[view.action]
        ]

    def get_resource(self):
        data = None
        if self.obj:
            data = {
                "owner": {"id": self.obj.owner_id},
                "invitee": {"id": self.obj.membership.user_id},
                "role": self.obj.membership.role,
                "organization": {"id": self.obj.membership.organization_id},
            }
        elif self.scope.startswith(__class__.Scopes.CREATE.value):
            data = {
                "owner": {"id": self.user_id},
                "invitee": {"id": None},  # unknown yet
                "role": self.role,
                "organization": {"id": self.org_id} if self.org_id is not None else None,
            }

        return data


class MembershipPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        LIST = "list"
        UPDATE = "change"
        UPDATE_ROLE = "change:role"
        VIEW = "view"
        DELETE = "delete"

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == "membership":
            for scope in cls.get_scopes(request, view, obj):
                params = {}
                if scope == "change:role":
                    params["role"] = request.data.get("role")

                self = cls.create_base_perm(request, view, scope, iam_context, obj, **params)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/memberships/allow"

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        scopes = []

        scope = {
            "list": Scopes.LIST,
            "partial_update": Scopes.UPDATE,
            "retrieve": Scopes.VIEW,
            "destroy": Scopes.DELETE,
        }[view.action]

        if scope == Scopes.UPDATE:
            scopes.extend(
                __class__.get_per_field_update_scopes(
                    request,
                    {
                        "role": Scopes.UPDATE_ROLE,
                    },
                )
            )
        else:
            scopes.append(scope)

        return scopes

    def get_resource(self):
        if self.obj:
            return {
                "role": self.obj.role,
                "is_active": self.obj.is_active,
                "user": {"id": self.obj.user_id},
                "organization": {"id": self.obj.organization_id},
            }
        else:
            return None
