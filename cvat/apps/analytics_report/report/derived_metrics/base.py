# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.analytics_report.report.primary_metrics import DataExtractorBase, PrimaryMetricBase


class DerivedMetricBase(PrimaryMetricBase):
    def __init__(self, db_obj, data_extractor: DataExtractorBase = None, primary_statistics=None):
        super().__init__(db_obj, data_extractor)

        self._primary_statistics = primary_statistics or []
