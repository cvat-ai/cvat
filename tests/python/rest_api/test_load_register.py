import random
import secrets

import gevent
import locust
from cvat_sdk.api_client import ApiClient, Configuration, exceptions
from cvat_sdk.api_client.models import RegisterSerializerExRequest
from faker import Faker
from locust.env import Environment
from locust.stats import stats_history, stats_printer

from shared.utils.config import BASE_URL, USER_PASS


class PerformTask(locust.SequentialTaskSet):
    api_exceptions_found = {}  # number of api exceptions caught and their codes
    api_exceptions_counter = 0

    @locust.task
    def perform_random_user_register_task(self):
        # Initializing Faker for data generation
        fake = Faker()
        username = None
        first_name = fake.first_name()
        last_name = fake.last_name()
        email = fake.ascii_email()
        username_type = bool(random.getrandbits(1))

        if username_type == 0:
            username = first_name + last_name
        elif username_type == 1:
            username = last_name + first_name

        # Setting a random passwd
        password_length = random.randrange(13, 24)
        passwd = secrets.token_urlsafe(password_length)

        # Setting the config for client auth
        # Needs further dehardcoding
        config = Configuration(host=LoadUser.host, username="admin1", password=USER_PASS)

        # Launching the client with randomized data
        with ApiClient(configuration=config) as api_client:
            try:
                # forming the request body
                register_request = RegisterSerializerExRequest(
                    username=username,
                    password1=passwd,
                    password2=passwd,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                # sending the request
                api_client.auth_api.create_register(register_request)

            except exceptions.ApiException as e:
                if e.status != 200:
                    PerformTask.api_exceptions_counter += 1  # count the number of api exceptions
                    PerformTask.api_exceptions_found[
                        PerformTask.api_exceptions_counter
                    ] = e.status  # and their codes


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
    gevent.spawn_later(10, lambda: env.runner.quit())  # pylint: disable=unnecessary-lambda

    # wait for the greenlets
    env.runner.greenlet.join()

    assert (
        PerformTask.api_exceptions_found == {}
    )  # check if api exceptions were found during task execution
    assert env.stats.total.avg_response_time < 5  # testing average response time
    assert env.stats.total.num_failures == 0  # testing for 0 failures

    # stop the web server for good measures
    env.runner.quit()
