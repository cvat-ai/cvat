# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from typing import Optional

from kubernetes import client as k8s_client
from kubernetes import config as k8s_config
from kubernetes.config.config_exception import ConfigException
from redis.client import Pipeline
from rq import Worker
from rq.worker import WorkerStatus

import cvat.utils.remote_debugger as debug

DefaultWorker = Worker


class BaseDeathPenalty:
    def __init__(self, timeout, exception, **kwargs):
        pass

    def __enter__(self):
        pass

    def __exit__(self, exc_type, exc_value, traceback):
        pass


class SimpleWorker(Worker):
    """
    Allows to work with at most 1 worker thread. Useful for debugging.
    """

    death_penalty_class = BaseDeathPenalty

    def register_birth(self):
        super().register_birth()
        # The server process uses this flag to reject started-job cancellation in debug mode:
        # SimpleWorker runs jobs in-process, so there is no forked work horse to stop.
        # As we do not want just kill debug process
        self.connection.hset(self.key, "cvat_can_stop_started_jobs", 0)

    def main_work_horse(self, *args, **kwargs):
        raise NotImplementedError("Test worker does not implement this method")

    def execute_job(self, *args, **kwargs):
        """Execute job in same thread/process, do not fork()"""

        # Resolves problems with
        # django.db.utils.OperationalError: server closed the connection unexpectedly
        # errors during debugging
        # https://stackoverflow.com/questions/8242837/django-multiprocessing-and-database-connections/10684672#10684672
        from django import db

        db.connections.close_all()

        return self.perform_job(*args, **kwargs)


class DeletionCostReportingWorker(Worker):

    STARTED_WORKER_POD_DELETION_COST = 0
    IDLE_WORKER_POD_DELETION_COST = 0
    BUSY_WORKER_POD_DELETION_COST = 1000
    SUSPENDED_WORKER_POD_DELETION_COST = 0

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        try:
            k8s_config.load_incluster_config()
        except ConfigException as e:
            raise RuntimeError(
                (
                    "Failed to load k8s incluster config. "
                    "Make sure the worker is running in a kubernetes cluster."
                )
            ) from e

        self._k8s_core_v1 = k8s_client.CoreV1Api()

    def set_state(self, state: str, pipeline: Optional["Pipeline"] = None):
        super().set_state(state, pipeline)

        match state:
            case WorkerStatus.STARTED:
                cost = self.STARTED_WORKER_POD_DELETION_COST
            case WorkerStatus.BUSY:
                cost = self.BUSY_WORKER_POD_DELETION_COST
            case WorkerStatus.SUSPENDED:
                cost = self.SUSPENDED_WORKER_POD_DELETION_COST
            case WorkerStatus.IDLE:
                cost = self.IDLE_WORKER_POD_DELETION_COST
            case _:
                raise ValueError(f"No pod deletion cost defined for worker state {state!r}")

        try:
            self._update_pod_deletion_cost(cost=cost)
        except Exception:
            self.log.exception("Failed to update pod deletion cost to %s", cost)

    def _update_pod_deletion_cost(self, cost: int) -> None:
        self._k8s_core_v1.patch_namespaced_pod(
            name=os.environ["POD_NAME"],
            namespace=os.environ["POD_NAMESPACE"],
            body={
                "metadata": {
                    "annotations": {"controller.kubernetes.io/pod-deletion-cost": str(cost)}
                }
            },
        )


if debug.is_debugging_enabled():

    class RemoteDebugWorker(SimpleWorker):
        """
        Support for VS code debugger
        """

        def __init__(self, *args, **kwargs):
            self.__debugger = debug.RemoteDebugger()
            super().__init__(*args, **kwargs)

        def execute_job(self, *args, **kwargs):
            """Execute job in same thread/process, do not fork()"""
            self.__debugger.attach_current_thread()

            return super().execute_job(*args, **kwargs)

    DefaultWorker = RemoteDebugWorker


if os.environ.get("COVERAGE_PROCESS_START"):
    import coverage

    default_exit = os._exit

    def coverage_exit(*args, **kwargs):
        cov = coverage.Coverage.current()
        if cov:
            cov.stop()
            cov.save()
        default_exit(*args, **kwargs)

    os._exit = coverage_exit
