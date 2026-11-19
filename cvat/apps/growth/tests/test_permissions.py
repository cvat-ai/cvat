# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from types import SimpleNamespace

from django.test import SimpleTestCase

from cvat.apps.growth.permissions import UpdatesPermission, UserGrowthDataPermission
from cvat.apps.iam.models import User


class UpdatesPermissionTestCase(SimpleTestCase):
    def test_delegates_each_action_to_the_current_users_growth_policy(self) -> None:
        request = SimpleNamespace(user=User(id=7))
        iam_context = {
            "user_id": 7,
            "group_name": None,
            "org_specified": False,
            "org_id": None,
            "org_owner_id": None,
            "org_role": None,
        }
        for action, scope in (
            ("list", UserGrowthDataPermission.Scopes.VIEW),
            ("acknowledge", UserGrowthDataPermission.Scopes.UPDATE),
        ):
            with self.subTest(action=action):
                permissions = UpdatesPermission.create(
                    request, SimpleNamespace(action=action), None, iam_context
                )

                self.assertEqual(len(permissions), 1)
                permission = permissions[0]
                self.assertIs(type(permission), UserGrowthDataPermission)
                self.assertEqual(permission.scope, scope)
                self.assertEqual(permission.get_resource()["user"], {"id": request.user.id})
                self.assertEqual(permission.payload["input"]["auth"]["user"]["id"], request.user.id)
