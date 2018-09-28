
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth.forms import (
    UsernameField,
    AuthenticationForm,
    UserCreationForm,
)
from django.utils.translation import gettext, gettext_lazy as _
from django.contrib.auth.models import User

from django import forms

class AuthForm(AuthenticationForm):
    username = UsernameField(
        widget=forms.TextInput(attrs={'autofocus': True, 'placeholder': "Username"}),
    )
    password = forms.CharField(
        label=_("Password"),
        strip=False,
        widget=forms.PasswordInput(attrs={'placeholder': "Password"}),
    )

class NewUserForm(UserCreationForm):
    username = UsernameField(
        widget=forms.TextInput(attrs={'autofocus': True, 'placeholder': "Username (required)"}),
        required=True,
    )

    first_name = UsernameField(
        widget=forms.TextInput(attrs={'placeholder': "First name"}),
        required=False,
    )

    last_name = UsernameField(
        widget=forms.TextInput(attrs={'placeholder': "Last name"}),
        required=False,
    )

    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'placeholder': "Email (required)"}),
        required=True,
    )

    password1 = forms.CharField(
        label=_("Password"),
        strip=False,
        widget=forms.PasswordInput(attrs={'placeholder': "Password (required)"}),
    )
    password2 = forms.CharField(
        label=_("Password confirmation"),
        widget=forms.PasswordInput(attrs={'placeholder': "Password confirmation (required)"}),
        strip=False,
    )

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', )
