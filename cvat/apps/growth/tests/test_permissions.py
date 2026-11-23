# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from types import SimpleNamespace

from django.test import TestCase

from cvat.apps.growth.models import UserGrowthData
from cvat.apps.growth.permissions import UpdatesPermission, UserGrowthDataPermission
from cvat.apps.iam.models import User


class UpdatesPermissionTestCase(TestCase):
    def test_delegates_each_action_to_the_current_users_growth_policy(self) -> None:
        user = User.objects.create_user(username="updates-permission-user")
        growth_data = UserGrowthData.objects.get(user=user)
        request = SimpleNamespace(user=user)
        iam_context = {
            "user_id": user.id,
            "group_name": None,
            "org_specified": False,
            "org_id": None,
            "org_owner_id": None,
            "org_role": None,
        }
        for action, scope in (
            ("summary", UserGrowthDataPermission.Scopes.VIEW),
            ("acknowledge", UserGrowthDataPermission.Scopes.UPDATE),
        ):
            with self.subTest(action=action):
                with self.assertNumQueries(1):
                    permissions = UpdatesPermission.create(
                        request, SimpleNamespace(action=action), None, iam_context
                    )

                self.assertEqual(len(permissions), 1)
                permission = permissions[0]
                self.assertIs(type(permission), UserGrowthDataPermission)
                self.assertEqual(permission.scope, scope)
                self.assertEqual(permission.obj, growth_data)
                self.assertEqual(permission.get_resource()["id"], growth_data.id)
                self.assertEqual(permission.get_resource()["user"], {"id": request.user.id})
                self.assertEqual(permission.payload["input"]["auth"]["user"]["id"], request.user.id)
        self.assertEqual(UserGrowthData.objects.filter(user=user).count(), 1)
