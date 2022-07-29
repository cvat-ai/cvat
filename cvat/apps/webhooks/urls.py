from rest_framework.routers import DefaultRouter
from .views import WebhookViewSet

router = DefaultRouter(trailing_slash=False)
router.register("webhooks", WebhookViewSet)

urlpatterns = router.urls
