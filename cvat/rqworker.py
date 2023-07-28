# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

from rq import Worker

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
