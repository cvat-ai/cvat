# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
import uuid
from unittest import mock

import django_rq
from django.conf import settings
from django_rq.queues import DjangoRQ
from rq.job import Dependency, Job

from cvat.apps.engine.rq import define_dependent_job
from cvat.apps.engine.tests.utils import clear_rq_jobs

DEFAULT_USER_ID = 1


def dummy_task():
    return 2 + 2


def _dependency_should_be_none(dependency: Dependency | None):
    if dependency is not None:
        raise AssertionError(f"Dependency was defined unexpectedly: {dependency.dependencies}.")


def _enqueue_test_job(
    queue: DjangoRQ,
    job_id: str | None = None,
    user_id: int = DEFAULT_USER_ID,
    depends_on: list[Job] | None = None,
) -> Job:
    job_id = job_id or str(uuid.uuid4())
    job = queue.enqueue(
        f=dummy_task, args=(), job_id=job_id, meta={"user_id": user_id}, depends_on=depends_on
    )
    return job


def _set_rq_async_mode(is_async) -> None:
    for config in settings.RQ_QUEUES.values():
        config["ASYNC"] = is_async


class TestDefineDependentJob(unittest.TestCase):
    """
    Tests for automatic dependency resolution between RQ jobs.
    The logic finds the latest enqueued job (optionally filtered by rq_id)
    and defines a new job depending on it unless skipped by flags or self-dependency.
    """

    @classmethod
    def setUpClass(cls) -> None:
        _set_rq_async_mode(True)
        cls.queue = django_rq.get_queue(settings.CVAT_QUEUES.IMPORT_DATA.value)

    def setUp(self) -> None:
        self.patcher = mock.patch("cvat.apps.engine.rq.is_rq_job_owner", return_value=True)
        self.patcher.start()
        clear_rq_jobs()

    @classmethod
    def tearDownClass(cls) -> None:
        _set_rq_async_mode(False)

    def tearDown(self) -> None:
        self.addCleanup(self.patcher.stop)

    def _define_dependent_job(
        self, should_be_dependent: bool = True, rq_id: str | None = None
    ) -> Dependency:
        return define_dependent_job(
            self.queue, DEFAULT_USER_ID, should_be_dependent=should_be_dependent, rq_id=rq_id
        )

    def test_define_dependency_on_latest_user_job(self) -> None:
        """Ensures a new job correctly depends on the latest job if specific rq_id provided."""
        job = _enqueue_test_job(self.queue)
        dependency = self._define_dependent_job(rq_id=str(uuid.uuid4()))
        assert dependency is not None, "Dependent job not found."
        assert len(dependency.dependencies) == 1
        dep_job = dependency.dependencies[0]
        assert dep_job == job

    def test_no_dependency_when_should_be_dependent_is_false(self) -> None:
        """Skips dependency if the flag should_be_dependent=False is used."""
        _enqueue_test_job(self.queue)
        dependency = self._define_dependent_job(should_be_dependent=False)
        _dependency_should_be_none(dependency)

    def test_no_dependency_with_empty_queue(self):
        dependency = self._define_dependent_job()
        _dependency_should_be_none(dependency)

    def test_no_dependency_with_empty_queue_and_rq_id(self):
        dependency = self._define_dependent_job(rq_id=str(uuid.uuid4()))
        _dependency_should_be_none(dependency)

    def test_skip_cyclic_dependencies(self):
        """
        Avoids creating dependency for job X1 in case when
        X2 depended on X1 and then X1 got cancelled
        """
        first_job_id = str(uuid.uuid4())
        second_job_id = str(uuid.uuid4())
        first_job = _enqueue_test_job(self.queue, job_id=first_job_id)
        _enqueue_test_job(
            self.queue,
            job_id=second_job_id,
            depends_on=Dependency(jobs=[first_job_id], allow_failure=True),
        )
        first_job.cancel()
        dependency = self._define_dependent_job(rq_id=first_job_id)
        _dependency_should_be_none(dependency)

    def test_skip_dependency_for_same_job(self):
        """Ignores dependencies if rq_id matches already enqueued job."""
        job_id = str(uuid.uuid4())
        _enqueue_test_job(self.queue, job_id=job_id)
        dependency = self._define_dependent_job(rq_id=job_id)

        _dependency_should_be_none(dependency)

    def test_select_latest_created_job(self):
        """Selects the most recent job as dependency if multiple jobs are chained."""
        total_jobs = 3
        job_ids = [str(uuid.uuid4()) for _ in range(total_jobs)]
        latest_job_id = job_ids[-1]
        for i, job_id in enumerate(job_ids):
            _enqueue_test_job(
                self.queue,
                job_id,
                depends_on=Dependency(jobs=[job_ids[i - 1]], allow_failure=True) if i else None,
            )
        dependent = self._define_dependent_job()
        assert dependent is not None, "Dependent job not found."
        assert len(dependent.dependencies) == 1
        dependent_job = dependent.dependencies[0]
        assert dependent_job.id == latest_job_id
