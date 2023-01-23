# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import contextmanager
from itertools import repeat
import itertools
from typing import Sequence, Type
from unittest import mock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework.authtoken.models import Token
from django.test import override_settings
from django.urls import path, re_path
from allauth.account.views import EmailVerificationSentView

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, PermissionResult
from cvat.apps.iam.urls import urlpatterns as iam_url_patterns
from cvat.apps.iam.views import ConfirmEmailViewEx
from cvat.apps.engine.models import User


urlpatterns = iam_url_patterns + [
    re_path(r'^account-confirm-email/(?P<key>[-:\w]+)/$', ConfirmEmailViewEx.as_view(),
            name='account_confirm_email'),
    path('register/account-email-verification-sent', EmailVerificationSentView.as_view(),
         name='account_email_verification_sent'),
]

class ForceLogin:
    def __init__(self, user, client):
        self.user = user
        self.client = client

    def __enter__(self):
        if self.user:
            self.client.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()

class UserRegisterAPITestCase(APITestCase):

    user_data = {'first_name': 'test_first', 'last_name': 'test_last', 'username': 'test_username',
                 'email': 'test_email@test.com', 'password1': '$Test357Test%', 'password2': '$Test357Test%',
                 'confirmations': []}

    def setUp(self):
        self.client = APIClient()

    def _run_api_v2_user_register(self, data):
        url = reverse('rest_register')
        response = self.client.post(url, data, format='json')
        return response

    def _check_response(self, response, data):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data, data)

    @override_settings(ACCOUNT_EMAIL_VERIFICATION='none')
    def test_api_v2_user_register_with_email_verification_none(self):
        """
        Ensure we can register a user and get auth token key when email verification is none
        """
        response = self._run_api_v2_user_register(self.user_data)
        user_token = Token.objects.get(user__username=response.data['username'])
        self._check_response(response, {'first_name': 'test_first', 'last_name': 'test_last',
                                        'username': 'test_username', 'email': 'test_email@test.com',
                                        'email_verification_required': False, 'key': user_token.key})

    # Since URLConf is executed before running the tests, so we have to manually configure the url patterns for
    # the tests and pass it using ROOT_URLCONF in the override settings decorator

    @override_settings(ACCOUNT_EMAIL_VERIFICATION='optional', ROOT_URLCONF=__name__)
    def test_api_v2_user_register_with_email_verification_optional(self):
        """
        Ensure we can register a user and get auth token key when email verification is optional
        """
        response = self._run_api_v2_user_register(self.user_data)
        user_token = Token.objects.get(user__username=response.data['username'])
        self._check_response(response, {'first_name': 'test_first', 'last_name': 'test_last',
                                        'username': 'test_username', 'email': 'test_email@test.com',
                                        'email_verification_required': False, 'key': user_token.key})

    @override_settings(ACCOUNT_EMAIL_REQUIRED=True, ACCOUNT_EMAIL_VERIFICATION='mandatory',
                       EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend', ROOT_URLCONF=__name__)
    def test_register_account_with_email_verification_mandatory(self):
        """
        Ensure we can register a user and it does not return auth token key when email verification is mandatory
        """
        response = self._run_api_v2_user_register(self.user_data)
        self._check_response(response, {'first_name': 'test_first', 'last_name': 'test_last',
                                        'username': 'test_username', 'email': 'test_email@test.com',
                                        'email_verification_required': True, 'key': None})

class TestIamApi(APITestCase):
    @classmethod
    def _make_permission_class(cls, results) -> Type[OpenPolicyAgentPermission]:

        class _TestPerm(OpenPolicyAgentPermission):
            def get_resource(self):
                return {}

            @classmethod
            def create(cls, request, view, obj) -> Sequence[OpenPolicyAgentPermission]:
                return [
                    cls.create_base_perm(request, view, None, obj, result=result)
                    for result in results
                ]

            def check_access(self) -> PermissionResult:
                return PermissionResult(allow=self.result[0], reasons=self.result[1])

        return _TestPerm

    @classmethod
    @contextmanager
    def _mock_permissions(cls, *perm_results):
        with mock.patch('cvat.apps.iam.permissions.OpenPolicyAgentPermission.__subclasses__',
            lambda: [cls._make_permission_class(perm_results)]
        ):
            yield

    ENDPOINT_WITH_AUTH = '/api/users/self'

    def setUp(self):
        self.client = APIClient()

        import sys
        sys.modules.pop('cvat.apps.iam.permissions', None)

    @classmethod
    def _create_db_users(cls):
        cls.user = User.objects.create_user(username="user", password="user")

    @classmethod
    def setUpTestData(cls) -> None:
        super().setUpTestData()
        cls._create_db_users()

    def test_can_report_denial_reason(self):
        expected_reasons = ["hello", "world"]

        with self._mock_permissions((False, expected_reasons)), \
                ForceLogin(user=self.user, client=self.client):
            response = self.client.get(self.ENDPOINT_WITH_AUTH)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertTrue(all([reason in str(response.content) for reason in expected_reasons]))

    def test_can_report_merged_denial_reasons(self):
        expected_reasons = [["hello", "world"], ["hi", "there"]]

        with self._mock_permissions(*zip(repeat(False), expected_reasons)), \
                ForceLogin(user=self.user, client=self.client):
            response = self.client.get(self.ENDPOINT_WITH_AUTH)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertTrue(
                all(
                    [
                        reason in str(response.content)
                        for reason in itertools.chain(*expected_reasons)
                    ]
                )
            )

    def test_can_allow_if_no_permission_matches(self):
        with self._mock_permissions(), ForceLogin(user=self.user, client=self.client):
            response = self.client.get(self.ENDPOINT_WITH_AUTH)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_allow_if_permissions_allow(self):
        with self._mock_permissions((True, [])), \
                ForceLogin(user=self.user, client=self.client):
            response = self.client.get(self.ENDPOINT_WITH_AUTH)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_deny_if_some_permissions_deny(self):
        expected_reasons = ["hello"]

        with self._mock_permissions((True, []), (False, expected_reasons)), \
                ForceLogin(user=self.user, client=self.client):
            response = self.client.get(self.ENDPOINT_WITH_AUTH)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertTrue(all([reason in str(response.content) for reason in expected_reasons]))
