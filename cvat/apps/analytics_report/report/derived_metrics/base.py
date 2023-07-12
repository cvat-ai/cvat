# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.report.primary_metrics import PrimaryMetricBase


class DerivedMetricBase(PrimaryMetricBase):
    def __init__(self, db_obj, primary_statistics):
        super().__init__(db_obj)

        self._primary_statistics = primary_statistics
