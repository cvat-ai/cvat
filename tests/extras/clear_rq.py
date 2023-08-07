#!/usr/bin/env python

import argparse
import os

# Required to initialize Django settings correctly
from cvat.asgi import application  # pylint: disable=unused-import

from redis import Redis
from rq import Queue

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Clears all redis queues")
    parser.add_argument('-H', '--host', default=os.environ.get('RQ_REDIS_HOST', 'localhost'), help="Redis host")
    parser.add_argument('-p', '--port', default=int(os.environ.get('RQ_REDIS_PORT', 6379)), type=int, help="Redis port number")
    parser.add_argument('-d', '--db', default=int(os.environ.get('RQ_REDIS_DB', 0)), type=int, help="Redis database")
    parser.add_argument('-P', '--password', default=os.environ.get('RQ_REDIS_PASSWORD'), help="Redis password")
    args = parser.parse_args()

    connection = Redis(args.host, args.port, args.db, args.password)
    for queue in Queue.all(connection=connection):
        for job in queue.jobs:
            job.cancel()
