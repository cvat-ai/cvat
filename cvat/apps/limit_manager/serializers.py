from rest_framework.serializers import ModelSerializer, SlugRelatedField

from django.conf import settings
from cvat.apps.engine.models import User
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.organizations.serializers import OrganizationReadSerializer
from cvat.apps.organizations.models import Organization

from .models import Limitation

org_limitation_fields = tuple(settings.ORG_LIMITS_MAPPING.values())
user_limitation_fields = tuple(settings.USER_LIMITS_MAPPING.values())


class UserLimitationReadSerializer(ModelSerializer):
    user = BasicUserSerializer(required=False)

    class Meta:
        model = Limitation
        fields = (
            "id",
            "user",
            "type"
        ) + user_limitation_fields


class OrgLimitationReadSerializer(ModelSerializer):
    org = OrganizationReadSerializer(required=False)

    class Meta:
        model = Limitation
        fields = (
            "id",
            "org",
            "type"
        ) + org_limitation_fields


class UserLimitationWriteSerializer(ModelSerializer):
    user = SlugRelatedField(slug_field="id", queryset=User.objects.all())

    class Meta:
        model = Limitation
        fields = ("user", "type") + user_limitation_fields

    def create(self, validated_data):
        user_limitation = Limitation.objects.create(**validated_data)
        return user_limitation


class OrgLimitationWriteSerializer(ModelSerializer):
    org = SlugRelatedField(slug_field="id", queryset=Organization.objects.all())

    class Meta:
        model = Limitation
        fields = ("org", "type") + org_limitation_fields

    def create(self, validated_data):
        org_limitation = Limitation.objects.create(**validated_data)
        return org_limitation
