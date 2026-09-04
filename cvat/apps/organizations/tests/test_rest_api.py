# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import caches
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from cvat.apps.engine.tests.test_rest_api import create_db_users
from cvat.apps.engine.tests.utils import ApiTestBase, ForceLogin
from cvat.apps.iam.models import User, UserCreationMethod
from cvat.apps.iam.tests.test_rest_api import MockDisposableDomainService


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


class InvitationDisposableEmailAPITestCase(ApiTestBase):
    org_slug = "testorg"
    invited_email = "invited_user@somedomain.com"
    cache_key = "disposable_email_domain:somedomain.com"

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def setUp(self):
        super().setUp()
        response = self._post_request(
            "/api/organizations", self.admin, data={"slug": self.org_slug}
        )
        assert response.status_code == status.HTTP_201_CREATED, response.content

    def _run_api(self):
        return self._post_request(
            "/api/invitations",
            self.admin,
            data={"role": "worker", "email": self.invited_email},
            query_params={"org": self.org_slug},
        )

    @override_settings(
        DISPOSABLE_EMAIL_CHECK_ENABLED=True,
        DISPOSABLE_DOMAIN_SERVICE="cvat.apps.iam.tests.test_rest_api.MockDisposableDomainService",
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    )
    @mock.patch.object(MockDisposableDomainService, "check_domain_is_disposable", return_value=True)
    def test_cannot_invite_user_with_disposable_email(self, mock_check):
        response = self._run_api()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertFalse(get_user_model().objects.filter(email=self.invited_email).exists())
        mock_check.assert_called_once_with(domain="somedomain.com")
        self.assertIs(caches["default"].get(self.cache_key), True)

    @override_settings(
        DISPOSABLE_EMAIL_CHECK_ENABLED=True,
        DISPOSABLE_DOMAIN_SERVICE="cvat.apps.iam.tests.test_rest_api.MockDisposableDomainService",
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    )
    @mock.patch.object(
        MockDisposableDomainService, "check_domain_is_disposable", return_value=False
    )
    def test_can_invite_user_with_non_disposable_email(self, mock_check):
        response = self._run_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertTrue(get_user_model().objects.filter(email=self.invited_email).exists())
        self.assertIs(caches["default"].get(self.cache_key), False)
        mock_check.assert_called_once_with(domain="somedomain.com")

    @override_settings(
        DISPOSABLE_EMAIL_CHECK_ENABLED=True,
        DISPOSABLE_DOMAIN_SERVICE="cvat.apps.iam.tests.test_rest_api.MockDisposableDomainService",
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
    )
    @mock.patch.object(
        MockDisposableDomainService,
        "check_domain_is_disposable",
        side_effect=RuntimeError("the verification service is down"),
    )
    def test_can_invite_user_when_disposable_email_check_fails(self, mock_check):
        response = self._run_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertTrue(get_user_model().objects.filter(email=self.invited_email).exists())
        self.assertIsNone(caches["default"].get(self.cache_key))
