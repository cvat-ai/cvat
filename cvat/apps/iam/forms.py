# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from allauth.account.adapter import get_adapter
from allauth.account.forms import default_token_generator
from allauth.account.utils import user_pk_to_url_str
from dj_rest_auth.forms import AllAuthPasswordResetForm
from django.contrib.auth import get_user_model
from django.contrib.sites.shortcuts import get_current_site

UserModel = get_user_model()


class ResetPasswordFormEx(AllAuthPasswordResetForm):
    def save(
        self,
        request=None,
        domain_override=None,
        email_template_prefix="authentication/password_reset_key",
        use_https=False,
        token_generator=default_token_generator,
        extra_email_context=None,
        **kwargs,
    ):
        """
        Generate a one-use only link for resetting password and send it to the
        user.
        """
        email = self.cleaned_data["email"]
        if not domain_override:
            current_site = get_current_site(request)
            site_name = current_site.name
            domain = current_site.domain
        else:
            site_name = domain = domain_override
        email_field_name = UserModel.get_email_field_name()
        for user in self.users:
            user_email = getattr(user, email_field_name)
            context = {
                "email": user_email,
                "domain": domain,
                "site_name": site_name,
                "uid": user_pk_to_url_str(user),
                "user": user,
                "token": token_generator.make_token(user),
                "protocol": "https" if use_https else "http",
                **(extra_email_context or {}),
            }

            get_adapter(request).send_mail(email_template_prefix, email, context)

        return self.cleaned_data["email"]
