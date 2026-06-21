# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from django.contrib.auth.models import Group
from django.test import RequestFactory, TestCase

from cvat.apps.iam.middleware import (
    ORGANIZATION_ALL_ID,
    get_organization,
    infer_organization_from_resource_filters,
)
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
        from django.contrib.auth.models import User

        return User.objects.create_user(username=username, password="pass")

    def _get_context(self, query_string: str = ""):
        request = self.factory.get(f"/api/tasks{query_string}")
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

    def test_org_id_zero_returns_all_organizations(self):
        context = self._get_context(f"?org_id={ORGANIZATION_ALL_ID}")

        assert context["organization"] is None
        assert context["organization_specified"] is False

    def test_org_slug_selects_organization(self):
        context = self._get_context("?org=testorg")

        assert context["organization"] == self.organization
        assert context["organization_specified"] is True

    @patch("cvat.apps.iam.middleware.infer_organization_from_resource_filters")
    def test_job_id_triggers_organization_inference_in_sandbox_context(self, infer_mock):
        infer_mock.return_value = self.organization

        context = self._get_context("?org=&job_id=1")

        infer_mock.assert_called_once()
        assert context["organization"] == self.organization
        assert context["organization_specified"] is True


class InferOrganizationFromResourceFiltersTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.organization = Organization.objects.create(slug="testorg", name="Test Org")

    def test_returns_none_when_no_resource_filter_is_present(self):
        request = self.factory.get("/api/labels")

        assert infer_organization_from_resource_filters(request) is None

    @patch("cvat.apps.engine.models.Job.objects.filter")
    def test_returns_organization_for_job_id(self, job_filter):
        job_filter.return_value.values_list.return_value.first.return_value = self.organization.id
        request = self.factory.get(f"/api/labels?job_id=1")

        inferred = infer_organization_from_resource_filters(request)

        assert inferred == self.organization
