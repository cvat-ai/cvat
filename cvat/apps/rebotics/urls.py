from rest_framework.routers import DefaultRouter

from .views import RetailerImportViewset

router = DefaultRouter(trailing_slash=False)
router.register('retailer_import', RetailerImportViewset, basename='retailer_import_viewset')

app_name = 'rebotics'

urlpatterns = router.urls
