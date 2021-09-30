# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Invitation, Membership, Organization

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'slug', 'name', 'description', 'created_date',
            'updated_date', 'company', 'email', 'location', 'owner']
        read_only_fields = ['created_date', 'updated_date', 'owner']

class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ['id', 'user', 'organization', 'is_active', 'joined_date', 'role']
        read_only_fields = ['is_active', 'joined_date']

class InvitationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=[
        (Membership.WORKER, 'Worker'),
        (Membership.SUPERVISOR, 'Supervisor'),
        (Membership.MAINTAINER, 'Maintainer'),
    ])
    user = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all())
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all())

    class Meta:
        model = Invitation
        fields = ['key', 'accepted', 'created_date', 'owner', 'role',
            'user', 'organization']
        read_only_fields = ['key', 'accepted', 'created_date', 'owner']

    def create(self, validated_data):
        membership_data = {
            'organization': validated_data.pop('organization'),
            'role': validated_data.pop('role'),
            'user': validated_data.pop('user'),
        }
        membership = Membership.objects.create(**membership_data)
        invitation = Invitation.objects.create(**validated_data,
            membership=membership)

        return invitation


    def save(self, **kwargs):
        invitation = super().save(**kwargs)
        invitation.send()

        return invitation
