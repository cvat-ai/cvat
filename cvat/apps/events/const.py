import datetime

TIME_THRESHOLD = datetime.timedelta(seconds=100)
WORKING_TIME_RESOLUTION = datetime.timedelta(milliseconds=1)
WORKING_TIME_SCOPE = 'send:working_time'
COLLAPSED_EVENT_SCOPES = frozenset(("change:frame",))
