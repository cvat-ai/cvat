# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from django.conf import settings
from django.contrib.auth import SESSION_KEY
from django.test import override_settings
from django.urls import include, path, re_path, reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cvat.apps.iam.views import ConfirmEmailViewEx

urlpatterns = [
    path("api/", include("cvat.apps.iam.urls")),
    # The URLConf may have been loaded with email verification disabled.
    re_path(
        r"^account-confirm-email/(?P<key>[-:\w]+)/$",
        ConfirmEmailViewEx.as_view(),
        name="account_confirm_email",
    ),
]


@override_settings(
    ACCOUNT_SIGNUP_FIELDS=["email*", "username*", "password1*", "password2*"],
    ACCOUNT_EMAIL_VERIFICATION="mandatory",
    ACCOUNT_CONFIRM_EMAIL_ON_GET=True,
    ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    ROOT_URLCONF=__name__,
)
class EmailConfirmationTestCase(APITestCase):
    def _register(self):
        response = self.client.post(
            reverse("rest_register"),
            {
                "username": "email_confirmation",
                "email": "email_confirmation@example.com",
                "password1": "$Test357Test%",
                "password2": "$Test357Test%",
                "confirmations": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertTrue(response.data["email_verification_required"])
        self.assertIsNone(response.data["key"])
        self.assertEqual(
            self.client.session["account_login"]["state"]["stages"]["current"], "verify_email"
        )
        address = EmailAddress.objects.get(email="email_confirmation@example.com")
        self.assertFalse(address.verified)
        url = reverse("account_confirm_email", kwargs={"key": EmailConfirmationHMAC(address).key})
        return address, url

    def _assert_confirmation(self, client, address, url):
        self.assertRedirects(
            client.get(url),
            settings.ACCOUNT_EMAIL_CONFIRMATION_ANONYMOUS_REDIRECT_URL,
            fetch_redirect_response=False,
        )
        address.refresh_from_db()
        self.assertTrue(address.verified)
        self.assertNotIn("account_login", client.session)
        self.assertNotIn(SESSION_KEY, client.session)

    def test_confirm_email_in_registration_session(self):
        address, url = self._register()
        self._assert_confirmation(self.client, address, url)

    def test_confirm_email_in_new_session(self):
        address, url = self._register()
        self._assert_confirmation(APIClient(), address, url)

    @override_settings(ACCOUNT_LOGIN_TIMEOUT=0)
    def test_confirm_email_after_login_stage_timeout(self):
        address, url = self._register()
        self._assert_confirmation(self.client, address, url)

    def test_reused_confirmation_link(self):
        address, url = self._register()
        self._assert_confirmation(self.client, address, url)
        self.assertRedirects(
            self.client.get(url),
            settings.INCORRECT_EMAIL_CONFIRMATION_URL,
            fetch_redirect_response=False,
        )

    def test_invalid_confirmation_link(self):
        address, _ = self._register()
        self.assertRedirects(
            self.client.get(reverse("account_confirm_email", kwargs={"key": "invalid-key"})),
            settings.INCORRECT_EMAIL_CONFIRMATION_URL,
            fetch_redirect_response=False,
        )
        address.refresh_from_db()
        self.assertFalse(address.verified)

    def test_allauth_login_redirect(self):
        self.assertRedirects(
            self.client.get(reverse("account_login")),
            f"{settings.UI_URL}/auth/login",
            fetch_redirect_response=False,
        )
