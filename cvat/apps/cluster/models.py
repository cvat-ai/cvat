from enum import Enum
from django.db import models
from django.contrib.auth import get_user_model
from cvat.apps.organizations.models import Organization

class TaskTypeChoice(str, Enum):
    CLASSIFICATION = 'classification'
    DETECTION = 'detection'
    SEGMENTATION = 'segmentation'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class CapabilityChoice(str, Enum):
    TRAIN = 'train'
    PREDICT = 'predict'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class Node(models.Model):
    alias = models.CharField(max_length=64, blank=True)
    task_type = models.CharField(max_length=15, choices=TaskTypeChoice.choices())
    capability = models.CharField(max_length=15, choices=CapabilityChoice.choices())
    description = models.TextField(blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(get_user_model(), null=True,
        blank=True, on_delete=models.SET_NULL, related_name='+')
    url = models.URLField(unique=True)
    organization = models.ForeignKey(Organization, null=True, default=None,
        blank=True, on_delete=models.SET_NULL, related_name="nodes")

    def __str__(self):
        return self.alias

    class Meta:
        default_permissions = ()
