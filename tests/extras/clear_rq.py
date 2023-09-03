#!/usr/bin/env python

import argparse
import os

# Required to initialize Django settings correctly
from cvat.asgi import application  # pylint: disable=unused-import
from django.conf import settings

from django_rq import get_queue, get_scheduler

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Clears all redis queues")
    parser.add_argument('-H', '--host', default=os.environ.get('RQ_REDIS_HOST', 'localhost'), help="Redis host")
    parser.add_argument('-p', '--port', default=int(os.environ.get('RQ_REDIS_PORT', 6379)), type=int, help="Redis port number")
    parser.add_argument('-d', '--db', default=int(os.environ.get('RQ_REDIS_DB', 0)), type=int, help="Redis database")
    parser.add_argument('-P', '--password', default=os.environ.get('RQ_REDIS_PASSWORD'), help="Redis password")
    args = parser.parse_args()

    for queue_name in settings.RQ_QUEUES:
        queue = get_queue(queue_name)
        for job in queue.jobs:
            print(f"Cleaning queue job {queue.name}: {job.id}")
            job.cancel()

        scheduler = get_scheduler(queue_name)
        for job in scheduler.get_jobs():
            print(f"Cleaning scheduler job {queue.name}: {job.id}")
            scheduler.cancel(job)
