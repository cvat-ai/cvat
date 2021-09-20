# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from .models import Organization

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['name', 'description', 'created_at', 'updated_at',
            'company', 'email', 'location', 'owner']
        read_only_fields = ['created_at', 'updated_at']
