from rest_framework.routers import DefaultRouter

from .views import ImportTrainingDataViewSet

router = DefaultRouter(trailing_slash=False)
router.register('import_training_data', ImportTrainingDataViewSet, basename='import_training_data_viewset')

app_name = 'rebotics'

urlpatterns = router.urls
