#!/usr/bin/env python

# This script adds access to the Django env and settings in the default rqscheduler
# implementation. This is required for correct work with CVAT queue settings and
# their access options such as login and password.

# Required to initialize Django settings correctly
from cvat.asgi import application  # pylint: disable=unused-import

from rq_scheduler.scripts import rqscheduler

if __name__ == '__main__':
    rqscheduler.main()
