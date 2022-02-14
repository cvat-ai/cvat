# Copyright (C) 2021-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from .models import Invitation, Membership, Organization
from cvat.apps.engine.serializers import BasicUserSerializer

class OrganizationReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer()
    class Meta:
        model = Organization
        fields = ['id', 'slug', 'name', 'description', 'created_date',
            'updated_date', 'contact', 'owner']
        read_only_fields = fields

class OrganizationWriteSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        serializer = OrganizationReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Organization
        fields = ['id', 'slug', 'name', 'description', 'created_date',
            'updated_date', 'contact', 'owner']

        # TODO: at the moment isn't possible to change the owner. It should
        # be a separate feature. Need to change it together with corresponding
        # Membership. Also such operation should be well protected.
        read_only_fields = ['created_date', 'updated_date', 'owner']

    def create(self, validated_data):
        organization = super().create(validated_data)
        Membership.objects.create(
            user=organization.owner,
            organization=organization,
            is_active=True,
            joined_date=organization.created_date,
            role=Membership.OWNER)

        return organization

class InvitationReadSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(Membership.role.field.choices,
        source='membership.role')
    user = BasicUserSerializer(source='membership.user')
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        source='membership.organization')
    owner = BasicUserSerializer()

    class Meta:
        model = Invitation
        fields = ['key', 'created_date', 'owner', 'role', 'user', 'organization']
        read_only_fields = fields


class InvitationWriteSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(Membership.role.field.choices,
        source='membership.role')
    email = serializers.EmailField(source='membership.user.email')
    organization = serializers.PrimaryKeyRelatedField(
        source='membership.organization', read_only=True)

    def to_representation(self, instance):
        serializer = InvitationReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Invitation
        fields = ['key', 'created_date', 'owner', 'role', 'organization', 'email']
        read_only_fields = ['key', 'created_date', 'owner', 'organization']

    def create(self, validated_data):
        membership_data = validated_data.pop('membership')
        organization = validated_data.pop('organization')
        try:
            user = get_user_model().objects.get(
                email__iexact=membership_data['user']['email'])
            del membership_data['user']
        except ObjectDoesNotExist:
            raise serializers.ValidationError(f'You cannot invite an user '
                f'with {membership_data["user"]["email"]} email. It is not '
                f'a valid email in the system.')

        membership, created = Membership.objects.get_or_create(
            defaults=membership_data,
            user=user, organization=organization)
        if not created:
            raise serializers.ValidationError('The user is a member of '
                'the organization already.')
        invitation = Invitation.objects.create(**validated_data,
            membership=membership)

        return invitation

    def update(self, instance, validated_data):
        return super().update(instance, {})

    def save(self, **kwargs):
        invitation = super().save(**kwargs)
        invitation.send()

        return invitation

class MembershipReadSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer()
    class Meta:
        model = Membership
        fields = ['id', 'user', 'organization', 'is_active', 'joined_date', 'role',
            'invitation']
        read_only_fields = fields

class MembershipWriteSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        serializer = MembershipReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Membership
        fields = ['id', 'user', 'organization', 'is_active', 'joined_date', 'role']
        read_only_fields = ['user', 'organization', 'is_active', 'joined_date']
