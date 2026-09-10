# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import RequestFactory, TestCase
from rest_framework.exceptions import ValidationError

from cvat.apps.iam.middleware import get_organization
from cvat.apps.organizations.models import Organization


class OrganizationMiddlewareTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = self._create_user("tester")
        admin_group, _ = Group.objects.get_or_create(name="admin")
        self.user.groups.add(admin_group)
        self.organization = Organization.objects.create(slug="testorg", name="Test Org")

    @staticmethod
    def _create_user(username: str):
        return get_user_model().objects.create_user(username=username, password="pass")

    def _get_context(self, query_string: str = "", *, headers: dict[str, Any] | None = None):
        request = self.factory.get(f"/api/tasks{query_string}", headers=headers)
        request.user = self.user
        return get_organization(request)

    def test_no_org_parameter_returns_all_organizations(self):
        context = self._get_context()

        assert context["organization"] is None
        assert context["organization_specified"] is False

    def test_empty_org_parameter_returns_sandbox(self):
        context = self._get_context("?org=")

        assert context["organization"] is None
        assert context["organization_specified"] is True

    def test_empty_org_id_parameter_returns_sandbox(self):
        context = self._get_context("?org_id=")

        assert context["organization"] is None
        assert context["organization_specified"] is True

    def test_org_slug_selects_organization(self):
        context = self._get_context("?org=testorg")

        assert context["organization"] == self.organization
        assert context["organization_specified"] is True

    def test_org_id_selects_organization(self):
        context = self._get_context(f"?org_id={self.organization.id}")

        assert context["organization"] == self.organization
        assert context["organization_specified"] is True

    def test_org_filters_cannot_be_used_together(self):
        with self.assertRaisesRegex(ValidationError, r"cannot specify \"org_id\".*with.*\"org\""):
            self._get_context(f"?org_id={self.organization.id}&org={self.organization.slug}")

        with self.assertRaisesRegex(ValidationError, r"cannot specify \"org_id\".*with.*\"org\""):
            self._get_context(
                f"?org_id={self.organization.id}",
                headers={"X-Organization": self.organization.slug},
            )

        with self.assertRaisesRegex(
            ValidationError, r"cannot specify \"org\".*and.*\"X-Organization\""
        ):
            self._get_context(
                f"?org={self.organization.slug}",
                headers={"X-Organization": "not" + self.organization.slug},
            )
