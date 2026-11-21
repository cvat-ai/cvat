from django.urls import path

from .views import ClassCountViewSet, analytics_page

urlpatterns = [
    path("test/analytics", analytics_page),
    path(
        "test/tasks/<int:pk>/class-counts",
        ClassCountViewSet.as_view({"get": "retrieve"}, detail=True),
    ),
]
