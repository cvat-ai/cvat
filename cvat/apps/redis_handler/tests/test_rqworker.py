# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import time
from unittest import TestCase
from unittest.mock import patch

import fakeredis
import rq.worker
from kubernetes.client import CoreV1Api
from rq import Queue
from rq.job import JobStatus

from cvat.rqworker import DeletionCostReportingWorker


class _InProcessWorker(rq.worker.SimpleWorker, DeletionCostReportingWorker):
    # NOTE: SimpleWorker runs the job in-process instead of forking a work horse.
    # A fork itself wouldn't break the patches (set_state is only called in the parent),
    # but fakeredis is plain process memory: the forked child would write the job's
    # FINISHED status into its own copy, and the parent would never see it.
    pass


class TestDeletionCostReportingWorker(TestCase):
    def test_reports_pod_deletion_cost_across_job_lifecycle(self):
        reported_costs: list[str] = []

        def record_patch(_self, name, namespace, body):
            self.assertEqual((name, namespace), ("worker-pod-0", "cvat"))
            reported_costs.append(
                body["metadata"]["annotations"]["controller.kubernetes.io/pod-deletion-cost"]
            )

        connection = fakeredis.FakeRedis()
        queue = Queue("default", connection=connection)
        job = queue.enqueue(time.sleep, 0)

        with (
            patch.dict(os.environ, {"POD_NAME": "worker-pod-0", "POD_NAMESPACE": "cvat"}),
            patch("kubernetes.config.load_incluster_config"),
            patch.object(
                CoreV1Api, "patch_namespaced_pod", autospec=True, side_effect=record_patch
            ),
        ):
            worker = _InProcessWorker([queue], connection=connection)
            worked = worker.work(burst=True)

        self.assertTrue(worked)
        self.assertEqual(job.get_status(refresh=True), JobStatus.FINISHED)
        # started, idle (before dequeue), busy, idle (job done), idle (final empty dequeue)
        self.assertEqual(reported_costs, ["0", "0", "1000", "0", "0"])
