from django.urls import path

from .views import ClassCountViewSet

urlpatterns = [
    path(
        "test/tasks/<int:pk>/class-counts",
        ClassCountViewSet.as_view({"get": "retrieve"}, detail=True),
    ),
]
