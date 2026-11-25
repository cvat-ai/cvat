# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from attr.converters import to_bool
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.iam.email_validation import run_email_validators
from cvat.apps.iam.models import UserCreationMethod
from cvat.apps.iam.utils import get_dummy_or_regular_user

from .models import Invitation, Membership, Organization


class OrganizationReadSerializer(serializers.ModelSerializer):
    owner = BasicUserSerializer(allow_null=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "created_date",
            "updated_date",
            "contact",
            "owner",
        ]
        read_only_fields = fields


class BasicOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "slug"]
        read_only_fields = fields


class OrganizationWriteSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(write_only=True, required=False)

    def to_representation(self, instance):
        serializer = OrganizationReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Organization
        fields = ["slug", "name", "description", "contact", "owner_id"]

    def validate(self, attrs: dict) -> dict:
        if self.instance is None and "owner_id" in attrs:
            raise serializers.ValidationError(
                {"owner_id": "The owner cannot be set when an organization is created"}
            )

        return super().validate(attrs)

    @transaction.atomic
    def update(self, instance: Organization, validated_data: dict) -> Organization:
        owner_id = validated_data.pop("owner_id", None)
        if owner_id is not None and owner_id != instance.owner_id:
            self._transfer_ownership(instance, new_owner_id=owner_id)

        return super().update(instance, validated_data)

    def _transfer_ownership(self, instance: Organization, new_owner_id: int) -> None:
        current_owner_id = (
            Organization.objects.select_for_update()
            .values_list("owner_id", flat=True)
            .get(pk=instance.pk)
        )
        if current_owner_id != instance.owner_id:
            raise serializers.ValidationError(
                {"owner_id": "The organization owner has changed. Reload and try again"}
            )

        new_owner_membership = Membership.objects.filter(
            organization=instance,
            user_id=new_owner_id,
            user__is_active=True,
            is_active=True,
            role=Membership.MAINTAINER,
        ).first()
        if not new_owner_membership:
            raise serializers.ValidationError(
                {"owner_id": "The new owner must be an active maintainer of the organization"}
            )

        previous_owner_membership = Membership.objects.get(
            organization=instance, user_id=instance.owner_id
        )
        previous_owner_membership.role = Membership.MAINTAINER
        previous_owner_membership.save(update_fields=["role"])

        new_owner_membership.role = Membership.OWNER
        new_owner_membership.save(update_fields=["role"])

        instance.owner = new_owner_membership.user

    def create(self, validated_data):
        organization = super().create(validated_data)
        Membership.objects.create(
            user=organization.owner,
            organization=organization,
            is_active=True,
            joined_date=organization.created_date,
            role=Membership.OWNER,
        )

        return organization


class InvitationReadSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(Membership.role.field.choices, source="membership.role")
    user = BasicUserSerializer(source="membership.user")
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(), source="membership.organization"
    )
    organization_info = BasicOrganizationSerializer(source="membership.organization")
    owner = BasicUserSerializer(allow_null=True)

    class Meta:
        model = Invitation
        fields = [
            "key",
            "created_date",
            "owner",
            "role",
            "user",
            "organization",
            "expired",
            "accepted",
            "organization_info",
        ]
        read_only_fields = fields
        extra_kwargs = {
            "expired": {
                "allow_null": True,
            }
        }


class InvitationWriteSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(Membership.role.field.choices, source="membership.role")
    email = serializers.EmailField(source="membership.user.email")
    organization = serializers.PrimaryKeyRelatedField(
        source="membership.organization", read_only=True
    )

    def to_representation(self, instance):
        serializer = InvitationReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Invitation
        fields = ["key", "created_date", "owner", "role", "organization", "email"]
        read_only_fields = ["key", "created_date", "owner", "organization"]

    def create(self, validated_data):
        membership_data = validated_data.pop("membership")
        organization = validated_data.pop("organization")
        user_email = membership_data["user"]["email"].lower()

        user = get_user_model().objects.filter(email__iexact=user_email).first()

        if user is None:
            run_email_validators(user_email)

        del membership_data["user"]

        with transaction.atomic():
            if user is None:
                user, user_created = get_user_model().objects.get_or_create(
                    email__iexact=user_email,
                    defaults={
                        "username": user_email,
                        "email": user_email,
                        "created_via": UserCreationMethod.INVITATION,
                    },
                )
                if user_created:
                    user.set_unusable_password()
                    user.save()

            membership, membership_created = Membership.objects.get_or_create(
                defaults=membership_data,
                user=user,
                organization=organization,
            )

            if not membership_created:
                raise serializers.ValidationError(
                    "The user is a member of " "the organization already."
                )

            invitation = Invitation.objects.create(**validated_data, membership=membership)

            return invitation

    def save(self, request, **kwargs):
        invitation = super().save(**kwargs)
        _, regular_user = get_dummy_or_regular_user(invitation.membership.user.email)
        if not to_bool(settings.ORG_INVITATION_CONFIRM) and regular_user:
            invitation.accept()
        else:
            invitation.send(request)

        return invitation


class MembershipReadSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer()

    class Meta:
        model = Membership
        fields = ["id", "user", "organization", "is_active", "joined_date", "role", "invitation"]
        read_only_fields = fields
        extra_kwargs = {
            "invitation": {
                # the user who created the organization joined it without an invitation
                "allow_null": True,
            }
        }


class MembershipWriteSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        serializer = MembershipReadSerializer(instance, context=self.context)
        return serializer.data

    class Meta:
        model = Membership
        fields = ["id", "user", "organization", "is_active", "joined_date", "role"]
        read_only_fields = ["user", "organization", "is_active", "joined_date"]


class AcceptInvitationReadSerializer(serializers.Serializer):
    organization_slug = serializers.CharField()
