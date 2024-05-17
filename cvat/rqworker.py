# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import signal
from rq import Worker
from rq.worker import StopRequested

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
        # and just starts a new rq job
        super().kill_horse(sig)

    def handle_job_failure(self, *args, **kwargs):
        # export job with the same ID was re-queued in the main process
        # we do not need to handle failure
        is_stopped_export_job = kwargs['queue'].name == 'export' and kwargs['exc_string'].strip().split('\n')[-1] == 'rq.worker.StopRequested'
        signal.signal(signal.SIGTERM, self.request_stop)
        if not is_stopped_export_job:
            super().handle_job_failure(*args, **kwargs)

        # after the first warm stop (StopRequested), default code reassignes SIGTERM signal to cold stop (SysExit)
        # we still want use warm stops in debug process
        signal.signal(signal.SIGTERM, self.request_stop)

    def handle_exception(self, *args, **kwargs):
        is_stopped_export_job = args[1] == StopRequested
        if not is_stopped_export_job:
            # we do not need to write exception here because the process was stopped intentionally
            # moreover default code saves meta in and rewrites request datetime in meta with old value
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
