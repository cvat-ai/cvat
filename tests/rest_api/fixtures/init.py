import os.path as osp
import re
from http import HTTPStatus
from subprocess import PIPE, CalledProcessError, run
from time import sleep

import pytest
import os
import requests
from rest_api.utils.config import ASSETS_DIR, get_api_url

CVAT_ROOT_DIR = __file__[: __file__.rfind(osp.join("tests", ""))]
CVAT_DB_DIR = osp.join(ASSETS_DIR, "cvat_db")
PREFIX = "test"

CONTAINER_NAME_FILES = [
    osp.join(CVAT_ROOT_DIR, dc_file)
    for dc_file in (
        "components/analytics/docker-compose.analytics.tests.yml",
        "docker-compose.tests.yml",
    )
]

DC_FILES = [
    osp.join(CVAT_ROOT_DIR, dc_file)
    for dc_file in ("docker-compose.dev.yml", "tests/rest_api/docker-compose.minio.yml")
] + CONTAINER_NAME_FILES


def pytest_addoption(parser):
    group = parser.getgroup("CVAT REST API testing options")
    group._addoption(
        "--start-services",
        action="store_true",
        help="Start all necessary CVAT containers without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--stop-services",
        action="store_true",
        help="Stop all testing containers without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--rebuild",
        action="store_true",
        help="Rebuild CVAT images and then start containers. (default: %(default)s)",
    )

    group._addoption(
        "--cleanup",
        action="store_true",
        help="Delete files that was create by tests without running tests. (default: %(default)s)",
    )


def _run(command):
    try:
        proc = run(command.split(), check=True, stdout=PIPE, stderr=PIPE)  # nosec
        return proc.stdout.decode(), proc.stderr.decode()
    except CalledProcessError as exc:
        pytest.exit(
            f"Command failed: {command}.\n"
            f"Error message: {exc.stderr.decode()}.\n"
            f"Add `-s` option to see more details"
        )


def docker_cp(source, target):
    _run(f"docker container cp {source} {target}")


def exec_cvat(command):
    _run(f"docker exec {PREFIX}_cvat_1 {command}")


def exec_cvat_db(command):
    _run(f"docker exec {PREFIX}_cvat_db_1 {command}")


def restore_db():
    exec_cvat_db("psql -U root -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql")


def create_compose_files():
    for filename in CONTAINER_NAME_FILES:
        with open(filename.replace(".tests.yml", ".yml"), "r") as dcf, open(filename, "w") as ndcf:
            ndcf.writelines(
                [line for line in dcf.readlines() if not re.match("^.+container_name.+$", line)]
            )


def delete_compose_files():
    for filename in CONTAINER_NAME_FILES:
        if osp.exists(filename):
            os.remove(filename)


def wait_for_server():
    for _ in range(60):
        response = requests.get(get_api_url("users/self"))
        if response.status_code == HTTPStatus.UNAUTHORIZED:
            break
        sleep(5)

def restore_data_volumes():
    docker_cp(osp.join(CVAT_DB_DIR, "cvat_data.tar.bz2"), f"{PREFIX}_cvat_1:/tmp/cvat_data.tar.bz2")
    exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")

def start_services(rebuild=False):
    running_containers = [cn for cn in _run("docker ps --format {{.Names}}")[0].split("\n") if cn]

    if any([cn in ["cvat", "cvat_db"] for cn in running_containers]):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers)}"
        )

    out = _run(f"docker-compose -p {PREFIX} -f {' -f '.join(DC_FILES)} up -d " + "--build" * rebuild)[1]

    restore_data_volumes()
    docker_cp(osp.join(CVAT_DB_DIR, "restore.sql"), f"{PREFIX}_cvat_db_1:/tmp/restore.sql")
    docker_cp(osp.join(CVAT_DB_DIR, "data.json"), f"{PREFIX}_cvat_1:/tmp/data.json")

    return out


@pytest.fixture(autouse=True, scope="session")
def services(request):
    stop = request.config.getoption("--stop-services")
    start = request.config.getoption("--start-services")
    rebuild = request.config.getoption("--rebuild")
    cleanup = request.config.getoption("--cleanup")

    if start and stop:
        raise Exception("--start-services and --stop-services are incompatible")

    if cleanup:
        delete_compose_files()
        pytest.exit(f"All generated test files have been deleted", returncode=0)

    if not all([osp.exists(f) for f in CONTAINER_NAME_FILES]):
        create_compose_files()

    if stop:
        out = _run(f"docker-compose -p {PREFIX} -f {' -f '.join(DC_FILES)} down -v")[1]
        out = set(l.split()[1] for l in out.split("\n") if "done" in l.split())
        pytest.exit(f"All testing  containers are stopped: {', '.join(out)}", returncode=0)

    started_services = start_services(rebuild)
    wait_for_server()

    exec_cvat("python manage.py loaddata /tmp/data.json")
    exec_cvat_db("psql -U root -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql")

    if start:
        pytest.exit(
            f"All necessary containers have been created and started: {started_services}",
            returncode=0,
        )

    yield

    restore_db()
    exec_cvat_db("dropdb test_db")


@pytest.fixture(scope="function")
def changedb():
    restore_db()


@pytest.fixture(scope="class")
def dontchangedb():
    restore_db()

@pytest.fixture(scope="function")
def restore_cvat_data():
    restore_data_volumes()
