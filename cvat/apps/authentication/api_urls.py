# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from django.conf import settings
from rest_auth.views import (
    LoginView, LogoutView, PasswordChangeView,
    PasswordResetView, PasswordResetConfirmView)
from rest_auth.registration.views import RegisterView
from .views import SignatureView

urlpatterns = [
    path('login', LoginView.as_view(), name='rest_login'),
    path('logout', LogoutView.as_view(), name='rest_logout'),
    path('signature', SignatureView.as_view(), name='signature')
]

if settings.DJANGO_AUTH_TYPE == 'BASIC':
    urlpatterns += [
        path('register', RegisterView.as_view(), name='rest_register'),
        path('password/reset', PasswordResetView.as_view(),
            name='rest_password_reset'),
        path('password/reset/confirm', PasswordResetConfirmView.as_view(),
            name='rest_password_reset_confirm'),
        path('password/change', PasswordChangeView.as_view(),
            name='rest_password_change'),
    ]
