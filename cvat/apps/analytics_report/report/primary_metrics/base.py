# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABCMeta, abstractmethod
from datetime import datetime, timezone

from cvat.apps.analytics_report.report.primary_metrics.utils import make_clickhouse_query


class PrimaryMetricBase(metaclass=ABCMeta):
    _title = None
    _description = None
    # Raw SQL queries are used to execute ClickHouse queries, as there is no ORM available here
    _query = None
    _granularity = None
    _default_view = None
    _key = None
    _transformations = []
    _is_filterable_by_date = True

    def __init__(self, db_obj):
        self._db_obj = db_obj

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

    def _make_clickhouse_query(self, parameters):
        return make_clickhouse_query(query=self._query, parameters=parameters)

    @staticmethod
    def _get_utc_now():
        return datetime.now(timezone.utc)
