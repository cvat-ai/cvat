from enum import Enum


class EventTypeChoice(str, Enum):
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"

    JOB_CREATED = "job_created"
    JOB_UPDATED = "job_updated"
    JOB_DELETED = "job_deleted"

    @classmethod
    def choices(cls):
        return [(e.value, e.value) for e in cls]

    def __str__(self):
        return self.value
