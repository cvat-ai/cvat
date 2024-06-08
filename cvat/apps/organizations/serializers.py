# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from attr.converters import to_bool
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction

from rest_framework import serializers
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.iam.utils import get_dummy_user
from .models import Invitation, Membership, Organization

class OrganizationReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True)
    class Meta:
        model = Organization
        fields = ['id', 'slug', 'name', 'description', 'created_date',
            'updated_date', 'contact', 'owner']
        read_only_fields = fields

class BasicOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'slug']
        read_only_fields = fields

class OrganizationWriteSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        serializer = OrganizationReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Organization
        fields = ['slug', 'name', 'description', 'contact', 'owner']

        # TODO: at the moment isn't possible to change the owner. It should
        # be a separate feature. Need to change it together with corresponding
        # Membership. Also such operation should be well protected.
        read_only_fields = ['owner']

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
    organization_info = BasicOrganizationSerializer(source='membership.organization')
    owner = BasicUserSerializer(allow_null=True)

    class Meta:
        model = Invitation
        fields = ['key', 'created_date', 'owner', 'role', 'user', 'organization', 'expired', 'organization_info']
        read_only_fields = fields
        extra_kwargs = {
            'expired': {
                'allow_null': True,
            }
        }

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

    @transaction.atomic
    def create(self, validated_data):
        membership_data = validated_data.pop('membership')
        organization = validated_data.pop('organization')
        try:
            user = get_user_model().objects.get(
                email__iexact=membership_data['user']['email'])
            del membership_data['user']
        except ObjectDoesNotExist:
            user_email = membership_data['user']['email']
            user = User.objects.create_user(username=user_email, email=user_email)
            user.set_unusable_password()
            # User.objects.create_user(...) normalizes passed email and user.email can be different from original user_email
            email = EmailAddress.objects.create(user=user, email=user.email, primary=True, verified=False)
            user.save()
            email.save()
            del membership_data['user']
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

    def save(self, request, **kwargs):
        invitation = super().save(**kwargs)
        dummy_user = get_dummy_user(invitation.membership.user.email)
        if not to_bool(settings.ORG_INVITATION_CONFIRM) and not dummy_user:
            invitation.accept()
        else:
            invitation.send(request)

        return invitation

class MembershipReadSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer()

    class Meta:
        model = Membership
        fields = ['id', 'user', 'organization', 'is_active', 'joined_date', 'role',
            'invitation']
        read_only_fields = fields
        extra_kwargs = {
            'invitation': {
                'allow_null': True, # owner of an organization does not have an invitation
            }
        }

class MembershipWriteSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        serializer = MembershipReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Membership
        fields = ['id', 'user', 'organization', 'is_active', 'joined_date', 'role']
        read_only_fields = ['user', 'organization', 'is_active', 'joined_date']

class AcceptInvitationReadSerializer(serializers.Serializer):
    organization_slug = serializers.CharField()
