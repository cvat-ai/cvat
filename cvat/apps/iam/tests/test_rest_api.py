# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import base64

from allauth.account.models import EmailAddress
from allauth.account.views import EmailVerificationSentView
from django.contrib.auth.models import User
from django.test import override_settings
from django.urls import path, re_path, reverse
from rest_framework import status
from rest_framework.authtoken.models import Token

from cvat.apps.engine.tests.test_rest_api import create_db_users
from cvat.apps.engine.tests.utils import ApiTestBase
from cvat.apps.iam.views import ConfirmEmailViewEx
from cvat.urls import urlpatterns as original_urlpatterns

urlpatterns = original_urlpatterns + [
    re_path(
        r"^account-confirm-email/(?P<key>[-:\w]+)/$",
        ConfirmEmailViewEx.as_view(),
        name="account_confirm_email",
    ),
    path(
        "register/account-email-verification-sent",
        EmailVerificationSentView.as_view(),
        name="account_email_verification_sent",
    ),
]


class UserRegisterAPITestCase(ApiTestBase):
    user_data = {
        "first_name": "test_first",
        "last_name": "test_last",
        "username": "test_username",
        "email": "test_email@test.com",
        "password1": "$Test357Test%",
        "password2": "$Test357Test%",
        "confirmations": [],
    }

    @classmethod
    def setUpTestData(cls):
        # create only admin account
        create_db_users(cls, primary=False, extra=False)

    def _run_api_v2_user_register(self, data):
        url = reverse("rest_register")
        response = self.client.post(url, data, format="json")
        return response

    def _check_response(self, response, data):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data, data)

    @override_settings(ACCOUNT_EMAIL_VERIFICATION="none")
    def test_api_v2_user_register_with_email_verification_none(self):
        """
        Ensure we can register a user and get auth token key when email verification is none
        """
        response = self._run_api_v2_user_register(self.user_data)
        user_token = Token.objects.get(user__username=response.data["username"])
        self._check_response(
            response,
            {
                "first_name": "test_first",
                "last_name": "test_last",
                "username": "test_username",
                "email": "test_email@test.com",
                "email_verification_required": False,
                "key": user_token.key,
            },
        )

    # Since URLConf is executed before running the tests, so we have to manually configure the url patterns for
    # the tests and pass it using ROOT_URLCONF in the override settings decorator

    @override_settings(ACCOUNT_EMAIL_VERIFICATION="optional", ROOT_URLCONF=__name__)
    def test_api_v2_user_register_with_email_verification_optional(self):
        """
        Ensure we can register a user and get auth token key when email verification is optional
        """
        response = self._run_api_v2_user_register(self.user_data)
        user_token = Token.objects.get(user__username=response.data["username"])
        self._check_response(
            response,
            {
                "first_name": "test_first",
                "last_name": "test_last",
                "username": "test_username",
                "email": "test_email@test.com",
                "email_verification_required": False,
                "key": user_token.key,
            },
        )

    @override_settings(
        ACCOUNT_EMAIL_REQUIRED=True,
        ACCOUNT_EMAIL_VERIFICATION="mandatory",
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        ROOT_URLCONF=__name__,
    )
    def test_register_account_with_email_verification_mandatory(self):
        """
        Ensure we can register a user and it does not return auth token key when email verification is mandatory
        """
        response = self._run_api_v2_user_register(self.user_data)
        self._check_response(
            response,
            {
                "first_name": "test_first",
                "last_name": "test_last",
                "username": "test_username",
                "email": "test_email@test.com",
                "email_verification_required": True,
                "key": None,
            },
        )

    @override_settings(
        ACCOUNT_EMAIL_REQUIRED=True,
        ACCOUNT_EMAIL_VERIFICATION="mandatory",
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        ROOT_URLCONF=__name__,
    )
    def test_register_account_with_different_email_case_than_in_invitation(self):
        """
        Ensure a user can log in to the account after being invited to an organization
        and then registering with the same email but in a different case.
        """
        org_slug = "testorg"
        response = self._post_request(
            "/api/organizations", self.admin, data={"slug": org_slug, "name": "Test organization"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self._post_request(
            "/api/invitations",
            self.admin,
            data={"role": "worker", "email": self.user_data["email"].upper()},
            query_params={"org": org_slug},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self._run_api_v2_user_register(self.user_data)
        self._check_response(
            response,
            {
                "first_name": "test_first",
                "last_name": "test_last",
                "username": "test_username",
                "email": "test_email@test.com",
                "email_verification_required": True,
                "key": None,
            },
        )
        invited_db_user = User.objects.get(email=self.user_data["email"])
        self.assertTrue(invited_db_user.emailaddress_set.update(verified=True))
        response = self.client.post(
            "/api/auth/login",
            format="json",
            data={"email": self.user_data["email"], "password": self.user_data["password1"]},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("sessionid", response.cookies)
        self.assertIn("csrftoken", response.cookies)

    def _authenticate_with_basic_auth(self, *, should_be_authorized: bool):
        credentials_str = f'{self.user_data["username"]}:{self.user_data["password1"]}'
        response = self.client.get(
            "/api/users/self",
            format="json",
            headers={
                "Authorization": f"Basic {base64.b64encode(credentials_str.encode()).decode()}",
            },
        )
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK if should_be_authorized else status.HTTP_401_UNAUTHORIZED,
        )

    @override_settings(
        ACCOUNT_EMAIL_REQUIRED=True,
        ACCOUNT_EMAIL_VERIFICATION="mandatory",
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        ROOT_URLCONF=__name__,
    )
    def test_basic_authentication_respects_email_confirmation(self):
        response = self._run_api_v2_user_register(self.user_data)
        self._check_response(
            response,
            {
                "first_name": "test_first",
                "last_name": "test_last",
                "username": "test_username",
                "email": "test_email@test.com",
                "email_verification_required": True,
                "key": None,
            },
        )
        db_user = User.objects.get(email=self.user_data["email"])
        db_email_address = EmailAddress.objects.get_for_user(db_user, self.user_data["email"])
        self.assertFalse(db_email_address.verified)
        self._authenticate_with_basic_auth(should_be_authorized=False)

        db_email_address.verified = True
        db_email_address.save()
        self._authenticate_with_basic_auth(should_be_authorized=True)
