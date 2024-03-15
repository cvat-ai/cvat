# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
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
    SigningView, RegisterViewEx, RulesView,
    ConfirmEmailViewEx, LoginViewEx
)

BASIC_LOGIN_PATH_NAME = 'rest_login'
BASIC_REGISTER_PATH_NAME = 'rest_register'

urlpatterns = [
    path('login', LoginViewEx.as_view(), name=BASIC_LOGIN_PATH_NAME),
    path('logout', LogoutView.as_view(), name='rest_logout'),
    path('signing', SigningView.as_view(), name='signing'),
    path('rules', RulesView.as_view(), name='rules'),
]

if settings.IAM_TYPE == 'BASIC':
    urlpatterns += [
        path('register', RegisterViewEx.as_view(), name=BASIC_REGISTER_PATH_NAME),
        # password
        path('password/reset', PasswordResetView.as_view(),
            name='rest_password_reset'),
        path('password/reset/confirm', PasswordResetConfirmView.as_view(),
            name='rest_password_reset_confirm'),
        path('password/change', PasswordChangeView.as_view(),
            name='rest_password_change'),
    ]
    if allauth_settings.EMAIL_VERIFICATION != \
       allauth_settings.EmailVerificationMethod.NONE:
        # emails
        urlpatterns += [
            re_path(r'^account-confirm-email/(?P<key>[-:\w]+)/$', ConfirmEmailViewEx.as_view(),
                name='account_confirm_email'),
        ]

urlpatterns = [path('auth/', include(urlpatterns))]
