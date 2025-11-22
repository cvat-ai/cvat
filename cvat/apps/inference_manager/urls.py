# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.routers import DefaultRouter

from cvat.apps.inference_manager.views import (
    InferencePredictionViewSet,
    InferenceServiceLogViewSet,
    InferenceServiceViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register('inference-services', InferenceServiceViewSet)
router.register('inference-logs', InferenceServiceLogViewSet)
router.register('inference-predictions', InferencePredictionViewSet)

urlpatterns = router.urls
