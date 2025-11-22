# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Any

from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    inline_serializer,
)
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Task, CloudStorage
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.augmentation_manager.models import (
    AugmentationJob,
    AugmentationConfig,
    AugmentationLog,
    JobStatus,
    LogLevel,
)
from cvat.apps.augmentation_manager.permissions import (
    AugmentationJobPermission,
    AugmentationConfigPermission,
)
from cvat.apps.augmentation_manager.serializers import (
    AugmentationJobReadSerializer,
    AugmentationJobWriteSerializer,
    AugmentationConfigReadSerializer,
    AugmentationConfigWriteSerializer,
    AugmentationLogSerializer,
)

slogger = ServerLogManager(__name__)


class AugmentationJobViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
):
    """
    ViewSet for managing augmentation jobs.

    Supports creating, listing, retrieving, and deleting augmentation jobs.
    Jobs run in background workers and process images using Albumentations.
    """

    queryset = AugmentationJob.objects.all().select_related(
        'owner', 'organization', 'task', 'config', 'cloud_storage'
    )

    search_fields = ('name', 'dataset_name', 'version')
    filter_fields = ['id', 'owner', 'organization', 'task', 'config', 'status']
    ordering_fields = ['id', 'name', 'created_date', 'updated_date', 'started_at', 'completed_at']
    ordering = '-created_date'

    iam_organization_field = 'organization'
    iam_permission_class = AugmentationJobPermission

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PATCH', 'PUT']:
            return AugmentationJobWriteSerializer
        return AugmentationJobReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by owner
        owner_id = self.request.query_params.get('owner', None)
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)

        # Filter by organization
        org_id = self.request.query_params.get('organization', None)
        if org_id:
            queryset = queryset.filter(organization_id=org_id)

        # Filter by task
        task_id = self.request.query_params.get('task', None)
        if task_id:
            queryset = queryset.filter(task_id=task_id)

        # Filter by status
        job_status = self.request.query_params.get('status', None)
        if job_status:
            queryset = queryset.filter(status=job_status)

        return queryset

    @extend_schema(
        summary='Create and start augmentation job',
        description='Create a new augmentation job for a task',
        request=AugmentationJobWriteSerializer,
        responses={
            201: AugmentationJobReadSerializer,
            400: OpenApiResponse(description='Invalid request'),
        },
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
    )
    def create(self, request: ExtendedRequest):
        """Create and start an augmentation job"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get related objects
        task_id = serializer.validated_data['task_id']
        task = Task.objects.get(pk=task_id)

        config_id = serializer.validated_data.get('config_id')
        inline_config = serializer.validated_data.get('inline_config')

        cloud_storage_id = serializer.validated_data['cloud_storage_id']
        cloud_storage = CloudStorage.objects.get(pk=cloud_storage_id)

        # Get or create config
        if config_id:
            config = AugmentationConfig.objects.get(pk=config_id)
            config_snapshot = config.pipeline
        else:
            # Use inline config
            config = None
            config_snapshot = inline_config

        # Create job instance
        job = AugmentationJob.objects.create(
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            task=task,
            config=config,
            config_snapshot=config_snapshot,
            dataset_name=serializer.validated_data['dataset_name'],
            version=serializer.validated_data['version'],
            augmentations_per_image=serializer.validated_data['augmentations_per_image'],
            cloud_storage=cloud_storage,
            owner=request.user,
            organization=request.iam_context.get('organization')
        )

        # Log creation
        AugmentationLog.objects.create(
            job=job,
            log_level=LogLevel.INFO,
            message=f"Job created by {request.user.username}"
        )

        # Update config usage if using saved config
        if config:
            config.usage_count += 1
            config.last_used_at = timezone.now()
            config.save(update_fields=['usage_count', 'last_used_at'])

        try:
            # Enqueue background job
            from cvat.apps.augmentation_manager.augmentation_processor import run_augmentation_job
            import django_rq

            queue = django_rq.get_queue('augmentation')
            rq_job = queue.enqueue(run_augmentation_job, job.id)

            job.rq_job_id = rq_job.id
            job.save(update_fields=['rq_job_id'])

            # Log enqueue success
            AugmentationLog.objects.create(
                job=job,
                log_level=LogLevel.INFO,
                message=f"Job enqueued with RQ job ID: {rq_job.id}"
            )

            # Return created job
            response_serializer = AugmentationJobReadSerializer(job)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            slogger.glob.error(f"Failed to enqueue augmentation job {job.id}: {e}")

            # Log error
            AugmentationLog.objects.create(
                job=job,
                log_level=LogLevel.ERROR,
                message=f"Failed to enqueue job: {e}"
            )

            # Update job status
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.save(update_fields=['status', 'error_message'])

            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary='Delete augmentation job',
        description='Delete an augmentation job record',
        responses={
            204: OpenApiResponse(description='Job deleted successfully'),
            404: OpenApiResponse(description='Job not found'),
        }
    )
    def destroy(self, request: ExtendedRequest, pk=None):
        """Delete augmentation job"""
        job = self.get_object()

        # Don't allow deleting running jobs
        if job.is_running:
            return Response(
                {'error': 'Cannot delete a running job. Cancel it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Log deletion
        AugmentationLog.objects.create(
            job=job,
            log_level=LogLevel.INFO,
            message=f"Job deleted by {request.user.username}"
        )

        # Delete job
        job.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary='Cancel augmentation job',
        description='Cancel a running augmentation job',
        responses={
            200: AugmentationJobReadSerializer,
            400: OpenApiResponse(description='Job not running'),
        }
    )
    @action(detail=True, methods=['POST'], url_path='cancel')
    def cancel(self, request: ExtendedRequest, pk=None):
        """Cancel running augmentation job"""
        job = self.get_object()

        if not job.is_running:
            return Response(
                {'error': 'Job is not running'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Cancel RQ job
            if job.rq_job_id:
                import django_rq
                import rq

                queue = django_rq.get_queue('augmentation')
                try:
                    rq_job = queue.fetch_job(job.rq_job_id)
                    if rq_job:
                        rq_job.cancel()
                except rq.exceptions.NoSuchJobError:
                    pass

            # Update job status
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'completed_at', 'updated_date'])

            # Log cancellation
            AugmentationLog.objects.create(
                job=job,
                log_level=LogLevel.INFO,
                message=f"Job cancelled by {request.user.username}"
            )

            serializer = AugmentationJobReadSerializer(job)
            return Response(serializer.data)

        except Exception as e:
            slogger.glob.error(f"Failed to cancel job {job.id}: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary='Get job logs',
        description='Retrieve logs from augmentation job',
        parameters=[
            OpenApiParameter(
                'log_level',
                type=OpenApiTypes.STR,
                description='Filter by log level (debug, info, warning, error)',
                required=False
            ),
            OpenApiParameter(
                'limit',
                type=OpenApiTypes.INT,
                description='Number of log entries to return (default: 100)',
                required=False
            )
        ],
        responses={
            200: AugmentationLogSerializer(many=True)
        }
    )
    @action(detail=True, methods=['GET'], url_path='logs')
    def logs(self, request: ExtendedRequest, pk=None):
        """Get logs from augmentation job"""
        job = self.get_object()

        queryset = AugmentationLog.objects.filter(job=job)

        # Filter by log level
        log_level = request.query_params.get('log_level', None)
        if log_level:
            queryset = queryset.filter(log_level=log_level.upper())

        # Limit number of entries
        limit = int(request.query_params.get('limit', 100))
        queryset = queryset.order_by('-timestamp')[:limit]

        serializer = AugmentationLogSerializer(queryset, many=True)
        return Response(serializer.data)


class AugmentationConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing augmentation configurations.

    Supports creating, listing, retrieving, updating, and deleting augmentation configs.
    Configs are reusable pipeline templates.
    """

    queryset = AugmentationConfig.objects.all().select_related('owner', 'organization')

    search_fields = ('name', 'description')
    filter_fields = ['id', 'owner', 'organization', 'is_template']
    ordering_fields = ['id', 'name', 'created_date', 'updated_date', 'usage_count']
    ordering = '-updated_date'

    iam_organization_field = 'organization'
    iam_permission_class = AugmentationConfigPermission

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PATCH', 'PUT']:
            return AugmentationConfigWriteSerializer
        return AugmentationConfigReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by owner
        owner_id = self.request.query_params.get('owner', None)
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)

        # Filter by organization
        org_id = self.request.query_params.get('organization', None)
        if org_id:
            queryset = queryset.filter(organization_id=org_id)

        # Filter by template flag
        is_template = self.request.query_params.get('is_template', None)
        if is_template is not None:
            queryset = queryset.filter(is_template=is_template.lower() == 'true')

        return queryset

    def perform_create(self, serializer):
        """Create config with owner and organization"""
        serializer.save(
            owner=self.request.user,
            organization=self.request.iam_context.get('organization')
        )

    def perform_update(self, serializer):
        """Update config"""
        serializer.save()
