# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import signal
from rq import Worker
from rq.worker import StopRequested

import cvat.utils.remote_debugger as debug

class CVATWorker(Worker):
    def handle_job_failure(self, job, queue, **kwargs):
        # pylint: disable=access-member-before-definition
        if self._stopped_job_id == job.id:
            self._stopped_job_id = None
            self.set_current_job_id(None)
        else:
            # the job was stopped intentionally, we do not need update its status or put it into failed registry
            # in our case the job is immediately removed after stop request
            super().handle_job_failure(job, queue, **kwargs)



DefaultWorker = CVATWorker


class BaseDeathPenalty:
    def __init__(self, timeout, exception, **kwargs):
        pass

    def __enter__(self):
        pass

    def __exit__(self, exc_type, exc_value, traceback):
        pass


class SimpleWorker(CVATWorker):
    """
    Allows to work with at most 1 worker thread. Useful for debugging.
    """

    death_penalty_class = BaseDeathPenalty

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

    def kill_horse(self, sig: signal.Signals = signal.SIGTERM):
        # Send SIGTERM instead of default SIGKILL in debug mode as SIGKILL can't be handled
        # to prevent killing debug process (rq code handles SIGTERM properly)
        super().kill_horse(sig)

    def handle_exception(self, *args, **kwargs):
        # on production it sends SIGKILL to work horse process
        # but for development we overrided it and it sends SIGTERM to the process
        # we need to prevent exception handling as the process killed intentilnally

        # moreover default code saves meta with exception
        # and rewrites request datetime in meta with old value, as new job with the same ID may aldeady been created in a new process
        is_stopped_export_job = isinstance(args[2], (StopRequested, SystemExit))
        if not is_stopped_export_job:
            super().handle_exception(*args, **kwargs)


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
