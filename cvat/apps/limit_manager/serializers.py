from rest_framework.serializers import ModelSerializer, SlugRelatedField

from cvat.apps.engine.models import User
from cvat.apps.engine.serializers import BasicUserSerializer
from cvat.apps.organizations.serializers import OrganizationReadSerializer
from cvat.apps.organizations.models import Organization

from .models import Limitation

general_limitation_fields = (
    "tasks",
    "projects",
    "cloud_storages",
    "lambda_requests",
    "webhooks_per_project",
    "tasks_per_project",
)

user_limitation_fields = ("organizations",) + general_limitation_fields

org_limitation_fields = (
    "webhooks_per_organization",
    "memberships",
) + general_limitation_fields


class UserLimitationReadSerializer(ModelSerializer):
    user = BasicUserSerializer(required=False)

    class Meta:
        model = Limitation
        fields = (
            "id",
            "user",
        ) + user_limitation_fields


class OrgLimitationReadSerializer(ModelSerializer):
    org = OrganizationReadSerializer(required=False)

    class Meta:
        model = Limitation
        fields = (
            "id",
            "org",
        ) + org_limitation_fields


class UserLimitationWriteSerializer(ModelSerializer):
    user = SlugRelatedField(slug_field="id", queryset=User.objects.all())

    class Meta:
        model = Limitation
        fields = ("user",) + user_limitation_fields

    def create(self, validated_data):
        user_limitation = Limitation.objects.create(**validated_data)
        return user_limitation


class OrgLimitationWriteSerializer(ModelSerializer):
    org = SlugRelatedField(slug_field="id", queryset=Organization.objects.all())

    class Meta:
        model = Limitation
        fields = ("org",) + org_limitation_fields

    def create(self, validated_data):
        org_limitation = Limitation.objects.create(**validated_data)
        return org_limitation
