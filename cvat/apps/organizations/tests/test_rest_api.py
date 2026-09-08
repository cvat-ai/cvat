# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from cvat.apps.engine.tests.test_rest_api import create_db_users
from cvat.apps.engine.tests.utils import ApiTestBase, ForceLogin
from cvat.apps.iam.models import User, UserCreationMethod


class OrganizationCreateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api(self, user, data):
        with ForceLogin(user, self.client):
            return self.client.post("/api/organizations", data=data, format="json")

    def test_default_permissions(self):
        for user, expected_status in [(self.admin, 201), (self.owner, 201), (self.annotator, 403)]:
            response = self._run_api(user, {"slug": user.username + "org"})
            self.assertEqual(response.status_code, expected_status, response.content)

    @override_settings(ORGANIZATIONS_MIN_ROLE_TO_CREATE="admin")
    def test_overridden_permissions(self):
        for user, expected_status in [(self.admin, 201), (self.owner, 403), (self.annotator, 403)]:
            response = self._run_api(user, {"slug": user.username + "org"})
            self.assertEqual(response.status_code, expected_status, response.content)


class InvitationCreateAPITestCase(ApiTestBase):
    org_slug = "testorg"

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def setUp(self):
        super().setUp()
        response = self._post_request(
            "/api/organizations",
            self.admin,
            data={"slug": self.org_slug, "name": "Test organization"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def _invite(self, email):
        return self._post_request(
            "/api/invitations",
            self.admin,
            data={"role": "worker", "email": email},
            query_params={"org": self.org_slug},
        )

    def test_can_invite_unregistered_user(self):
        response = self._invite("invited@test.com")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        user = User.objects.get(email="invited@test.com")
        self.assertEqual(user.created_via, UserCreationMethod.INVITATION)
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.memberships.get(organization__slug=self.org_slug).is_active)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("invited@test.com", mail.outbox[0].to)

    def test_can_register_over_invited_user(self):
        self._invite("invited@test.com")
        invited_user_id = User.objects.get(email="invited@test.com").id

        response = self.client.post(
            reverse("rest_register"),
            data={
                "username": "inviteduser",
                "email": "invited@test.com",
                "password1": "$Test357Test%",
                "password2": "$Test357Test%",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        user = User.objects.get(id=invited_user_id)
        self.assertEqual(user.email, "invited@test.com")
        self.assertEqual(user.created_via, UserCreationMethod.REGISTRATION)
