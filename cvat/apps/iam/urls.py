# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path, re_path
from django.conf import settings
from django.urls.conf import include
from dj_rest_auth.views import (
    LogoutView, PasswordChangeView,
    PasswordResetView, PasswordResetConfirmView)
from allauth.account import app_settings as allauth_settings

from cvat.apps.iam.views import (
    SigningView, CognitoLogin, RegisterViewEx, RulesView,
    ConfirmEmailViewEx, LoginViewEx, GitHubLogin, GoogleLogin, SocialAuthMethods,
    github_oauth2_login as github_login,
    github_oauth2_callback as github_callback,
    google_oauth2_login as google_login,
    google_oauth2_callback as google_callback,
    amazon_cognito_oauth2_login as amazon_cognito_login,
    amazon_cognito_oauth2_callback as amazon_cognito_callback,
)

urlpatterns = [
    path('login', LoginViewEx.as_view(), name='rest_login'),
    path('logout', LogoutView.as_view(), name='rest_logout'),
    path('signing', SigningView.as_view(), name='signing'),
    path('rules', RulesView.as_view(), name='rules'),
]

if settings.IAM_TYPE == 'BASIC':
    urlpatterns += [
        path('register', RegisterViewEx.as_view(), name='rest_register'),
        # password
        path('password/reset', PasswordResetView.as_view(),
            name='rest_password_reset'),
        path('password/reset/confirm', PasswordResetConfirmView.as_view(),
            name='rest_password_reset_confirm'),
        path('password/change', PasswordChangeView.as_view(),
            name='rest_password_change'),
        path('social/methods/', SocialAuthMethods.as_view(), name='social_auth_methods'),
    ]
    if allauth_settings.EMAIL_VERIFICATION != \
       allauth_settings.EmailVerificationMethod.NONE:
        # emails
        urlpatterns += [
            re_path(r'^account-confirm-email/(?P<key>[-:\w]+)/$', ConfirmEmailViewEx.as_view(),
                name='account_confirm_email'),
        ]
    if settings.USE_ALLAUTH_SOCIAL_ACCOUNTS:
        # social accounts
        urlpatterns += [
            path('github/login/', github_login, name='github_login'),
            path('github/login/callback/', github_callback, name='github_callback'),
            path('github/login/token', GitHubLogin.as_view()),
            path('google/login/', google_login, name='google_login'),
            path('google/login/callback/', google_callback, name='google_callback'),
            path('google/login/token', GoogleLogin.as_view()),
            path('amazon-cognito/login/', amazon_cognito_login, name='amazon_cognito_login'),
            path('amazon-cognito/login/callback/', amazon_cognito_callback, name='amazon_cognito_callback'),
            path('amazon-cognito/login/token', CognitoLogin.as_view()),
        ]

urlpatterns = [path('auth/', include(urlpatterns))]
