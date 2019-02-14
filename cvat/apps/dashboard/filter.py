# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import django_filters

from cvat.apps.engine.models import Task

class DashboardFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    owner = django_filters.CharFilter(field_name='owner__username', lookup_expr='exact')
    assignee = django_filters.CharFilter(field_name='assignee__username', lookup_expr='exact')

    class Meta:
        model = Task
        fields = ['name', 'mode', 'assignee', 'owner', 'status']
