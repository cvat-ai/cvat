# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re
from unittest.mock import MagicMock, patch

from allauth.account.models import EmailAddress
from django.core import mail
from django.test import override_settings
from django.urls import re_path, reverse
from django.views.generic import RedirectView
from rest_framework import serializers, status

from cvat.apps.engine.tests.utils import ApiTestBase
from cvat.apps.iam.models import User
from cvat.apps.iam.views import ConfirmEmailViewEx
from cvat.apps.webhooks.models import WebhookDelivery, WebhookTypeChoice
from cvat.urls import urlpatterns as original_urlpatterns

from .utils import make_webhook

urlpatterns = original_urlpatterns + [
    re_path(
        r"^account-confirm-email/(?P<key>[-:\w]+)/$",
        ConfirmEmailViewEx.as_view(),
        name="account_confirm_email",
    ),
    re_path(r"^unused-account-login/$", RedirectView.as_view(url="/"), name="account_login"),
]

CONFIRMATION_LINK_RE = re.compile(r"/account-confirm-email/(?P<key>[-:\w]+)/")


@override_settings(
    ACCOUNT_SIGNUP_FIELDS=["email*", "username*", "password1*", "password2*"],
    ACCOUNT_EMAIL_VERIFICATION="mandatory",
    ACCOUNT_CONFIRM_EMAIL_ON_GET=True,
    ROOT_URLCONF=__name__,
)
class TestServerWebhooksOnRegistration(ApiTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.webhook = make_webhook(
            _type=WebhookTypeChoice.SERVER.value,
            events="create:user,update:user",
            owner=User.objects.create(username="server_webhook_owner"),
            project=None,
        )

    def _register(self) -> dict:
        response = self._post_request(
            reverse("rest_register"),
            None,
            data={
                "username": "webhook_registration_user",
                "email": "webhook_registration_user@email.com",
                "password1": "$Test357Test%",
                "password2": "$Test357Test%",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        return response.data

    def _deliveries_for_user(self, user_id: int) -> list[dict]:
        return [
            delivery.request
            for delivery in WebhookDelivery.objects.filter(webhook=self.webhook).order_by("id")
            if delivery.request["user"]["id"] == user_id
        ]

    @patch("cvat.apps.webhooks.utils.perform_webhook_request")
    def test_registration_and_email_confirmation_produce_webhooks(
        self, perform_request: MagicMock
    ) -> None:
        perform_request.return_value = (200, "")

        # Step 1: register the user.
        with self.captureOnCommitCallbacks(execute=True):
            self._register()

        db_user = User.objects.get(username="webhook_registration_user")

        db_email_address = EmailAddress.objects.get(user_id=db_user.id)
        self.assertFalse(db_email_address.verified)

        _shared_user_body = {
            "id": db_user.id,
            "url": f"http://testserver/api/users/{db_user.id}",
            "username": "webhook_registration_user",
            "first_name": "",
            "last_name": "",
            "email": "webhook_registration_user@email.com",
            "groups": ["user"],
            "is_staff": False,
            "is_superuser": False,
            "is_active": True,
            "last_login": None,
            "date_joined": serializers.DateTimeField().to_representation(db_user.date_joined),
            "created_via": "registration",
        }
        _empty_profile_body = {
            "cvat_usage_reason": None,
            "primary_role": None,
            "planned_activities": [],
            "data_types": [],
            "discovery_source": None,
        }

        expected_webhook_deliveries_after_registration = [
            {
                "event": "update:user",
                "webhook_id": self.webhook.id,
                "sender": None,
                "user": {
                    **_shared_user_body,
                    "has_analytics_access": None,
                    "cvat_usage_reason": None,
                    "primary_role": None,
                    "planned_activities": None,
                    "data_types": None,
                    "discovery_source": None,
                    "email_verified": None,
                },
            },
            {
                "event": "update:user",
                "webhook_id": self.webhook.id,
                "sender": None,
                "user": {
                    **_shared_user_body,
                    **_empty_profile_body,
                    "has_analytics_access": False,
                    "email_verified": None,
                },
            },
            {
                "event": "create:user",
                "webhook_id": self.webhook.id,
                "sender": None,
                "user": {
                    **_shared_user_body,
                    **_empty_profile_body,
                    "has_analytics_access": False,
                    "email_verified": None,
                },
            },
            {
                "event": "update:user",
                "webhook_id": self.webhook.id,
                "sender": None,
                "user": {
                    **_shared_user_body,
                    **_empty_profile_body,
                    "has_analytics_access": False,
                    "email_verified": False,
                },
            },
        ]

        self.assertEqual(
            self._deliveries_for_user(db_user.id), expected_webhook_deliveries_after_registration
        )

        # Step 2: follow the real confirmation link from the sent email and confirm it.
        confirmation_email = mail.outbox[-1]
        match = CONFIRMATION_LINK_RE.search(confirmation_email.body)
        self.assertIsNotNone(match, confirmation_email.body)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.get(reverse("account_confirm_email", args=[match.group("key")]))

        self.assertEqual(response.status_code, status.HTTP_302_FOUND, response.content)

        self.assertTrue(EmailAddress.objects.get(pk=db_email_address.pk).verified)

        expected_webhook_deliveries_after_confirmation = [
            {
                "event": "update:user",
                "webhook_id": self.webhook.id,
                "sender": None,
                "user": {
                    **_shared_user_body,
                    **_empty_profile_body,
                    "has_analytics_access": False,
                    "email_verified": True,
                },
            },
        ]

        self.assertEqual(
            self._deliveries_for_user(db_user.id)[
                len(expected_webhook_deliveries_after_registration) :
            ],
            expected_webhook_deliveries_after_confirmation,
        )


class TestServerWebhooksOnInvitation(ApiTestBase):
    org_slug = "testorg"

    @classmethod
    def setUpClass(cls):
        cls.admin = User.objects.create_superuser(username="admin", email="", password="admin")
        return super().setUpClass()

    def setUp(self):
        super().setUp()
        response = self._post_request(
            "/api/organizations",
            self.admin,
            data={"slug": self.org_slug, "name": "Test organization"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        self.webhook = make_webhook(
            _type=WebhookTypeChoice.SERVER.value,
            events="create:user",
            owner=self.admin,
            project=None,
        )

    def _invite(self, email: str):
        return self._post_request(
            "/api/invitations",
            self.admin,
            data={"role": "worker", "email": email},
            query_params={"org": self.org_slug},
        )

    def test_can_send_webhook_after_inviting_unregistered_user(self):
        user_email = "invited@test.com"

        with self.captureOnCommitCallbacks(execute=True):
            response = self._invite(user_email)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        deliveries = list(WebhookDelivery.objects.filter(webhook=self.webhook).order_by("id").all())
        self.assertEqual(len(deliveries), 1)

        delivery = deliveries[0]
        self.assertEqual(delivery.webhook.id, self.webhook.id)
        self.assertEqual(delivery.event, "create:user")
        self.assertEqual(delivery.request["user"]["email"], user_email)
