#!/usr/bin/env python

# This script adds access to the Django env and settings in the default rqscheduler
# implementation. This is required for correct work with CVAT queue settings and
# their access options such as login and password.

import argparse
import os
import sys

# Required to initialize Django settings correctly
from cvat.asgi import application  # pylint: disable=unused-import

from redis import Redis
from rq import Queue
from rq_scheduler.scripts import rqscheduler

if __name__ == '__main__':
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('-H', '--host', default=os.environ.get('RQ_REDIS_HOST', 'localhost'), help="Redis host")
    parser.add_argument('-p', '--port', default=int(os.environ.get('RQ_REDIS_PORT', 6379)), type=int, help="Redis port number")
    parser.add_argument('-d', '--db', default=int(os.environ.get('RQ_REDIS_DB', 0)), type=int, help="Redis database")
    parser.add_argument('-P', '--password', default=os.environ.get('RQ_REDIS_PASSWORD'), help="Redis password")
    parser.add_argument('--clear', action='store_true', help="Clean up all jobs from all queues")
    args, _ = parser.parse_known_args()

    if args.clear:
        connection = Redis(args.host, args.port, args.db, args.password)
        for queue in Queue.all(connection=connection):
            for job in queue.jobs:
                job.cancel()

        sys.exit(0)

    else:
        rqscheduler.main()
