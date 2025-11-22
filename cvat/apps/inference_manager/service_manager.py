# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Service Manager for creating and managing Docker-based inference services.
"""

from __future__ import annotations

import os
import random
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

import docker
import requests
from django.conf import settings
from django.utils import timezone
from docker.errors import DockerException, NotFound

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.inference_manager.models import (
    HealthStatus,
    InferenceService,
    LogLevel,
    ServiceStatus,
)

slogger = ServerLogManager(__name__)


class InferenceServiceManager:
    """
    Manages lifecycle of Docker-based inference services.

    Responsibilities:
    - Download models from Google Drive
    - Create and configure Docker containers
    - Allocate ports
    - Monitor health
    - Clean up resources
    """

    # Port range for inference services (configurable via settings)
    DEFAULT_PORT_RANGE = (9000, 9999)

    # Docker image mapping for different frameworks
    FRAMEWORK_IMAGES = {
        'PYTORCH': 'cvat/inference-pytorch:latest',
        'TENSORFLOW': 'cvat/inference-tensorflow:latest',
        'ONNX': 'cvat/inference-onnx:latest',
        'TENSORRT': 'cvat/inference-tensorrt:latest',
        'KERAS': 'cvat/inference-tensorflow:latest',  # Keras uses TensorFlow backend
        'SCIKIT_LEARN': 'cvat/inference-sklearn:latest',
        'XGBOOST': 'cvat/inference-xgboost:latest',
        'LIGHTGBM': 'cvat/inference-lightgbm:latest',
        'OTHER': 'cvat/inference-generic:latest',
    }

    # Health check configuration
    HEALTH_CHECK_TIMEOUT = 60  # seconds
    HEALTH_CHECK_INTERVAL = 2  # seconds

    def __init__(self):
        """Initialize Docker client and configuration."""
        try:
            self.client = docker.from_env()
            slogger.glob.info("InferenceServiceManager initialized with Docker client")
        except DockerException as e:
            slogger.glob.error(f"Failed to initialize Docker client: {e}")
            raise

        # Get configuration from settings
        self.port_range = getattr(
            settings,
            'INFERENCE_SERVICE_PORT_RANGE',
            self.DEFAULT_PORT_RANGE
        )
        self.temp_dir = Path(
            getattr(
                settings,
                'INFERENCE_SERVICE_TEMP_DIR',
                '/tmp/inference_models'
            )
        )
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def create_service(
        self,
        service: InferenceService,
        model_file_content: bytes,
        metadata: dict
    ) -> dict[str, Any]:
        """
        Create and start an inference service container.

        Args:
            service: InferenceService instance
            model_file_content: Binary content of the model file
            metadata: Model metadata dictionary

        Returns:
            dict: Container information (container_id, port, status)

        Raises:
            Exception: If service creation fails
        """
        service.container_status = ServiceStatus.CREATING
        service.save(update_fields=['container_status', 'updated_date'])

        try:
            # 1. Prepare model directory
            model_dir = self._prepare_model_directory(service.id, model_file_content, metadata)

            # 2. Select Docker image
            image = self._get_framework_image(service.model.framework)

            # 3. Allocate port
            port = self._allocate_port()

            # 4. Generate container name
            container_name = f"cvat-inference-{service.owner.id}-{service.model.id}-{service.id}"

            # 5. Prepare environment variables
            env_vars = {
                'MODEL_PATH': f'/models/{service.model.model_filename}',
                'METADATA_PATH': '/models/metadata.json',
                'PORT': str(port),
                'MODEL_NAME': service.model.name,
                'MODEL_FRAMEWORK': service.model.framework,
                **service.api_config.get('env', {}),
            }

            # 6. Prepare resource limits
            mem_limit = service.api_config.get('memory_limit', '4g')
            cpu_period = 100000
            cpu_quota = int(service.api_config.get('cpu_limit', 2) * cpu_period)

            # 7. Create container
            slogger.glob.info(f"Creating container '{container_name}' on port {port}")

            container = self.client.containers.run(
                image=image,
                detach=True,
                name=container_name,
                ports={f'8000/tcp': port},  # Container listens on 8000, mapped to allocated port
                volumes={
                    str(model_dir): {'bind': '/models', 'mode': 'ro'}
                },
                environment=env_vars,
                labels={
                    'cvat.inference_service': 'true',
                    'cvat.service_id': str(service.id),
                    'cvat.user_id': str(service.owner.id),
                    'cvat.model_id': str(service.model.id),
                    'cvat.organization_id': str(service.organization_id) if service.organization_id else '',
                },
                mem_limit=mem_limit,
                cpu_period=cpu_period,
                cpu_quota=cpu_quota,
                restart_policy={"Name": "on-failure", "MaximumRetryCount": 3},
                remove=False,  # Don't auto-remove so we can get logs
            )

            # 8. Update service with container info
            service.container_id = container.id
            service.container_name = container_name
            service.port = port
            service.container_status = ServiceStatus.STARTING
            service.save(update_fields=[
                'container_id',
                'container_name',
                'port',
                'container_status',
                'updated_date'
            ])

            # 9. Wait for health check
            if self._wait_for_health(service):
                slogger.glob.info(f"Service {service.id} is healthy and ready")
                return {
                    'container_id': container.id,
                    'container_name': container_name,
                    'port': port,
                    'status': ServiceStatus.RUNNING,
                    'service_url': service.service_url,
                }
            else:
                # Health check failed - stop and clean up
                error_msg = "Service failed health check"
                logs = self._get_container_logs(container.id)
                slogger.glob.error(f"{error_msg}. Logs:\n{logs}")

                service.container_status = ServiceStatus.FAILED
                service.health_status = HealthStatus.UNHEALTHY
                service.error_message = f"{error_msg}. Check logs for details."
                service.save(update_fields=[
                    'container_status',
                    'health_status',
                    'error_message',
                    'updated_date'
                ])

                # Clean up
                self._stop_container(container.id)
                self._cleanup_model_directory(service.id)

                raise Exception(f"{error_msg}. Container logs: {logs[:500]}")

        except Exception as e:
            slogger.glob.error(f"Failed to create service {service.id}: {e}")
            service.container_status = ServiceStatus.FAILED
            service.error_message = str(e)
            service.save(update_fields=['container_status', 'error_message', 'updated_date'])
            raise

    def stop_service(self, service: InferenceService) -> None:
        """
        Stop and remove inference service container.

        Args:
            service: InferenceService instance
        """
        if not service.container_id:
            slogger.glob.warning(f"Service {service.id} has no container_id, nothing to stop")
            return

        service.container_status = ServiceStatus.STOPPING
        service.save(update_fields=['container_status', 'updated_date'])

        try:
            # Stop container
            self._stop_container(service.container_id)

            # Clean up model directory
            self._cleanup_model_directory(service.id)

            # Update service status
            service.container_status = ServiceStatus.STOPPED
            service.health_status = HealthStatus.UNKNOWN
            service.stopped_at = timezone.now()
            service.save(update_fields=[
                'container_status',
                'health_status',
                'stopped_at',
                'updated_date'
            ])

            slogger.glob.info(f"Service {service.id} stopped successfully")

        except Exception as e:
            slogger.glob.error(f"Failed to stop service {service.id}: {e}")
            service.container_status = ServiceStatus.FAILED
            service.error_message = f"Failed to stop: {e}"
            service.save(update_fields=['container_status', 'error_message', 'updated_date'])
            raise

    def check_health(self, service: InferenceService) -> dict[str, Any]:
        """
        Check health status of inference service.

        Args:
            service: InferenceService instance

        Returns:
            dict: Health status information
        """
        if not service.is_running:
            return {
                'status': 'unhealthy',
                'reason': 'Service is not running',
                'container_status': service.container_status
            }

        try:
            # Try to reach health endpoint
            health_url = f"{service.service_url}/health"
            response = requests.get(health_url, timeout=5)

            if response.status_code == 200:
                health_data = response.json()
                return {
                    'status': 'healthy',
                    'service_url': service.service_url,
                    **health_data
                }
            else:
                return {
                    'status': 'unhealthy',
                    'reason': f'Health endpoint returned {response.status_code}',
                    'response': response.text[:200]
                }

        except requests.exceptions.RequestException as e:
            return {
                'status': 'unhealthy',
                'reason': f'Health check failed: {e}',
                'service_url': service.service_url
            }

    def get_service_logs(self, service: InferenceService, tail: int = 100) -> str:
        """
        Get logs from inference service container.

        Args:
            service: InferenceService instance
            tail: Number of log lines to return

        Returns:
            str: Container logs
        """
        if not service.container_id:
            return "No container ID available"

        return self._get_container_logs(service.container_id, tail=tail)

    # Private helper methods

    def _prepare_model_directory(
        self,
        service_id: int,
        model_file_content: bytes,
        metadata: dict
    ) -> Path:
        """Prepare directory with model file and metadata."""
        import json

        model_dir = self.temp_dir / str(service_id)
        model_dir.mkdir(parents=True, exist_ok=True)

        # Write model file
        model_filename = metadata.get('model_filename', 'model')
        model_path = model_dir / model_filename
        model_path.write_bytes(model_file_content)

        # Write metadata
        metadata_path = model_dir / 'metadata.json'
        metadata_path.write_text(json.dumps(metadata, indent=2))

        slogger.glob.info(f"Prepared model directory: {model_dir}")
        return model_dir

    def _cleanup_model_directory(self, service_id: int) -> None:
        """Remove model directory for service."""
        model_dir = self.temp_dir / str(service_id)
        if model_dir.exists():
            shutil.rmtree(model_dir)
            slogger.glob.info(f"Cleaned up model directory: {model_dir}")

    def _get_framework_image(self, framework: str) -> str:
        """Get Docker image for framework."""
        image = self.FRAMEWORK_IMAGES.get(framework, self.FRAMEWORK_IMAGES['OTHER'])
        slogger.glob.info(f"Selected image '{image}' for framework '{framework}'")
        return image

    def _allocate_port(self) -> int:
        """Allocate an available port for the service."""
        # Get currently used ports
        used_ports = set(
            InferenceService.objects.filter(
                container_status__in=[ServiceStatus.RUNNING, ServiceStatus.STARTING]
            ).values_list('port', flat=True)
        )

        # Find available port
        for _ in range(100):  # Try up to 100 times
            port = random.randint(*self.port_range)
            if port not in used_ports:
                slogger.glob.info(f"Allocated port {port}")
                return port

        raise Exception("No available ports in range")

    def _wait_for_health(self, service: InferenceService) -> bool:
        """Wait for service to become healthy."""
        slogger.glob.info(f"Waiting for service {service.id} to become healthy...")

        start_time = time.time()
        while time.time() - start_time < self.HEALTH_CHECK_TIMEOUT:
            health = self.check_health(service)

            if health['status'] == 'healthy':
                service.health_status = HealthStatus.HEALTHY
                service.container_status = ServiceStatus.RUNNING
                service.started_at = timezone.now()
                service.last_health_check = timezone.now()
                service.save(update_fields=[
                    'health_status',
                    'container_status',
                    'started_at',
                    'last_health_check',
                    'updated_date'
                ])
                return True

            time.sleep(self.HEALTH_CHECK_INTERVAL)

        return False

    def _stop_container(self, container_id: str) -> None:
        """Stop and remove a Docker container."""
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=10)
            container.remove()
            slogger.glob.info(f"Stopped and removed container {container_id}")
        except NotFound:
            slogger.glob.warning(f"Container {container_id} not found")
        except Exception as e:
            slogger.glob.error(f"Error stopping container {container_id}: {e}")
            raise

    def _get_container_logs(self, container_id: str, tail: int = 100) -> str:
        """Get logs from container."""
        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail).decode('utf-8', errors='replace')
            return logs
        except NotFound:
            return f"Container {container_id} not found"
        except Exception as e:
            return f"Error getting logs: {e}"
