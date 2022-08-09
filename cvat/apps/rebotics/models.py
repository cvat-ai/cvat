from django.db import models
from cvat.rebotics.utils import DateAwareModel
from django.utils.translation import ugettext_lazy as _


# This is used as user for authentication when importing datasets from retailer instances.
class ClassificationRetailer(DateAwareModel):
    title = models.CharField(max_length=255)
    code = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.code

    class Meta:
        verbose_name = _("Classification retailer")
        verbose_name_plural = _("Classification retailers")

    def is_authenticated(self):
        return True
