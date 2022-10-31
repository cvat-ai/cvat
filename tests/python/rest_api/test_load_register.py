import gevent
import locust
import pytest
import random
import secrets
from faker import Faker
from locust.env import Environment
from locust.stats import stats_printer, stats_history

from shared.utils.config import BASE_URL, USER_PASS
from cvat_sdk.api_client import ApiClient, Configuration, exceptions
from cvat_sdk.api_client.models import RestrictedRegisterRequest
from pprint import pprint


class PerformTask(locust.SequentialTaskSet):

    @locust.task
    @pytest.mark.usefixtures("restore_db_per_class")
    def perform_random_user_register_task(self):
        # Initializing Faker for name generation
        fake = Faker()
        username = fake.first_name()

        # Setting a random passwd
        password_length = random.randrange(13, 24)
        passwd = secrets.token_urlsafe(password_length)

        # Setting the config for client auth
        config = Configuration(host=LoadUser.host,
                               username="YOUR_USERNAME",
                               password="YOUR_PASSWORD")

        # Launching the client with randomized data
        with ApiClient(configuration=config) as api_client:
            try:
                # forming the request body
                register_request = RestrictedRegisterRequest(username=username,
                                                             password1=passwd,
                                                             password2=passwd
                                                             )
                # registering the request
                (data, response) = api_client.auth_api.create_register(register_request)
                pprint(data.username)
            except exceptions.ApiException as e:
                print("Exception when calling AuthApi.create_register: %s\n" % e)


class LoadUser(locust.HttpUser):

    tasks = [PerformTask]  # a list of tasks to perform
    wait_time = locust.between(1, 3)  # how long to wait before a single task is performed
    host = BASE_URL


def test_load_register():
    # setup Environment and Runner
    env = Environment(user_classes=[LoadUser])
    env.create_local_runner()

    # start a greenlet that periodically outputs the current stats
    gevent.spawn(stats_printer(env.stats))

    # start a greenlet that save current stats to history
    gevent.spawn(stats_history, env.runner)

    # start the test with params
    env.runner.start(5000, spawn_rate=20)

    # in 10 seconds stop the runner
    gevent.spawn_later(10, lambda: env.runner.quit())

    # wait for the greenlets
    env.runner.greenlet.join()

    assert env.stats.total.avg_response_time < 5  # testing average response time
    assert env.stats.total.num_failures == 0  # testing for 0 failures

    # stop the web server for good measures
    env.runner.quit()
