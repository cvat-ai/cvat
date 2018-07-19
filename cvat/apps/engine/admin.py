from django.contrib import admin
from cvat.apps.engine.models import Job

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['get_task_name', 'get_id', 'annotator']
    list_filter = ['annotator']
    search_fields = ['segment__task__name']
    fields = ['annotator']