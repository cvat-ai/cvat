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

from django.views.decorators.clickjacking import xframe_options_exempt
from django.http import HttpResponse

from . import forms
from . import signature

@xframe_options_exempt
def sign_in_user(request):
    if request.method == 'POST':
        username=request.POST['username']
        password=request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return HttpResponse(user.id)
        else:
            return HttpResponse("Your username and password didn't match. Please try again.")
    if request.method=='GET':
           return HttpResponse("get request")


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

class SigningView(views.APIView):
    def post(self, request):
        url = request.data.get('url')
        if not url:
            raise ValidationError('Please provide `url` parameter')

        signer = signature.Signer()
        url = self.request.build_absolute_uri(url)
        sign = signer.sign(self.request.user, url)

        url = furl(url).add({signature.QUERY_PARAM: sign}).url
        return Response(url)
