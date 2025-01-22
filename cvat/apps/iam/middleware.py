# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import timedelta
from typing import Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.utils.functional import SimpleLazyObject
from rest_framework.exceptions import NotFound, ValidationError


def get_organization(request):
    from cvat.apps.organizations.models import Organization

    IAM_ROLES = {role: priority for priority, role in enumerate(settings.IAM_ROLES)}
    groups = list(request.user.groups.filter(name__in=list(IAM_ROLES.keys())))
    groups.sort(key=lambda group: IAM_ROLES[group.name])
    privilege = groups[0] if groups else None

    organization = None

    try:
        org_slug = request.GET.get("org")
        org_id = request.GET.get("org_id")
        org_header = request.headers.get("X-Organization")

        if org_id is not None and (org_slug is not None or org_header is not None):
            raise ValidationError(
                'You cannot specify "org_id" query parameter with '
                '"org" query parameter or "X-Organization" HTTP header at the same time.'
            )

        if org_slug is not None and org_header is not None and org_slug != org_header:
            raise ValidationError(
                'You cannot specify "org" query parameter and '
                '"X-Organization" HTTP header with different values.'
            )

        org_slug = org_slug if org_slug is not None else org_header

        if org_slug:
            organization = Organization.objects.select_related("owner").get(slug=org_slug)
        elif org_id:
            organization = Organization.objects.select_related("owner").get(id=int(org_id))
    except Organization.DoesNotExist:
        raise NotFound(f"{org_slug or org_id} organization does not exist.")

    context = {"organization": organization, "privilege": getattr(privilege, "name", None)}

    return context


class ContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        # https://stackoverflow.com/questions/26240832/django-and-middleware-which-uses-request-user-is-always-anonymous
        request.iam_context = SimpleLazyObject(lambda: get_organization(request))

        return self.get_response(request)


class SessionRefreshMiddleware:
    """
    Implements behavior similar to SESSION_SAVE_EVERY_REQUEST=True, but instead of
    saving the session on every request, saves it at most once per REFRESH_INTERVAL.
    This is accomplished by setting a parallel cookie that expires whenever the session
    needs to be prolonged.

    This ensures that user sessions are automatically prolonged while in use,
    but avoids making an extra DB query on every HTTP request.

    Must be listed after SessionMiddleware in the MIDDLEWARE list.
    """

    _REFRESH_INTERVAL = timedelta(days=1)
    _COOKIE_NAME = "sessionfresh"

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        shared_cookie_args = {
            "key": self._COOKIE_NAME,
            "domain": getattr(settings, "SESSION_COOKIE_DOMAIN"),
            "path": getattr(settings, "SESSION_COOKIE_PATH", "/"),
            "samesite": getattr(settings, "SESSION_COOKIE_SAMESITE", "Lax"),
        }

        if request.session.is_empty():
            if self._COOKIE_NAME in request.COOKIES:
                response.delete_cookie(**shared_cookie_args)
            return response

        if self._COOKIE_NAME in request.COOKIES:
            # Session is still fresh.
            return response

        if response.status_code >= 500:
            # SessionMiddleware does not save the session for 5xx responses,
            # so we should not set our cookie either.
            return response

        response.set_cookie(
            **shared_cookie_args,
            value="1",
            max_age=min(
                self._REFRESH_INTERVAL,
                # Refresh no later than after half of the session lifetime.
                timedelta(seconds=request.session.get_expiry_age() // 2),
            ),
            httponly=True,
            secure=getattr(settings, "SESSION_COOKIE_SECURE", False),
        )

        # Force SessionMiddleware to re-save the session.
        request.session.modified = True

        return response
