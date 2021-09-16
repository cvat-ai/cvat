# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import serializers
from .models import Organization, Member

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "description", "created_date", "updated_date", "owner"]
        read_only_fields = ["created_date", "updated_date"]

class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = ["user", "role", "organization", "is_active", "date_joined"]
        read_only_fields = ["date_joined"]