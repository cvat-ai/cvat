# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import os
import pathlib
import pty
import sys
import time

import requests
from perfkit.config import (
    CVAT_SERVER_SERVICE,
    DOCKER_COMPOSE_FILE,
    DOCKER_COMPOSE_FILE_WITH_CPUSET,
    URL_SERVER_ABOUT,
)
from perfkit.console_print import console, exit_with_error, print_error, print_info, print_success
from perfkit.k6_profile import K6Profile
from plumbum import FG, local

WAIT_FOR_CLUSTER = 10

docker = local["docker"]
docker_compose = docker["compose", "-f", DOCKER_COMPOSE_FILE, "-f", DOCKER_COMPOSE_FILE_WITH_CPUSET]


def is_service_running(service_name: str) -> bool:
    result = docker_compose[
        "ps", "--filter", f"name={service_name}", "--filter", "status=running"
    ]()
    if service_name in result:
        return True
    return False


def wait_for_server(url: str = URL_SERVER_ABOUT, timeout: int = 180, interval: float = 5.0) -> bool:
    print_info("⏳ waiting for server...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                return True
        except requests.RequestException:
            pass
        time.sleep(interval)
    return False


def start_cluster(
    container_name: str = CVAT_SERVER_SERVICE, compose_file: pathlib.Path = DOCKER_COMPOSE_FILE
) -> None:
    if is_service_running(CVAT_SERVER_SERVICE):
        print_success("✅ cluster already running")
        return

    print_info("starting cluster")
    docker_compose_up = docker_compose["up", "-d"]
    docker_compose_up(cwd="../")

    if not wait_for_server():
        exit_with_error("Server did not start in time.")

    print_info("creating default admin user...")
    admin_code = (
        "from django.contrib.auth.models import User; "
        "User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')"
    )
    exec_cmd = docker[
        "exec",
        "-i",
        container_name,
        "bash",
        "-c",
        f'echo "{admin_code}" | python3 ~/manage.py shell',
    ]
    exec_cmd()
    time.sleep(WAIT_FOR_CLUSTER)


def stop_cluster(compose_file: pathlib.Path = DOCKER_COMPOSE_FILE) -> None:
    print_info("stopping cluster")
    return docker_compose["down", "-v"]()


def _run_in_pty(cmd: list[str]) -> int:
    def read(fd) -> None:
        while True:
            try:
                output = os.read(fd, 1024)
                if not output:
                    break
                os.write(sys.stdout.fileno(), output)
            except OSError:
                break

    return pty.spawn(cmd, read)


def run_k6_docker(k6_conf: K6Profile, tty_output: bool = False, silent: bool = False, verbose: bool = False) -> int:
    docker_cmd: list[str] = k6_conf.build_run_cmd(verbose)
    cmd = docker_compose["run", "--rm", "perf-k6"][docker_cmd]
    if tty_output:
        # print_info(f"🚀 running in pseudo-terminal: {' '.join(cmd.formulate())}")
        exit_status = _run_in_pty(cmd.formulate())
        code = os.waitstatus_to_exitcode(exit_status)
    else:
        with cmd.popen() as proc:
            if not silent:
                for line in proc.stdout:
                    console.print(line.rstrip().decode())
                for line in proc.stderr:
                    print_error(line.rstrip().decode())
            # else:
            proc.communicate()
            code = proc.returncode
    return code


def stop_k6_docker() -> None:
    print_info("stopping K6 service")
    return docker_compose["kill"]["perf-k6"] & FG
