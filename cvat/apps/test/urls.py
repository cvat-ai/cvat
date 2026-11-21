from django.urls import path

from .views import ClassCountView

urlpatterns = [
    path("test/tasks/<int:task_id>/class-counts", ClassCountView.as_view()),
]
