# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from django.test import override_settings
from cvat.apps.iam.urls import urlpatterns as iam_url_patterns
from django.urls import path, re_path
from allauth.account.views import ConfirmEmailView, EmailVerificationSentView

urlpatterns = iam_url_patterns + [
    re_path(r'^account-confirm-email/(?P<key>[-:\w]+)/$', ConfirmEmailView.as_view(),
            name='account_confirm_email'),
    path('register/account-email-verification-sent', EmailVerificationSentView.as_view(),
         name='account_email_verification_sent'),
]


class AccountTests(APITestCase):

    user_data = {'first_name': 'test_first', 'last_name': 'test_last', 'username': 'test_username',
                 'email': 'test_email@test.com', 'password1': '$Test357Test%', 'password2': '$Test357Test%',
                 'confirmations': []}

    def get_register_response(self):
        url = reverse('rest_register')
        response = self.client.post(url, self.user_data, format='json')
        return response

    def test_register_account_without_email_verification(self):
        """
        Ensure we can register a user and get auth token key when email verification is turned off
        """
        response = self.get_register_response()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_token = Token.objects.get(user__username=response.data['username'])
        self.assertEqual(response.data, {'first_name': 'test_first', 'last_name': 'test_last',
                                         'username': 'test_username', 'email': 'test_email@test.com',
                                         'email_verification_required': False, 'key': user_token.key})

    @override_settings(ACCOUNT_AUTHENTICATION_METHOD='username', ACCOUNT_CONFIRM_EMAIL_ON_GET=True,
                       ACCOUNT_EMAIL_REQUIRED=True, ACCOUNT_EMAIL_VERIFICATION='mandatory',
                       EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend',
                       ACCOUNT_EMAIL_CONFIRMATION_HMAC=True, ROOT_URLCONF=__name__)
    def test_register_account_with_email_verification(self):
        """
        Ensure we can register a user and it does not return auth token key when email verification is turned on
        """
        # Since override settings is loaded after URLConf, 'account_confirm_email' url is not loaded, so we need to
        # override ROOT_URLCONF to fix the issue
        response = self.get_register_response()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data, {'first_name': 'test_first', 'last_name': 'test_last',
                                         'username': 'test_username', 'email': 'test_email@test.com',
                                         'email_verification_required': True, 'key': None})
