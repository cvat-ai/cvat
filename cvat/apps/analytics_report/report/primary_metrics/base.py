# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from datetime import datetime, timezone

from cvat.apps.analytics_report.report.primary_metrics.utils import make_clickhouse_query


class DataExtractorBase:
    def __init__(
        self,
        start_datetime: datetime,
        end_datetime: datetime,
        job_id: int = None,
        task_ids: list[int] = None,
    ):
        # Raw SQL queries are used to execute ClickHouse queries, as there is no ORM available here
        self._query = None
        self._parameters = {
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
        }
        self._rows = []
        self._initialized = False

        if task_ids is not None:
            self._parameters["task_ids"] = task_ids
        elif job_id is not None:
            self._parameters["job_id"] = job_id

    def _make_clickhouse_query(self, parameters):
        return make_clickhouse_query(query=self._query, parameters=parameters)

    def extract_for_job(self, job_id: int, extras: dict = None):
        if not self._initialized:
            self._rows = self._make_clickhouse_query(
                {
                    key: value
                    for key, value in list(self._parameters.items()) + list((extras or {}).items())
                }
            ).result_rows
            self._initialized = True
        return map(lambda x: x[1:], filter(lambda x: x[0] == job_id, self._rows))


class PrimaryMetricBase(metaclass=ABCMeta):
    _key = None
    _title = None
    _description = None
    _granularity = None
    _default_view = None
    _transformations = []
    _is_filterable_by_date = True

    def __init__(self, db_obj, data_extractor: DataExtractorBase = None):
        self._db_obj = db_obj
        self._data_extractor = data_extractor

    @classmethod
    def description(cls):
        return cls._description

    @classmethod
    def title(cls):
        return cls._title

    @classmethod
    def granularity(cls):
        return cls._granularity

    @classmethod
    def default_view(cls):
        return cls._default_view

    @classmethod
    def transformations(cls):
        return cls._transformations

    @classmethod
    def key(cls):
        return cls._key

    @classmethod
    def is_filterable_by_date(cls):
        return cls._is_filterable_by_date

    @abstractmethod
    def calculate(self): ...

    @abstractmethod
    def get_empty(self): ...

    @staticmethod
    def _get_utc_now():
        return datetime.now(timezone.utc)
