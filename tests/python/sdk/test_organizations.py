# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.organizations import Organization


class TestOrganizationUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        fxt_login: tuple[Client, str],
        fxt_logger: tuple[Logger, io.StringIO],
        fxt_stdout: io.StringIO,
    ):
        logger, self.logger_stream = fxt_logger
        self.client, self.user = fxt_login
        self.client.logger = logger

        api_client = self.client.api_client
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger

        yield

        assert fxt_stdout.getvalue() == ""

    @pytest.fixture()
    def fxt_organization(self) -> Organization:
        org = self.client.organizations.create(
            models.OrganizationWriteRequest(
                slug="testorg",
                name="Test Organization",
                description="description",
                contact={"email": "nowhere@cvat.invalid"},
            )
        )

        try:
            yield org
        finally:
            # It's not allowed to create multiple orgs with the same slug,
            # so we have to remove the org at the end of each test.
            org.remove()

    def test_can_create_organization(self, fxt_organization: Organization):
        assert fxt_organization.slug == "testorg"
        assert fxt_organization.name == "Test Organization"
        assert fxt_organization.description == "description"
        assert fxt_organization.contact == {"email": "nowhere@cvat.invalid"}

    def test_can_retrieve_organization(self, fxt_organization: Organization):
        org = self.client.organizations.retrieve(fxt_organization.id)

        assert org.id == fxt_organization.id
        assert org.slug == fxt_organization.slug

    def test_can_list_organizations(self, fxt_organization: Organization):
        orgs = self.client.organizations.list()

        assert fxt_organization.slug in set(o.slug for o in orgs)

    def test_can_update_organization(self, fxt_organization: Organization):
        fxt_organization.update(
            models.PatchedOrganizationWriteRequest(description="new description")
        )
        assert fxt_organization.description == "new description"

        retrieved_org = self.client.organizations.retrieve(fxt_organization.id)
        assert retrieved_org.description == "new description"

    def test_can_remove_organization(self):
        org = self.client.organizations.create(models.OrganizationWriteRequest(slug="testorg2"))
        org.remove()

        with pytest.raises(exceptions.NotFoundException):
            org.fetch()
