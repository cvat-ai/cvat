
from django.urls import path

from .views import AnnotationCountView

urlpatterns = [
    path(
        "tasks/<int:task_id>/annotation-counts",
        AnnotationCountView.as_view(),
        name="task-annotation-counts",
    ),
]
