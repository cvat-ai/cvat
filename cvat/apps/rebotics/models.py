from django.db import models
from cvat.apps.engine.models import Task, S3File

GIStatusSuccess = 'SUCCESS'
GIStatusFailed = 'FAILED'

GIStatusChoices = (
    (GIStatusSuccess, 'Success'),
    (GIStatusFailed, 'Failed'),
)

GIInstanceR3dev = 'r3dev'
GIInstanceR3us = 'r3us'
GIInstanceR3cn = 'r3cn'
GIInstanceLocal = 'local'

GIInstanceChoices = (
    (GIInstanceR3dev, 'r3dev'),
    (GIInstanceR3us, 'r3us'),
    (GIInstanceR3cn, 'r3cn'),
    (GIInstanceLocal, 'local')
)

SHAPE_RECTANGLE = 'RECTANGLE'
SHAPE_POLYGON = 'POLYGON'
SHAPE_LINE = 'LINE'

SHAPE_CHOICES = (
    (SHAPE_RECTANGLE, 'rectangle'),
    (SHAPE_POLYGON, 'polygon'),
    (SHAPE_LINE, 'line')
)

ALL_UPC = 'All UPC'
PRICE_TAG_OCR = 'Price tag OCR'


class GalleryImportProgress(models.Model):
    instance = models.CharField(max_length=5, choices=GIInstanceChoices)
    gi_id = models.IntegerField()
    name = models.CharField(max_length=1000, null=True, default=None)
    status = models.CharField(max_length=7, choices=GIStatusChoices, default=GIStatusFailed)
    task = models.ForeignKey(Task, null=True, on_delete=models.SET_NULL, default=None)
    frame = models.IntegerField(null=True, default=None)

    def __str__(self):
        return f'{self.instance} - {self.gi_id}'
