# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import os
import shlex
from enum import Enum
from http import HTTPStatus
from pathlib import Path
from subprocess import PIPE, CalledProcessError, run
from time import sleep
from typing import Union

import pytest
import requests
import yaml

from shared.utils.config import ASSETS_DIR, get_server_url

logger = logging.getLogger(__name__)

CVAT_ROOT_DIR = next(dir.parent for dir in Path(__file__).parents if dir.name == "tests")
CVAT_DB_DIR = ASSETS_DIR / "cvat_db"
PREFIX = "test"

CONTAINER_NAME_FILES = ["docker-compose.tests.yml"]

DC_FILES = CONTAINER_NAME_FILES + [
    "docker-compose.dev.yml",
    "tests/docker-compose.file_share.yml",
    "tests/docker-compose.minio.yml",
    "tests/docker-compose.test_servers.yml",
]


class Container(str, Enum):
    DB = "cvat_db"
    SERVER = "cvat_server"
    WORKER_ANNOTATION = "cvat_worker_annotation"
    WORKER_IMPORT = "cvat_worker_import"
    WORKER_EXPORT = "cvat_worker_export"
    WORKER_QUALITY_REPORTS = "cvat_worker_quality_reports"
    WORKER_WEBHOOKS = "cvat_worker_webhooks"
    UTILS = "cvat_utils"

    def __str__(self):
        return self.value

    @classmethod
    def covered(cls):
        return [item.value for item in cls if item != cls.DB]


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
        logger.debug(f"Executing a command: {_command}")

        stdout, stderr = "", ""
        if capture_output:
            proc = run(_command, check=True, stdout=PIPE, stderr=PIPE)  # nosec
            stdout, stderr = proc.stdout.decode(), proc.stderr.decode()
        else:
            proc = run(_command)  # nosec

        if stdout:
            logger.debug(f"Output (stdout): {stdout}")
        if stderr:
            logger.debug(f"Output (stderr): {stderr}")

        return stdout, stderr
    except CalledProcessError as exc:
        message = f"Command failed: {' '.join(map(shlex.quote, _command))}."
        message += f"\nExit code: {exc.returncode}"
        if capture_output:
            message += f"\nStandard output:\n{exc.stdout.decode()}"
            message += f"\nStandard error:\n{exc.stderr.decode()}"

        pytest.exit(message)


def _kube_get_pod_name(label_filter):
    output, _ = _run(f"kubectl get pods -l {label_filter} -o jsonpath={{.items[0].metadata.name}}")
    return output


def _kube_get_server_pod_name():
    return _kube_get_pod_name("component=server")


def _kube_get_db_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=postgresql")


def _kube_get_clichouse_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=clickhouse")


def _kube_get_redis_inmem_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=redis")


def _kube_get_redis_ondisk_pod_name():
    return _kube_get_pod_name("app.kubernetes.io/name=cvat,tier=kvrocks")


def docker_cp(source, target):
    _run(f"docker container cp {source} {target}")


def kube_cp(source, target):
    _run(f"kubectl cp {source} {target}")


def docker_exec(container, command, capture_output=True):
    return _run(f"docker exec -u root {PREFIX}_{container}_1 {command}", capture_output)


def docker_exec_cvat(command: Union[list[str], str]):
    base = f"docker exec {PREFIX}_cvat_server_1"
    _command = f"{base} {command}" if isinstance(command, str) else base.split() + command
    return _run(_command)


def kube_exec_cvat(command: Union[list[str], str]):
    pod_name = _kube_get_server_pod_name()
    base = f"kubectl exec {pod_name} --"
    _command = f"{base} {command}" if isinstance(command, str) else base.split() + command
    return _run(_command)


def container_exec_cvat(request: pytest.FixtureRequest, command: Union[list[str], str]):
    platform = request.config.getoption("--platform")
    if platform == "local":
        return docker_exec_cvat(command)
    elif platform == "kube":
        return kube_exec_cvat(command)
    else:
        assert False, "unknown platform"


def kube_exec_cvat_db(command):
    pod_name = _kube_get_db_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_exec_clickhouse_db(command):
    _run(["docker", "exec", f"{PREFIX}_cvat_clickhouse_1"] + command)


def kube_exec_clickhouse_db(command):
    pod_name = _kube_get_clichouse_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_exec_redis_inmem(command):
    _run(["docker", "exec", f"{PREFIX}_cvat_redis_inmem_1"] + command)


