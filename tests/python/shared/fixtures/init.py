# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import re
from http import HTTPStatus
from subprocess import PIPE, CalledProcessError, run
from time import sleep

import pytest
import requests

from shared.utils.config import ASSETS_DIR, get_api_url

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
    for dc_file in (
        "docker-compose.dev.yml",
        "tests/docker-compose.minio.yml",
        "tests/docker-compose.webhook.yml",
    )
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

    group._addoption(
        "--dumpdb",
        action="store_true",
        help="Update data.json without running tests. (default: %(default)s)",
    )

    group._addoption(
        "--platform",
        action="store",
        default="local",
        choices=("kube", "local"),
        help="Platform identifier - 'kube' or 'local'. (default: %(default)s)",
    )


def _run(command, capture_output=True):
    _command = command.split() if isinstance(command, str) else command

    try:
        stdout, stderr = "", ""
        if capture_output:
            proc = run(_command, check=True, stdout=PIPE, stderr=PIPE)  # nosec
            stdout, stderr = proc.stdout.decode(), proc.stderr.decode()
        else:
            proc = run(_command, check=True)  # nosec
        return stdout, stderr
    except CalledProcessError as exc:
        stderr = exc.stderr.decode() if capture_output else "see above"
        pytest.exit(
            f"Command failed: {command}.\n"
            f"Error message: {stderr}.\n"
            "Add `-s` option to see more details"
        )


def _kube_get_server_pod_name():
    output, _ = _run("kubectl get pods -l component=server -o jsonpath={.items[0].metadata.name}")
    return output


def _kube_get_db_pod_name():
    output, _ = _run(
        "kubectl get pods -l app.kubernetes.io/name=postgresql -o jsonpath={.items[0].metadata.name}"
    )
    return output


def docker_cp(source, target):
    _run(f"docker container cp {source} {target}")


def kube_cp(source, target):
    _run(f"kubectl cp {source} {target}")


def docker_exec_cvat(command):
    _run(f"docker exec {PREFIX}_cvat_server_1 {command}")


def kube_exec_cvat(command):
    pod_name = _kube_get_server_pod_name()
    _run(f"kubectl exec {pod_name} -- {command}")


def docker_exec_cvat_db(command):
    _run(f"docker exec {PREFIX}_cvat_db_1 {command}")


def kube_exec_cvat_db(command):
    pod_name = _kube_get_db_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_restore_db():
    docker_exec_cvat_db("psql -U root -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql")


def kube_restore_db():
    kube_exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql",
        ]
    )


def running_containers():
    return [cn for cn in _run("docker ps --format {{.Names}}")[0].split("\n") if cn]


def dump_db():
    if "test_cvat_server_1" not in running_containers():
        pytest.exit("CVAT is not running")
    with open(osp.join(CVAT_DB_DIR, "data.json"), "w") as f:
        try:
            run(  # nosec
                "docker exec test_cvat_server_1 \
                    python manage.py dumpdata \
                    --indent 2 --natural-foreign \
                    --exclude=auth.permission --exclude=contenttypes".split(),
                stdout=f,
                check=True,
            )
        except CalledProcessError:
            pytest.exit("Database dump failed.\n")


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
    for _ in range(30):
        response = requests.get(get_api_url("users/self"))
        if response.status_code == HTTPStatus.UNAUTHORIZED:
            break
        sleep(5)


def docker_restore_data_volumes():
    docker_cp(
        osp.join(CVAT_DB_DIR, "cvat_data.tar.bz2"),
        f"{PREFIX}_cvat_server_1:/tmp/cvat_data.tar.bz2",
    )
    docker_exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")


def kube_restore_data_volumes():
    pod_name = _kube_get_server_pod_name()
    kube_cp(
        osp.join(CVAT_DB_DIR, "cvat_data.tar.bz2"),
        f"{pod_name}:/tmp/cvat_data.tar.bz2",
    )
    kube_exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")


def start_services(rebuild=False):
    if any([cn in ["cvat_server", "cvat_db"] for cn in running_containers()]):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers())}"
        )

    _run(
        f"docker-compose -p {PREFIX} "
        + "--env-file "
        + osp.join(CVAT_ROOT_DIR, "tests", "python", "webhook_receiver", ".env")
        + f" -f {' -f '.join(DC_FILES)} up -d "
        + "--build" * rebuild,
        capture_output=False,
    )

    docker_restore_data_volumes()
    docker_cp(osp.join(CVAT_DB_DIR, "restore.sql"), f"{PREFIX}_cvat_db_1:/tmp/restore.sql")
    docker_cp(osp.join(CVAT_DB_DIR, "data.json"), f"{PREFIX}_cvat_server_1:/tmp/data.json")


@pytest.fixture(autouse=True, scope="session")
def services(request):
    stop = request.config.getoption("--stop-services")
    start = request.config.getoption("--start-services")
    rebuild = request.config.getoption("--rebuild")
    cleanup = request.config.getoption("--cleanup")
    dumpdb = request.config.getoption("--dumpdb")
    platform = request.config.getoption("--platform")

    if platform == "kube" and any((stop, start, rebuild, cleanup, dumpdb)):
        raise Exception(
            """--platform=kube is not compatible with any of the other options
            --stop-services --start-services --rebuild --cleanup --dumpdb"""
        )

    if platform == "local":
        if start and stop:
            raise Exception("--start-services and --stop-services are incompatible")

        if dumpdb:
            dump_db()
            pytest.exit("data.json has been updated", returncode=0)

        if cleanup:
            delete_compose_files()
            pytest.exit("All generated test files have been deleted", returncode=0)

        if not all([osp.exists(f) for f in CONTAINER_NAME_FILES]) or rebuild:
            delete_compose_files()
            create_compose_files()

        if stop:
            _run(
                f"docker-compose -p {PREFIX} "
                + "--env-file "
                + osp.join(CVAT_ROOT_DIR, "tests", "python", "webhook_receiver", ".env")
                + f" -f {' -f '.join(DC_FILES)} down -v",
                capture_output=False,
            )
            pytest.exit("All testing containers are stopped", returncode=0)

        start_services(rebuild)
        wait_for_server()

        docker_exec_cvat("python manage.py loaddata /tmp/data.json")
        docker_exec_cvat_db(
            "psql -U root -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql"
        )

        if start:
            pytest.exit("All necessary containers have been created and started.", returncode=0)

        yield

        docker_restore_db()
        docker_exec_cvat_db("dropdb test_db")

    elif platform == "kube":
        kube_restore_data_volumes()
        server_pod_name = _kube_get_server_pod_name()
        db_pod_name = _kube_get_db_pod_name()
        kube_cp(osp.join(CVAT_DB_DIR, "restore.sql"), f"{db_pod_name}:/tmp/restore.sql")
        kube_cp(osp.join(CVAT_DB_DIR, "data.json"), f"{server_pod_name}:/tmp/data.json")

        wait_for_server()

        kube_exec_cvat("python manage.py loaddata /tmp/data.json")

        kube_exec_cvat_db(
            [
                "/bin/sh",
                "-c",
                "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql",
            ]
        )

        yield


@pytest.fixture(scope="function")
def changedb(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_db()
    else:
        kube_restore_db()


@pytest.fixture(scope="class")
def dontchangedb(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_db()
    else:
        kube_restore_db()


@pytest.fixture(scope="function")
def restore_cvat_data(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_data_volumes()
    else:
        kube_restore_data_volumes()
