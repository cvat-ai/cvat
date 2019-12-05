
# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from functools import wraps
from django.views.generic import RedirectView
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.http import JsonResponse
from django.conf import settings
from cvat.apps.authentication.auth import TokenAuthentication

def login_required(function=None, redirect_field_name=REDIRECT_FIELD_NAME,
    login_url=None, redirect_methods=['GET']):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
            else:
                tokenAuth = TokenAuthentication()
                auth = tokenAuth.authenticate(request)
                if auth is not None:
                    return view_func(request, *args, **kwargs)

                login_url = '{}/login'.format(settings.UI_URL)
                if request.method not in redirect_methods:
                    return JsonResponse({'login_page_url': login_url}, status=403)

                return RedirectView.as_view(
                    url=login_url,
                    permanent=True,
                    query_string=True
                )(request)
        return _wrapped_view
    return decorator(function) if function else decorator
