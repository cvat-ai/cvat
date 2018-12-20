
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
from django.contrib.auth import views as auth_views
from django.conf import settings

from . import forms
from . import views

urlpatterns = [
    path('login', auth_views.LoginView.as_view(form_class=forms.AuthForm,
        template_name='login.html', extra_context={'note': settings.AUTH_LOGIN_NOTE}),
        name='login'),
    path('logout', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
]

if settings.DJANGO_AUTH_TYPE == 'BASIC':
    urlpatterns += [
        path('register', views.register_user, name='register'),
    ]
