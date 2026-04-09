# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus
from time import sleep
from unittest.mock import MagicMock, patch

import pytest

from shared.utils.config import make_api_client

from .utils import create_webhook, get_method, patch_method, post_method


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookRetryConfiguration:
    """Test webhook retry configuration settings"""

    def test_can_create_webhook_with_retry_config(self, projects):
        project_id = list(projects)[0]["id"]

        webhook_data = {
            "target_url": "http://example.com/webhook",
            "description": "Test webhook with retries",
            "content_type": "application/json",
            "events": ["create:task"],
            "type": "project",
            "project_id": project_id,
            "max_retries": 5,
            "retry_delay": 120,
            "retry_backoff_factor": 1.5,
        }

        response = post_method("admin1", "webhooks", webhook_data)
        assert response.status_code == HTTPStatus.CREATED

        webhook = response.json()
        assert webhook["max_retries"] == 5
        assert webhook["retry_delay"] == 120
        assert webhook["retry_backoff_factor"] == 1.5

    def test_webhook_defaults_to_retry_enabled(self, projects):
        project_id = list(projects)[0]["id"]

        webhook_data = {
            "target_url": "http://example.com/webhook",
            "description": "Test webhook",
            "content_type": "application/json",
            "events": ["create:task"],
            "type": "project",
            "project_id": project_id,
        }

        response = post_method("admin1", "webhooks", webhook_data)
        assert response.status_code == HTTPStatus.CREATED

        webhook = response.json()
        assert webhook["max_retries"] == 3  # default
        assert webhook["retry_delay"] == 60  # default
        assert webhook["retry_backoff_factor"] == 2.0  # default

    def test_can_disable_retries(self, projects):
        project_id = list(projects)[0]["id"]

        webhook_data = {
            "target_url": "http://example.com/webhook",
            "description": "No retries",
            "content_type": "application/json",
            "events": ["create:task"],
            "type": "project",
            "project_id": project_id,
            "max_retries": 0,
        }

        response = post_method("admin1", "webhooks", webhook_data)
        assert response.status_code == HTTPStatus.CREATED

        webhook = response.json()
        assert webhook["max_retries"] == 0

    def test_can_update_retry_config(self, projects):
        project_id = list(projects)[0]["id"]

        webhook_data = {
            "target_url": "http://example.com/webhook",
            "description": "Test webhook",
            "content_type": "application/json",
            "events": ["create:task"],
            "type": "project",
            "project_id": project_id,
        }

        response = post_method("admin1", "webhooks", webhook_data)
        webhook_id = response.json()["id"]

        update_data = {
            "max_retries": 10,
            "retry_delay": 300,
            "retry_backoff_factor": 3.0,
        }

        response = patch_method("admin1", f"webhooks/{webhook_id}", update_data)
        assert response.status_code == HTTPStatus.OK

        webhook = response.json()
        assert webhook["max_retries"] == 10
        assert webhook["retry_delay"] == 300
        assert webhook["retry_backoff_factor"] == 3.0


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookRetryBehavior:
    """Test webhook retry execution behavior"""

    @patch("cvat.apps.webhooks.signals.make_requests_session")
    def test_failed_webhook_schedules_retry(self, mock_session, projects):
        """Test that a failed webhook delivery schedules a retry"""
        project_id = list(projects)[0]["id"]

        # Mock failed response (503 Service Unavailable)
        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_response.raw.read.return_value = b"Service Unavailable"

        mock_session_instance = MagicMock()
        mock_session_instance.post.return_value = mock_response
        mock_session_instance.__enter__.return_value = mock_session_instance
        mock_session_instance.__exit__.return_value = None
        mock_session.return_value = mock_session_instance

        webhook = create_webhook(["create:task"], "project", project_id=project_id)

        # Trigger webhook by creating a task
        task_data = {"name": "test task", "project_id": project_id}
        response = post_method("admin1", "tasks", task_data)
        assert response.status_code == HTTPStatus.CREATED

        # Wait a bit for async processing
        sleep(2)

        # Check delivery was created with retry scheduled
        response = get_method("admin1", f"webhooks/{webhook['id']}/deliveries")
        assert response.status_code == HTTPStatus.OK

        deliveries = response.json()["results"]
        assert len(deliveries) > 0

        delivery = deliveries[0]
        assert delivery["status_code"] == 503
        assert delivery["attempt_number"] == 1
        assert delivery["next_retry_date"] is not None

    @patch("cvat.apps.webhooks.signals.make_requests_session")
    def test_successful_webhook_no_retry(self, mock_session, projects):
        """Test that a successful webhook delivery does not schedule retry"""
        project_id = list(projects)[0]["id"]

        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raw.read.return_value = b'{"success": true}'

        mock_session_instance = MagicMock()
        mock_session_instance.post.return_value = mock_response
        mock_session_instance.__enter__.return_value = mock_session_instance
        mock_session_instance.__exit__.return_value = None
        mock_session.return_value = mock_session_instance

        webhook = create_webhook(["create:task"], "project", project_id=project_id)

        # Trigger webhook
        task_data = {"name": "test task", "project_id": project_id}
        response = post_method("admin1", "tasks", task_data)
        assert response.status_code == HTTPStatus.CREATED

        sleep(2)

        # Check delivery has no retry scheduled
        response = get_method("admin1", f"webhooks/{webhook['id']}/deliveries")
        deliveries = response.json()["results"]

        delivery = deliveries[0]
        assert delivery["status_code"] == 200
        assert delivery["attempt_number"] == 1
        assert delivery["next_retry_date"] is None

    @patch("cvat.apps.webhooks.signals.make_requests_session")
    def test_webhook_with_retries_disabled_no_retry(self, mock_session, projects):
        """Test that webhook with retries disabled does not schedule retry even on failure"""
        project_id = list(projects)[0]["id"]

        # Mock failed response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raw.read.return_value = b"Internal Server Error"

        mock_session_instance = MagicMock()
        mock_session_instance.post.return_value = mock_response
        mock_session_instance.__enter__.return_value = mock_session_instance
        mock_session_instance.__exit__.return_value = None
        mock_session.return_value = mock_session_instance

        webhook_data = {
            "target_url": "http://example.com/webhook",
            "description": "No retries",
            "content_type": "application/json",
            "events": ["create:task"],
            "type": "project",
            "project_id": project_id,
            "max_retries": 0,
        }

        response = post_method("admin1", "webhooks", webhook_data)
        webhook = response.json()

        # Trigger webhook
        task_data = {"name": "test task", "project_id": project_id}
        response = post_method("admin1", "tasks", task_data)
        assert response.status_code == HTTPStatus.CREATED

        sleep(2)

        # Check delivery has no retry scheduled
        response = get_method("admin1", f"webhooks/{webhook['id']}/deliveries")
        deliveries = response.json()["results"]

        delivery = deliveries[0]
        assert delivery["status_code"] == 500
        assert delivery["next_retry_date"] is None

    def test_delivery_shows_attempt_number(self, projects):
        """Test that delivery records show attempt number"""
        project_id = list(projects)[0]["id"]

        webhook = create_webhook(["create:task"], "project", project_id=project_id)

        # Trigger webhook
        task_data = {"name": "test task", "project_id": project_id}
        response = post_method("admin1", "tasks", task_data)
        assert response.status_code == HTTPStatus.CREATED

        sleep(2)

        # Check delivery includes attempt number
        response = get_method("admin1", f"webhooks/{webhook['id']}/deliveries")
        deliveries = response.json()["results"]

        assert len(deliveries) > 0
        delivery = deliveries[0]
        assert "attempt_number" in delivery
        assert delivery["attempt_number"] >= 1


@pytest.mark.usefixtures("restore_db_per_function")
class TestRetryableStatusCodes:
    """Test which status codes trigger retries"""

    @pytest.mark.parametrize("status_code,should_retry", [
        (200, False),  # Success
        (201, False),  # Created
        (400, False),  # Bad Request (client error, don't retry)
        (401, False),  # Unauthorized (client error, don't retry)
        (404, False),  # Not Found (client error, don't retry)
        (408, True),   # Request Timeout (should retry)
        (429, True),   # Too Many Requests (should retry)
        (500, True),   # Internal Server Error (should retry)
        (502, True),   # Bad Gateway (should retry)
        (503, True),   # Service Unavailable (should retry)
        (504, True),   # Gateway Timeout (should retry)
    ])
    @patch("cvat.apps.webhooks.signals.make_requests_session")
    def test_status_code_retry_behavior(self, mock_session, status_code, should_retry, projects):
        """Test that appropriate status codes trigger retries"""
        from cvat.apps.webhooks.signals import should_retry as should_retry_fn
        from cvat.apps.webhooks.models import Webhook

        # Create a webhook with retries enabled
        webhook = Webhook(max_retries=3)

        result = should_retry_fn(status_code, webhook)
        assert result == should_retry