def kube_exec_redis_inmem(command):
    pod_name = _kube_get_redis_inmem_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_exec_redis_ondisk(command):
    _run(["docker", "exec", f"{PREFIX}_cvat_redis_ondisk_1"] + command)


def kube_exec_redis_ondisk(command):
    pod_name = _kube_get_redis_ondisk_pod_name()
    _run(["kubectl", "exec", pod_name, "--"] + command)


def docker_restore_db():
    docker_exec(
        Container.DB, "psql -U root -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql"
    )


def kube_restore_db():
    kube_exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=test_db -v to=cvat -f /tmp/restore.sql",
        ]
    )


def docker_restore_clickhouse_db():
    docker_exec_clickhouse_db(
        [
            "/bin/sh",
            "-c",
            'clickhouse-client --query "DROP TABLE IF EXISTS ${CLICKHOUSE_DB}.events;" && /docker-entrypoint-initdb.d/init.sh',
        ]
    )


def kube_restore_clickhouse_db():
    kube_exec_clickhouse_db(
        [
            "/bin/sh",
            "-c",
            'clickhouse-client --query "DROP TABLE IF EXISTS ${CLICKHOUSE_DB}.events;" && /bin/sh /docker-entrypoint-initdb.d/init.sh',
        ]
    )


def _get_redis_inmem_keys_to_keep():
    return ("rq:worker:", "rq:workers", "rq:scheduler_instance:", "rq:queues:")


def docker_restore_redis_inmem():
    docker_exec_redis_inmem(
        [
            "sh",
            "-c",
            'redis-cli -e --scan --pattern "*" |'
            'grep -v "' + r"\|".join(_get_redis_inmem_keys_to_keep()) + '" |'
            "xargs -r redis-cli -e del",
        ]
    )


def kube_restore_redis_inmem():
    kube_exec_redis_inmem(
        [
            "sh",
            "-c",
            'export REDISCLI_AUTH="${REDIS_PASSWORD}" && '
            'redis-cli -e --scan --pattern "*" | '
            'grep -v "' + r"\|".join(_get_redis_inmem_keys_to_keep()) + '" | '
            "xargs -r redis-cli -e del",
        ]
    )


def docker_restore_redis_ondisk():
    docker_exec_redis_ondisk(["redis-cli", "-e", "-p", "6666", "flushall"])


def kube_restore_redis_ondisk():
    kube_exec_redis_ondisk(
        ["sh", "-c", 'REDISCLI_AUTH="${CVAT_REDIS_ONDISK_PASSWORD}" redis-cli -e -p 6666 flushall']
    )


def running_containers():
    return [cn for cn in _run("docker ps --format {{.Names}}")[0].split("\n") if cn]


def dump_db():
    if "test_cvat_server_1" not in running_containers():
        pytest.exit("CVAT is not running")
    with open(CVAT_DB_DIR / "data.json", "w") as f:
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


def create_compose_files(container_name_files):
    for filename in container_name_files:
        with (
            open(filename.with_name(filename.name.replace(".tests", "")), "r") as dcf,
            open(filename, "w") as ndcf,
        ):
            dc_config = yaml.safe_load(dcf)

            for service_name, service_config in dc_config["services"].items():
                service_config.pop("container_name", None)
                if service_name in (Container.SERVER, Container.UTILS):
                    service_env = service_config["environment"]
                    service_env["DJANGO_SETTINGS_MODULE"] = "cvat.settings.testing_rest"

                if service_name in Container.covered():
                    service_env = service_config["environment"]
                    service_env["COVERAGE_PROCESS_START"] = ".coveragerc"
                    service_config["volumes"].append(
                        "./tests/python/.coveragerc:/home/django/.coveragerc"
                    )

            yaml.dump(dc_config, ndcf)


def delete_compose_files(container_name_files):
    for filename in container_name_files:
        filename.unlink(missing_ok=True)


def wait_for_services(num_secs: int = 300) -> None:
    for i in range(num_secs):
        logger.debug(f"waiting for the server to load ... ({i})")
        response = requests.get(get_server_url("api/server/health/", format="json"))

        try:
            statuses = response.json()
            logger.debug(f"server status: \n{statuses}")

            if response.status_code == HTTPStatus.OK:
                logger.debug("the server has finished loading!")
                return

        except Exception as e:
            logger.debug(f"an error occurred during the server status checking: {e}")

        sleep(1)

    raise Exception(
        f"Failed to reach the server during {num_secs} seconds. Please check the configuration."
    )


