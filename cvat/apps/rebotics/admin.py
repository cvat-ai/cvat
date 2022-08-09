from django.contrib import admin
from .models import ClassificationRetailer


class RetailerAdmin(admin.ModelAdmin):
    pass


admin.site.register(ClassificationRetailer, RetailerAdmin)
