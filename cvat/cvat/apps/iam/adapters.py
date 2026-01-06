# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings
from django.http import HttpResponseRedirect


class DefaultAccountAdapterEx(DefaultAccountAdapter):
    def respond_email_verification_sent(self, request, user):
        return HttpResponseRedirect(settings.ACCOUNT_EMAIL_VERIFICATION_SENT_REDIRECT_URL)