def docker_restore_data_volumes():
    docker_cp(
        CVAT_DB_DIR / "cvat_data.tar.bz2",
        f"{PREFIX}_cvat_server_1:/tmp/cvat_data.tar.bz2",
    )
    docker_exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")


def kube_restore_data_volumes():
    pod_name = _kube_get_server_pod_name()
    kube_cp(
        CVAT_DB_DIR / "cvat_data.tar.bz2",
        f"{pod_name}:/tmp/cvat_data.tar.bz2",
    )
    kube_exec_cvat("tar --strip 3 -xjf /tmp/cvat_data.tar.bz2 -C /home/django/data/")


def get_server_image_tag():
    return f"cvat/server:{os.environ.get('CVAT_VERSION', 'dev')}"


def docker_compose(dc_files, cvat_root_dir):
    return [
        "docker",
        "compose",
        f"--project-name={PREFIX}",
        # use compatibility mode to have fixed names for containers (with underscores)
        # https://github.com/docker/compose#about-update-and-backward-compatibility
        "--compatibility",
        f"--env-file={cvat_root_dir / 'tests/python/webhook_receiver/.env'}",
        *(f"--file={f}" for f in dc_files),
    ]


def start_services(dc_files, rebuild=False, cvat_root_dir=CVAT_ROOT_DIR):
    if any([cn in ["cvat_server", "cvat_db"] for cn in running_containers()]):
        pytest.exit(
            "It's looks like you already have running cvat containers. Stop them and try again. "
            f"List of running containers: {', '.join(running_containers())}"
        )

    _run(
        docker_compose(dc_files, cvat_root_dir) + ["up", "-d", *["--build"] * rebuild],
        capture_output=False,
    )


def stop_services(dc_files, cvat_root_dir=CVAT_ROOT_DIR):
    run(docker_compose(dc_files, cvat_root_dir) + ["down", "-v"], capture_output=False)


def session_start(
    session,
    cvat_root_dir=CVAT_ROOT_DIR,
    cvat_db_dir=CVAT_DB_DIR,
    extra_dc_files=None,
    waiting_time=300,
):
    stop = session.config.getoption("--stop-services")
    start = session.config.getoption("--start-services")
    rebuild = session.config.getoption("--rebuild")
    cleanup = session.config.getoption("--cleanup")
    dumpdb = session.config.getoption("--dumpdb")

    if session.config.getoption("--collect-only"):
        if any((stop, start, rebuild, cleanup, dumpdb)):
            raise Exception(
                """--collect-only is not compatible with any of the other options:
                --stop-services --start-services --rebuild --cleanup --dumpdb"""
            )
        return  # don't need to start the services to collect tests

    platform = session.config.getoption("--platform")

    if platform == "kube" and any((stop, start, rebuild, cleanup, dumpdb)):
        raise Exception(
            """--platform=kube is not compatible with any of the other options
            --stop-services --start-services --rebuild --cleanup --dumpdb"""
        )

    if platform == "local":
        local_start(
            start,
            stop,
            dumpdb,
            cleanup,
            rebuild,
            cvat_root_dir,
            cvat_db_dir,
            extra_dc_files,
            waiting_time,
        )

    elif platform == "kube":
        kube_start(cvat_db_dir)


def local_start(
    start, stop, dumpdb, cleanup, rebuild, cvat_root_dir, cvat_db_dir, extra_dc_files, waiting_time
):
    if start and stop:
        raise Exception("--start-services and --stop-services are incompatible")

    if dumpdb:
        dump_db()
        pytest.exit("data.json has been updated", returncode=0)

    dc_files = [cvat_root_dir / f for f in DC_FILES]
    if extra_dc_files is not None:
        dc_files += extra_dc_files

    container_name_files = [cvat_root_dir / f for f in CONTAINER_NAME_FILES]

    if cleanup:
        delete_compose_files(container_name_files)
        pytest.exit("All generated test files have been deleted", returncode=0)

    if not all([f.exists() for f in container_name_files]) or rebuild:
        delete_compose_files(container_name_files)
        create_compose_files(container_name_files)

    if stop:
        stop_services(dc_files, cvat_root_dir)
        pytest.exit("All testing containers are stopped", returncode=0)

    start_services(dc_files, rebuild, cvat_root_dir)

    docker_restore_data_volumes()
    docker_cp(cvat_db_dir / "restore.sql", f"{PREFIX}_cvat_db_1:/tmp/restore.sql")
    docker_cp(cvat_db_dir / "data.json", f"{PREFIX}_cvat_server_1:/tmp/data.json")

    wait_for_services(waiting_time)

    docker_exec_cvat("python manage.py loaddata /tmp/data.json")
    docker_exec(
        Container.DB, "psql -U root -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql"
    )

    if start:
        pytest.exit("All necessary containers have been created and started.", returncode=0)


