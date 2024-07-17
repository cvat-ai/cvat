# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from dataclasses import dataclass
from typing import NewType


RqId = NewType("RqId", str)


{
    "validation_frame_ids": [1, 4, 5],
    "inactive_validation_frames": [4],
    "jobs": [
        {
            "id": 1,
            "validation_frames": [1, 4]
        }
    ],
}


class ReportManager:
    def schedule_report_creation_job(self, task: int) -> RqId:
        raise NotImplementedError

    def create_report(self, task: int) -> HoneypotsReport:
        pass
