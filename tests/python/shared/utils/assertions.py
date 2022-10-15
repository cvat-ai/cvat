from urllib3 import response
from http import HTTPStatus
import allure
import logging

from deepdiff import DeepDiff


def assert_response_status(actual_response: response.HTTPResponse,
                           expected_status_code=HTTPStatus.OK) -> None:
    with allure.step('Check response status code'):
        assert actual_response.status == expected_status_code, \
            f'Status code mismatch: expected - /{expected_status_code}/, actual - /{actual_response.status}/'
        logging.info(f'Code verification ({expected_status_code}) was successful')

def assert_deep_diff_is_empty(actual_deepdiff: DeepDiff) -> None:
    with allure.step('Check DeepDiff is empty'):
        assert actual_deepdiff == {}, \
            f'DeepDiff is not empty:\n {actual_deepdiff}'
        logging.info(f'Check DeepDiff successful')