def kube_start(cvat_db_dir):
    kube_restore_data_volumes()
    server_pod_name = _kube_get_server_pod_name()
    db_pod_name = _kube_get_db_pod_name()
    kube_cp(cvat_db_dir / "restore.sql", f"{db_pod_name}:/tmp/restore.sql")
    kube_cp(cvat_db_dir / "data.json", f"{server_pod_name}:/tmp/data.json")

    wait_for_services()

    kube_exec_cvat("python manage.py loaddata /tmp/data.json")

    kube_exec_cvat_db(
        [
            "/bin/sh",
            "-c",
            "PGPASSWORD=cvat_postgresql_postgres psql -U postgres -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql",
        ]
    )


def pytest_sessionstart(session: pytest.Session) -> None:
    session_start(session)


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    session_finish(session)


def session_finish(session):
    if session.config.getoption("--collect-only"):
        return

    platform = session.config.getoption("--platform")

    if platform == "local":
        if os.environ.get("COVERAGE_PROCESS_START"):
            collect_code_coverage_from_containers()

        docker_restore_db()
        docker_exec(Container.DB, "dropdb test_db")

        docker_exec(Container.DB, "dropdb --if-exists cvat")
        docker_exec(Container.DB, "createdb cvat")
        docker_exec_cvat("python manage.py migrate")


def collect_code_coverage_from_containers():
    for container in Container.covered():
        process_command = "python3"

        # find process with code coverage
        pid, _ = docker_exec(container, f"pidof {process_command} -o 1")

        # stop process with code coverage
        docker_exec(container, f"kill -15 {pid}")
        sleep(3)

        # get code coverage report
        docker_exec(container, "coverage combine", capture_output=False)
        docker_exec(container, "coverage json", capture_output=False)
        docker_cp(
            f"{PREFIX}_{container}_1:home/django/coverage.json",
            f"coverage_{container}.json",
        )


@pytest.fixture(scope="function")
def restore_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_db()
    else:
        kube_restore_db()


@pytest.fixture(scope="class")
def restore_db_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_db()
    else:
        kube_restore_db()


@pytest.fixture(scope="function")
def restore_cvat_data_per_function(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_data_volumes()
    else:
        kube_restore_data_volumes()


@pytest.fixture(scope="class")
def restore_cvat_data_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_data_volumes()
    else:
        kube_restore_data_volumes()


@pytest.fixture(scope="function")
def restore_clickhouse_db_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_clickhouse_db()
    else:
        kube_restore_clickhouse_db()


@pytest.fixture(scope="class")
def restore_clickhouse_db_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_clickhouse_db()
    else:
        kube_restore_clickhouse_db()


@pytest.fixture(scope="function")
def restore_redis_inmem_per_function(request):
    # Note that autouse fixtures are executed first within their scope, so be aware of the order
    # Pre-test DB setups (eg. with class-declared autouse setup() method) may be cleaned.
    # https://docs.pytest.org/en/stable/reference/fixtures.html#autouse-fixtures-are-executed-first-within-their-scope
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_inmem()
    else:
        kube_restore_redis_inmem()


@pytest.fixture(scope="class")
def restore_redis_inmem_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_inmem()
    else:
        kube_restore_redis_inmem()


@pytest.fixture(scope="function")
def restore_redis_ondisk_per_function(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_ondisk()
    else:
        kube_restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_per_class(request):
    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_ondisk()
    else:
        kube_restore_redis_ondisk()


@pytest.fixture(scope="class")
def restore_redis_ondisk_after_class(request):
    yield

    platform = request.config.getoption("--platform")
    if platform == "local":
        docker_restore_redis_ondisk()
    else:
        kube_restore_redis_ondisk()
