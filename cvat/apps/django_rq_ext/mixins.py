# NOTE @sosov: rq's BaseWorker is not actually a usable base class. Its
# __init__ + lifecycle methods reference attributes/methods that exist only on
# rq.worker.Worker (the fork-based one). To extend BaseWorker without dragging
# in the work-horse machinery we don't want, we port those methods here
# verbatim. Re-sync on rq version bumps.

import traceback
from datetime import timedelta
from random import shuffle
from typing import TYPE_CHECKING, Optional

from rq import worker_registration
from rq.exceptions import DeserializationError
from rq.utils import utcformat, utcnow
from rq.worker import DequeueStrategy

if TYPE_CHECKING:
    from redis.client import Pipeline

try:
    from setproctitle import setproctitle as setprocname
except ImportError:

    def setprocname(*args, **kwargs):  # noqa
        pass


class RqWorkerPortMixin:
    """Methods copy-pasted verbatim from `rq.worker.Worker` @ 1.16.0.

    Each method below is referenced by `BaseWorker` (or by us through the BaseWorker
    contract) but lives only on `Worker`. Nothing in this mixin diverges from
    upstream — modifications, if any, belong in the subclass that uses the mixin.
    """

    @property
    def connection_timeout(self) -> int:
        return self.dequeue_timeout + 10

    def set_state(self, state: str, pipeline=None) -> None:
        self._state = state
        connection = pipeline if pipeline is not None else self.connection
        connection.hset(self.key, "state", state)

    def get_state(self) -> str:
        return self._state

    def push_exc_handler(self, handler_func) -> None:
        self._exc_handlers.append(handler_func)

    def pop_exc_handler(self):
        return self._exc_handlers.pop()

    def procline(self, message: str) -> None:
        setprocname(f"rq:worker:{self.name}: {message}")

    def reorder_queues(self, reference_queue) -> None:
        if self._dequeue_strategy is None:
            self._dequeue_strategy = DequeueStrategy.DEFAULT

        if self._dequeue_strategy not in ("default", "random", "round_robin"):
            raise ValueError(
                f"Dequeue strategy {self._dequeue_strategy} is not allowed. "
                "Use `default`, `random` or `round_robin`."
            )
        if self._dequeue_strategy == DequeueStrategy.DEFAULT:
            return
        if self._dequeue_strategy == DequeueStrategy.ROUND_ROBIN:
            pos = self._ordered_queues.index(reference_queue)
            self._ordered_queues = self._ordered_queues[pos + 1 :] + self._ordered_queues[: pos + 1]
            return
        if self._dequeue_strategy == DequeueStrategy.RANDOM:
            shuffle(self._ordered_queues)
            return

    def register_birth(self) -> None:
        self.log.debug("Registering birth of worker %s", self.name)
        if self.connection.exists(self.key) and not self.connection.hexists(self.key, "death"):
            raise ValueError(f"There exists an active worker named {self.name!r} already")
        with self.connection.pipeline() as p:
            p.delete(self.key)
            now = utcnow()
            now_in_string = utcformat(now)
            self.birth_date = now
            mapping = {
                "birth": now_in_string,
                "last_heartbeat": now_in_string,
                "queues": ",".join(self.queue_names()),
                "pid": self.pid,
                "hostname": self.hostname,
                "ip_address": self.ip_address,
                "version": self.version,
                "python_version": self.python_version,
            }
            if self.get_redis_server_version() >= (4, 0, 0):
                p.hset(self.key, mapping=mapping)
            else:
                p.hmset(self.key, mapping)
            worker_registration.register(self, p)
            p.expire(self.key, self.worker_ttl + 60)
            p.execute()

    def register_death(self) -> None:
        self.log.debug("Registering death")
        with self.connection.pipeline() as p:
            worker_registration.unregister(self, p)
            p.hset(self.key, "death", utcformat(utcnow()))
            p.expire(self.key, 60)
            p.execute()

    def increment_failed_job_count(self, pipeline: Optional["Pipeline"] = None) -> None:
        connection = pipeline if pipeline is not None else self.connection
        connection.hincrby(self.key, "failed_job_count", 1)

    def increment_successful_job_count(self, pipeline: Optional["Pipeline"] = None) -> None:
        connection = pipeline if pipeline is not None else self.connection
        connection.hincrby(self.key, "successful_job_count", 1)

    def increment_total_working_time(
        self, job_execution_time: timedelta, pipeline: "Pipeline"
    ) -> None:
        pipeline.hincrbyfloat(self.key, "total_working_time", job_execution_time.total_seconds())

    def handle_exception(self, job, *exc_info) -> None:
        """Walks the exception handler stack to delegate exception handling.
        If the job cannot be deserialized, it will raise when func_name or
        the other properties are accessed, which will stop exceptions from
        being properly logged, so we guard against it here.
        """
        self.log.debug("Handling exception for %s.", job.id)
        exc_string = "".join(traceback.format_exception(*exc_info))
        try:
            extra = {
                "func": job.func_name,
                "arguments": job.args,
                "kwargs": job.kwargs,
            }
            func_name = job.func_name
        except DeserializationError:
            extra = {}
            func_name = "<DeserializationError>"

        extra.update({"queue": job.origin, "job_id": job.id})

        self.log.error(
            "[Job %s]: exception raised while executing (%s)\n%s",
            job.id,
            func_name,
            exc_string,
            extra=extra,
        )

        for handler in self._exc_handlers:
            self.log.debug("Invoking exception handler %s", handler)
            fallthrough = handler(job, *exc_info)

            if fallthrough is None:
                fallthrough = True

            if not fallthrough:
                break

    def stop_scheduler(self) -> None:
        import os
        import signal

        if self.scheduler._process and self.scheduler._process.pid:
            try:
                os.kill(self.scheduler._process.pid, signal.SIGTERM)
            except OSError:
                pass
            self.scheduler._process.join()
