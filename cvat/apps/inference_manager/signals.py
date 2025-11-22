# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Signal handlers for inference_manager app.

Handles cleanup when users or organizations are deleted.
"""

from django.db.models.signals import pre_delete
from django.dispatch import receiver

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.inference_manager.models import InferenceService
from cvat.apps.inference_manager.service_manager import InferenceServiceManager

slogger = ServerLogManager(__name__)


@receiver(pre_delete, sender=InferenceService)
def stop_service_on_delete(sender, instance, **kwargs):
    """
    Stop Docker container when service is deleted.

    This ensures containers are cleaned up even if delete() is called
    directly without going through the ViewSet.
    """
    if instance.container_id:
        try:
            service_manager = InferenceServiceManager()
            service_manager.stop_service(instance)
            slogger.glob.info(f"Stopped container for service {instance.id} before deletion")
        except Exception as e:
            slogger.glob.error(f"Failed to stop container for service {instance.id}: {e}")
