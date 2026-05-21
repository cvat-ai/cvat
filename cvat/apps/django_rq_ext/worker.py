from django.db import close_old_connections
from rq.job import Job
from rq.queue import Queue

from cvat_libs.rq_ext.worker import ThreadPoolWorker


class DjangoThreadPoolWorker(ThreadPoolWorker):
    # NOTE @sosov: the fork-based rq worker gets DB-connection hygiene from
    # process lifecycle — each job runs in a child whose connection pool dies
    # with it. Threads share the process, so a connection opened by job N on
    # thread T stays in T's `asgiref.local.Local` slot across jobs N+1, N+2…
    # If T idles long enough between jobs, Postgres / pgbouncer / RDS Proxy
    # closes the TCP connection from their side; the next ORM call on T then
    # raises OperationalError / InterfaceError. close_old_connections() at
    # the job boundary reproduces what fork did implicitly.
    def _perform_job(self, job: Job, queue: Queue) -> None:
        close_old_connections()
        try:
            super()._perform_job(job=job, queue=queue)
        finally:
            close_old_connections()
