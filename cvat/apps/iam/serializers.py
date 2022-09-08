# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import PasswordResetSerializer
from rest_framework import serializers

from django.conf import settings

from cvat.apps.iam.forms import ResetPasswordFormEx

class RegisterSerializerEx(RegisterSerializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data.update({
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
        })

        return data

class PasswordResetSerializerEx(PasswordResetSerializer):
    @property
    def password_reset_form_class(self):
        return ResetPasswordFormEx

    def get_email_options(self):
        domain = None
        if hasattr(settings, 'UI_HOST') and settings.UI_HOST:
            domain = settings.UI_HOST
            if hasattr(settings, 'UI_PORT') and settings.UI_PORT:
                domain += ':{}'.format(settings.UI_PORT)
        return {
            'domain_override': domain
        }
