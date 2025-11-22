# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AugmentationJobViewSet, AugmentationConfigViewSet

router = DefaultRouter(trailing_slash=False)
router.register('augmentation-jobs', AugmentationJobViewSet, basename='augmentation-jobs')
router.register('augmentation-configs', AugmentationConfigViewSet, basename='augmentation-configs')

urlpatterns = router.urls
