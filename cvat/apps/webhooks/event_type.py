from enum import Enum


class EventTypeChoice(str, Enum):
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"

    @classmethod
    def choices(cls):
        return [(e.value, e.value) for e in cls]

    def __str__(self):
        return self.value
