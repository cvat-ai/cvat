from cvat.apps.analytics_report.report.primary_metrics.utils import make_clickhouse_query
from datetime import datetime, timezone

class IJobPrimaryMetric():
    _title = None
    _description = None
    _query = None
    _granularity = None
    _default_view = None

    def __init__(self, job_id):
        self._job_id = job_id

    @property
    def description(cls):
        return cls._description

    @property
    def title(cls):
        return cls._title

    @property
    def granularity(cls):
        return cls._granularity

    @property
    def default_view(cls):
        return cls._default_view

    def calculate(self):
        raise NotImplementedError

    def _make_clickhouse_query(self, parameters):
        return make_clickhouse_query(query=self._query, parameters=parameters)

    @staticmethod
    def _get_utc_now():
        return datetime.now(timezone.utc)
