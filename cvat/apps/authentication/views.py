# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib.auth import login, authenticate
from rest_framework import views
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from furl import furl

from . import forms
from . import signature

from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

def register_user(request):
    if request.method == 'POST':
        form = forms.NewUserForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            return redirect(settings.LOGIN_REDIRECT_URL)
    else:
        form = forms.NewUserForm()
    return render(request, 'register.html', {'form': form})

@method_decorator(name='post', decorator=swagger_auto_schema(
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=[
            'url'
        ],
        properties={
            'url': openapi.Schema(type=openapi.TYPE_STRING)
        }
    ),
    responses={'200': openapi.Response(description='text URL')}
))
class SigningView(views.APIView):
    """
    This method signs URL for access to the server.

    Signed URL contains a token which authenticates a user on the server.
    Signed URL is valid during 30 seconds since signing.
    """
    def post(self, request):
        url = request.data.get('url')
        if not url:
            raise ValidationError('Please provide `url` parameter')

        signer = signature.Signer()
        url = self.request.build_absolute_uri(url)
        sign = signer.sign(self.request.user, url)

        url = furl(url).add({signature.QUERY_PARAM: sign}).url
        return Response(url)
