
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.shortcuts import render
from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect
from . import forms

from django.contrib.auth import login, authenticate
from django.shortcuts import render, redirect

def register_user(request):
    if request.method == 'POST':
        form = forms.NewUserForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user)
            return redirect('/')
    else:
        form = forms.NewUserForm()
    return render(request, 'register.html', {'form': form})
