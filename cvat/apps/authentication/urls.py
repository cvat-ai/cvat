
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import path
import os

from django.contrib.auth import views as auth_views
from . import forms
from . import views
from .settings.authentication import DJANGO_AUTH_TYPE

login_page = 'login{}.html'.format('_ldap' if DJANGO_AUTH_TYPE == 'LDAP' else '')

urlpatterns = [
    path('login', auth_views.LoginView.as_view(form_class=forms.AuthForm, template_name=login_page), name='login'),
    path('logout', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('register', views.register_user, name='register'),
]
