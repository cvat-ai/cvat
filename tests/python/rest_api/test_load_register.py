import os
import random
import secrets
from faker import Faker
from pprint import pprint

import json
import gevent
import locust
from locust.env import Environment
from locust.stats import stats_printer, stats_history
from cvat_sdk.api_client import ApiClient, Configuration, exceptions
from cvat_sdk.api_client.models import RegisterSerializerExRequest

from shared.utils.config import BASE_URL, USER_PASS, ASSETS_DIR


class AdminUserNotFoundInDbException(Exception):
    def __init__(self):
        print("Can't find any admin user in the test DB")


class Container:
    """
    We have to recreate the fixtures' data generation,
    since locust doesn't support using pytest tests as tasks yet
    """
    def __init__(self, data, key="id"):
        self.raw_data = data
        self.map_data = {obj[key]: obj for obj in data}

    @property
    def raw(self):
        return self.raw_data

    @property
    def map(self):
        return self.map_data

    def __iter__(self):
        return iter(self.raw_data)

    def __len__(self):
        return len(self.raw_data)

    def __getitem__(self, key):
        if isinstance(key, slice):
            return self.raw_data[key]
        return self.map_data[key]


class GetUser:
    """
    We have to recreate the fixtures' data generation,
    since locust doesn't support using pytest tests as tasks yet
    """
    @staticmethod
    def get_admin_user():
        # getting the user from local db
        with open(os.path.join(ASSETS_DIR, "users.json")) as f:
            container = Container(json.load(f)["results"])

            for user in container:
                if user["is_superuser"] and user["is_active"]:  # getting the admin user
                    return user["username"]

            raise AdminUserNotFoundInDbException()


class PerformTask(locust.SequentialTaskSet):

    @locust.task
    def perform_random_user_register_task(self):
        # Initializing Faker for data generation
        fake = Faker()
        username = fake.first_name()  # needs to add 'username already exists' error handling
        first_name = username
        last_name = fake.last_name()
        email = fake.ascii_email()

        # Setting a random passwd
        password_length = random.randrange(13, 24)
        passwd = secrets.token_urlsafe(password_length)

        # Setting the config for client auth
        # Needs further dehardcoding
        config = Configuration(host=LoadUser.host,
                               username=GetUser.get_admin_user(),
                               password=USER_PASS)

        # Launching the client with randomized data
        with ApiClient(configuration=config) as api_client:
            try:
                # forming the request body
                register_request = RegisterSerializerExRequest(username=username,
                                                               password1=passwd,
                                                               password2=passwd,
                                                               email=email,
                                                               first_name=first_name,
                                                               last_name=last_name
                                                               )
                # sending the request
                (data) = api_client.auth_api.create_register(register_request)
                pprint(data)
            except exceptions.ApiException as e:
                print("Exception when calling AuthApi.create_register: %s\n" % e)


class LoadUser(locust.HttpUser):

    tasks = [PerformTask]  # a list of tasks to perform
    wait_time = locust.between(1, 3)  # how long to wait before a single task is performed
    host = BASE_URL


class TestLoadRegister:
    @staticmethod
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
