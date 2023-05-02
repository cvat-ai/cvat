import pytest
from http import HTTPStatus
from shared.utils.config import get_method


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetLambdaRequests:
    def test_user_can_requests_list(self):
        response = get_method("user1", "lambda/requests")

        assert response.status_code == HTTPStatus.OK
