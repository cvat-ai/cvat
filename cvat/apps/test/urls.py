from rest_framework import routers
from . import views

router = routers.DefaultRouter(trailing_slash=False)
router.register('tasks', views.TestTaskViewSet)

urlpatterns = router.urls
