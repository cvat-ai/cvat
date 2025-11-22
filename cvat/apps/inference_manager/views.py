# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import time
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
from cvat.apps.engine.models import CloudStorage, ModelRegistry
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.iam.filters import ORGANIZATION_OPEN_API_PARAMETERS
from cvat.apps.inference_manager.models import (
    InferencePrediction,
    InferenceService,
    InferenceServiceLog,
    LogLevel,
)
from cvat.apps.inference_manager.permissions import InferenceServicePermission
from cvat.apps.inference_manager.serializers import (
    BatchPredictionRequestSerializer,
    InferencePredictionSerializer,
    InferenceServiceLogSerializer,
    InferenceServiceReadSerializer,
    InferenceServiceWriteSerializer,
    PredictionRequestSerializer,
    PredictionResponseSerializer,
    ServiceHealthSerializer,
)
from cvat.apps.inference_manager.service_manager import InferenceServiceManager

slogger = ServerLogManager(__name__)


class InferenceServiceViewSet(
    viewsets.GenericViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
):
    """
    ViewSet for managing inference services.

    Supports creating, listing, retrieving, and deleting inference services.
    Services are Docker containers running model inference servers.
    """

    queryset = InferenceService.objects.all().select_related(
        'owner', 'organization', 'model'
    )

    search_fields = ('name', 'model__name', 'description')
    filter_fields = ['id', 'owner', 'organization', 'model', 'container_status', 'health_status']
    ordering_fields = ['id', 'name', 'created_date', 'updated_date']
    ordering = '-created_date'

    iam_organization_field = 'organization'
    iam_permission_class = InferenceServicePermission

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service_manager = InferenceServiceManager()

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PATCH', 'PUT']:
            return InferenceServiceWriteSerializer
        return InferenceServiceReadSerializer

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

        # Filter by model
        model_id = self.request.query_params.get('model', None)
        if model_id:
            queryset = queryset.filter(model_id=model_id)

        # Filter by status
        container_status = self.request.query_params.get('container_status', None)
        if container_status:
            queryset = queryset.filter(container_status=container_status)

        health_status = self.request.query_params.get('health_status', None)
        if health_status:
            queryset = queryset.filter(health_status=health_status)

        return queryset

    @extend_schema(
        summary='Create and start inference service',
        description='Create a new inference service from a model in Model Registry',
        request=InferenceServiceWriteSerializer,
        responses={
            201: InferenceServiceReadSerializer,
            400: OpenApiResponse(description='Invalid request'),
        },
        parameters=ORGANIZATION_OPEN_API_PARAMETERS,
    )
    def create(self, request: ExtendedRequest):
        """Create and start an inference service"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get model
        model_id = serializer.validated_data['model_id']
        model = ModelRegistry.objects.get(pk=model_id)

        # Create service instance
        service = serializer.save(
            owner=request.user,
            organization=request.iam_context.get('organization')
        )

        # Log creation
        InferenceServiceLog.objects.create(
            service=service,
            log_level=LogLevel.INFO,
            message=f"Service created by {request.user.username}"
        )

        try:
            # Download model from Google Drive
            cloud_storage_id = request.data.get('cloud_storage_id')
            if not cloud_storage_id:
                raise ValidationError("cloud_storage_id is required to download model")

            cloud_storage = CloudStorage.objects.get(pk=cloud_storage_id)

            # Use Google Drive service to download model
            from cvat.apps.engine.google_drive_service import GoogleDriveService
            from cvat.apps.engine.cloud_provider import Credentials

            credentials = Credentials()
            credentials.convert_from_db({
                'type': cloud_storage.credentials_type,
                'value': cloud_storage.credentials,
            })

            drive_service = GoogleDriveService(credentials.oauth_token)
            model_file_content = drive_service.download_file_content(model.drive_file_id)

            # Prepare metadata
            metadata = {
                'model_id': model.id,
                'name': model.name,
                'display_name': model.display_name,
                'version': model.version,
                'framework': model.framework,
                'model_type': model.model_type,
                'labels': model.labels,
                'input_shape': model.input_shape,
                'output_spec': model.output_spec,
                'model_filename': model.model_filename,
            }

            # Create and start service
            container_info = self.service_manager.create_service(
                service=service,
                model_file_content=model_file_content,
                metadata=metadata
            )

            # Log success
            InferenceServiceLog.objects.create(
                service=service,
                log_level=LogLevel.INFO,
                message=f"Service started successfully on port {container_info['port']}"
            )

            # Return created service
            service.refresh_from_db()
            response_serializer = InferenceServiceReadSerializer(service)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            slogger.glob.error(f"Failed to create service {service.id}: {e}")

            # Log error
            InferenceServiceLog.objects.create(
                service=service,
                log_level=LogLevel.ERROR,
                message=f"Failed to start service: {e}"
            )

            # Delete service record if container creation failed
            service.delete()

            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary='Delete inference service',
        description='Stop and delete an inference service',
        responses={
            204: OpenApiResponse(description='Service deleted successfully'),
            404: OpenApiResponse(description='Service not found'),
        }
    )
    def destroy(self, request: ExtendedRequest, pk=None):
        """Stop and delete inference service"""
        service = self.get_object()

        try:
            # Stop service if running
            if service.container_id:
                self.service_manager.stop_service(service)

            # Log deletion
            InferenceServiceLog.objects.create(
                service=service,
                log_level=LogLevel.INFO,
                message=f"Service deleted by {request.user.username}"
            )

            # Delete service record
            service.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            slogger.glob.error(f"Failed to delete service {service.id}: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary='Stop inference service',
        description='Stop a running inference service without deleting it',
        responses={
            200: InferenceServiceReadSerializer,
            400: OpenApiResponse(description='Service not running'),
        }
    )
    @action(detail=True, methods=['POST'], url_path='stop')
    def stop(self, request: ExtendedRequest, pk=None):
        """Stop running inference service"""
        service = self.get_object()

        if not service.is_running:
            return Response(
                {'error': 'Service is not running'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            self.service_manager.stop_service(service)

            # Log stop
            InferenceServiceLog.objects.create(
                service=service,
                log_level=LogLevel.INFO,
                message=f"Service stopped by {request.user.username}"
            )

            service.refresh_from_db()
            serializer = InferenceServiceReadSerializer(service)
            return Response(serializer.data)

        except Exception as e:
            slogger.glob.error(f"Failed to stop service {service.id}: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary='Check service health',
        description='Check health status of inference service',
        responses={
            200: ServiceHealthSerializer,
        }
    )
    @action(detail=True, methods=['GET'], url_path='health')
    def health(self, request: ExtendedRequest, pk=None):
        """Check health status of service"""
        service = self.get_object()

        health_data = self.service_manager.check_health(service)

        # Update service health status
        from cvat.apps.inference_manager.models import HealthStatus
        service.health_status = (
            HealthStatus.HEALTHY if health_data['status'] == 'healthy'
            else HealthStatus.UNHEALTHY
        )
        service.last_health_check = timezone.now()
        service.save(update_fields=['health_status', 'last_health_check', 'updated_date'])

        serializer = ServiceHealthSerializer(health_data)
        return Response(serializer.data)

    @extend_schema(
        summary='Get service logs',
        description='Retrieve container logs from inference service',
        parameters=[
            OpenApiParameter(
                'tail',
                type=OpenApiTypes.INT,
                description='Number of log lines to return (default: 100)',
                required=False
            )
        ],
        responses={
            200: inline_serializer(
                name='ServiceLogsResponse',
                fields={'logs': serializers.CharField()}
            )
        }
    )
    @action(detail=True, methods=['GET'], url_path='logs')
    def logs(self, request: ExtendedRequest, pk=None):
        """Get container logs from service"""
        service = self.get_object()
        tail = int(request.query_params.get('tail', 100))

        logs = self.service_manager.get_service_logs(service, tail=tail)

        return Response({'logs': logs})

    @extend_schema(
        summary='Run prediction',
        description='Run inference on a single image',
        request=PredictionRequestSerializer,
        responses={
            200: PredictionResponseSerializer,
            400: OpenApiResponse(description='Invalid request'),
            503: OpenApiResponse(description='Service unhealthy'),
        }
    )
    @action(detail=True, methods=['POST'], url_path='predict')
    def predict(self, request: ExtendedRequest, pk=None):
        """Run prediction on single image"""
        service = self.get_object()

        # Check service health
        if not service.is_healthy:
            return Response(
                {'error': 'Service is not healthy'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Validate request
        serializer = PredictionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            import requests
            from PIL import Image
            import io
            import base64

            # Prepare image
            image_file = serializer.validated_data['image']
            image = Image.open(image_file)

            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Encode image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG')
            image_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            # Call inference service
            start_time = time.time()
            predict_url = f"{service.service_url}/predict"

            response = requests.post(
                predict_url,
                json={
                    'image': image_b64,
                    'confidence_threshold': serializer.validated_data['confidence_threshold']
                },
                timeout=30
            )
            response_time_ms = int((time.time() - start_time) * 1000)

            if response.status_code != 200:
                raise Exception(f"Prediction failed: {response.text}")

            result = response.json()
            shapes = result.get('shapes', [])

            # Update service metrics
            service.request_count += 1
            service.last_request_at = timezone.now()
            service.save(update_fields=['request_count', 'last_request_at', 'updated_date'])

            # Log prediction
            InferencePrediction.objects.create(
                service=service,
                user=request.user,
                job_id=serializer.validated_data.get('job_id'),
                frame_number=serializer.validated_data.get('frame_number'),
                prediction_count=len(shapes),
                response_time_ms=response_time_ms,
                success=True
            )

            # Return response
            response_data = {
                'shapes': shapes,
                'prediction_count': len(shapes),
                'response_time_ms': response_time_ms,
                'service_url': service.service_url
            }
            response_serializer = PredictionResponseSerializer(response_data)
            return Response(response_serializer.data)

        except Exception as e:
            slogger.glob.error(f"Prediction failed for service {service.id}: {e}")

            # Log failed prediction
            InferencePrediction.objects.create(
                service=service,
                user=request.user,
                prediction_count=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InferenceServiceLogViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    """
    ViewSet for inference service logs.
    """
    queryset = InferenceServiceLog.objects.all().select_related('service')
    serializer_class = InferenceServiceLogSerializer

    filter_fields = ['service', 'log_level']
    ordering_fields = ['timestamp']
    ordering = '-timestamp'

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by service
        service_id = self.request.query_params.get('service', None)
        if service_id:
            queryset = queryset.filter(service_id=service_id)

        # Filter by log level
        log_level = self.request.query_params.get('log_level', None)
        if log_level:
            queryset = queryset.filter(log_level=log_level)

        return queryset


class InferencePredictionViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    """
    ViewSet for inference predictions (analytics).
    """
    queryset = InferencePrediction.objects.all().select_related('service', 'user', 'job')
    serializer_class = InferencePredictionSerializer

    filter_fields = ['service', 'user', 'job', 'success']
    ordering_fields = ['request_timestamp']
    ordering = '-request_timestamp'

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by service
        service_id = self.request.query_params.get('service', None)
        if service_id:
            queryset = queryset.filter(service_id=service_id)

        # Filter by user
        user_id = self.request.query_params.get('user', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by job
        job_id = self.request.query_params.get('job', None)
        if job_id:
            queryset = queryset.filter(job_id=job_id)

        return queryset
