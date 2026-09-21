# Copyright (C) 2025 CVAT Custom Task Analysis Module
# SPDX-License-Identifier: MIT

"""
Task Analysis Views that provide comprehensive information about tasks,
including basic task info and detailed annotation analysis by labels.
"""

import json
from typing import Dict, List, Optional
from collections import defaultdict

from django.http import Http404
from django.db.models import Q, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from cvat.apps.engine.models import Task, Job, Label, LabeledShape, LabeledImage, LabeledTrack, TrackedShape
from .models import TaskTrainMetadata
from .annotation_stats import assemble_label_analysis
from .s3_utils import (
    create_s3_generator_from_env,
    get_videos_with_thumbnails_cached,
    validate_expiration,
)


class TaskAnalysisView(APIView):
    """
    Comprehensive task analysis API that provides:
    1. Basic task information (from CVAT's standard API)
    2. Detailed annotation analysis by labels with frame arrays
    3. Statistics and summaries

    GET /api/custom/task-analysis/?task_id={id}

    Returns label_id: [array of frames] format as requested.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get query parameters
        task_id = request.query_params.get('task_id')
        # Validate/bounds-check expiration (60..604800s) before it reaches the
        # presign call, cache TTL and cache key — mirrors TaskVideosView.
        try:
            video_expiration = validate_expiration(
                request.query_params.get('video_expiration', 36000)
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        # ?refresh=1 bypasses the cached S3 listing and re-generates fresh URLs.
        refresh_videos = str(request.query_params.get('refresh', '')).lower() in ('1', 'true', 'yes')

        if not task_id:
            return Response(
                {'error': 'task_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            task_id = int(task_id)
        except ValueError:
            return Response(
                {'error': 'task_id must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the task with related data
        try:
            task = Task.objects.select_related('project', 'owner', 'assignee', 'data').get(id=task_id)
        except Task.DoesNotExist:
            raise Http404("Task not found")

        # Permission check
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Build comprehensive task analysis
        analysis = self._build_task_analysis(task, video_expiration, refresh_videos)

        return Response(analysis)

    def _build_task_analysis(self, task: Task, video_expiration: int = 3600,
                             refresh_videos: bool = False) -> Dict:
        """Build comprehensive task analysis data."""

        # 1. Basic task information (similar to CVAT's standard API)
        basic_info = self._get_basic_task_info(task)

        # 2. Get all jobs for this task
        jobs = Job.objects.filter(segment__task=task).select_related('segment')

        # 3. Get all labels for this task
        labels = self._get_task_labels(task)

        # 4. Analyze annotations by label
        annotation_analysis = self._analyze_annotations_by_label(task, jobs, labels)

        # 5. Generate statistics
        statistics = self._generate_task_statistics(task, jobs, annotation_analysis)

        # 6. Get S3 videos with presigned URLs (if available)
        videos_info = self._get_videos_info(task, video_expiration, refresh_videos)

        # Combine all information
        analysis = {
            **basic_info,
            "jobs": self._get_jobs_info(jobs),
            "labels": self._format_labels_info(labels),
            "annotation_analysis": annotation_analysis,
            "statistics": statistics,
            "videos": videos_info,
            "analysis_metadata": {
                "generated_at": "2025-09-09T20:45:00Z",  # Current timestamp
                "api_version": "v1.0"
            }
        }

        return analysis

    def _get_basic_task_info(self, task: Task) -> Dict:
        """Get basic task information similar to CVAT's standard API."""

        # Get or create train metadata for this task
        train_metadata, created = TaskTrainMetadata.get_or_create_for_task(task)

        # Lookup train_id → group from the mapping table (one indexed PK
        # lookup; cheap). Returns None when the train_id has no mapping.
        from .models import TrainGroupMapping
        mapping = TrainGroupMapping.objects.filter(
            train_id=train_metadata.train_id,
        ).only("group").first()
        group = mapping.group if mapping else None

        vision = getattr(task, "vision_analysis", None)
        basic_info = {
            "group": group,
            "id": task.id,
            "name": task.name,
            "project_id": task.project.id if task.project else None,
            "project_name": task.project.name if task.project else None,
            "owner": {
                "id": task.owner.id,
                "username": task.owner.username,
                "first_name": task.owner.first_name,
                "last_name": task.owner.last_name
            } if task.owner else None,
            "assignee": {
                "id": task.assignee.id,
                "username": task.assignee.username,
                "first_name": task.assignee.first_name,
                "last_name": task.assignee.last_name
            } if task.assignee else None,
            "status": task.status,
            "created_date": task.created_date.isoformat() if task.created_date else None,
            "updated_date": task.updated_date.isoformat() if task.updated_date else None,
            "bug_tracker": task.bug_tracker,
            "subset": task.subset,
            "data": {
                "id": task.data.id if task.data else None,
                "chunk_size": task.data.chunk_size if task.data else None,
                "size": task.data.size if task.data else None,
                "image_quality": task.data.image_quality if task.data else None,
                "start_frame": task.data.start_frame if task.data else None,
                "stop_frame": task.data.stop_frame if task.data else None,
                "frame_filter": task.data.frame_filter if task.data else None,
            } if task.data else None,
            # Train metadata
            "train_metadata": {
                "train_id": train_metadata.train_id,
                "verdict": train_metadata.verdict,
                "verdict_display": train_metadata.verdict_display,
                "notes": train_metadata.notes,
                "confidence_score": train_metadata.confidence_score,
                "server_files_path": train_metadata.server_files_path,
                "created_date": train_metadata.created_date.isoformat(),
                "updated_date": train_metadata.updated_date.isoformat(),
                "is_new": created  # Indicates if metadata was just created
            },
            # Orochi Vision summary; the full document is at tasks/{id}/chapters/
            "vision": vision.summary() if vision else None,
        }

        return basic_info

    def _get_videos_info(self, task: Task, expiration: int = 3600,
                         refresh: bool = False) -> Dict:
        """Get S3 videos with presigned URLs (and thumbnails) if available."""

        videos_info = {
            "available": False,
            "server_files_path": None,
            "s3_bucket": None,
            "video_count": 0,
            "videos": [],
            "error": None
        }

        try:
            # Get train metadata with server_files_path
            train_metadata = task.train_metadata
            server_files_path = train_metadata.server_files_path

            # Check if server_files_path is valid
            if not server_files_path or server_files_path == '/':
                videos_info["error"] = "No valid server_files_path configured"
                return videos_info

            videos_info["server_files_path"] = server_files_path

            # Generate presigned URLs for videos using environment variables
            try:
                s3_generator, bucket_name = create_s3_generator_from_env()

                videos_info["s3_bucket"] = bucket_name

                videos = get_videos_with_thumbnails_cached(
                    s3_generator,
                    bucket_name,
                    server_files_path,
                    expiration,
                    refresh=refresh,
                )

                videos_info["available"] = True
                videos_info["video_count"] = len(videos)
                videos_info["videos"] = videos
                videos_info["expiration_seconds"] = expiration

            except ValueError as e:
                # Missing S3 environment variables
                videos_info["error"] = f"S3 not configured: {str(e)}"
            except Exception as e:
                videos_info["error"] = f"Failed to get videos: {str(e)}"

        except TaskTrainMetadata.DoesNotExist:
            videos_info["error"] = "No train metadata found"
        except AttributeError:
            videos_info["error"] = "Task data not available"
        except Exception as e:
            videos_info["error"] = f"Unexpected error: {str(e)}"

        return videos_info

    def _get_jobs_info(self, jobs) -> List[Dict]:
        """Get information about all jobs in the task."""

        jobs_info = []
        for job in jobs:
            job_info = {
                "id": job.id,
                "status": job.status,
                "stage": job.stage,
                "state": job.state,
                "type": job.type,
                "start_frame": job.segment.start_frame,
                "stop_frame": job.segment.stop_frame,
                "frame_count": job.segment.stop_frame - job.segment.start_frame + 1
            }
            jobs_info.append(job_info)

        return jobs_info

    def _get_task_labels(self, task: Task) -> List[Label]:
        """Get all labels associated with this task."""

        # Labels can be from task or project
        labels = Label.objects.filter(
            Q(task=task) | Q(project=task.project)
        ).order_by('name')

        return list(labels)

    def _format_labels_info(self, labels: List[Label]) -> List[Dict]:
        """Format labels information."""

        labels_info = []
        for label in labels:
            label_info = {
                "id": label.id,
                "name": label.name,
                "color": label.color,
                "type": label.type if hasattr(label, 'type') else None,
                "parent_id": label.parent.id if label.parent else None,
                "parent_name": label.parent.name if label.parent else None
            }
            labels_info.append(label_info)

        return labels_info

    def _analyze_annotations_by_label(self, task: Task, jobs, labels: List[Label]) -> Dict:
        """
        Analyze annotations organized by labels.

        Runs a constant number of grouped queries (independent of job/label
        counts) and assembles the per-label structure in pure Python. Replaces
        the previous O(jobs * labels) per-label query loop.
        """
        # Evaluate the jobs queryset once; its result cache is reused by the
        # other consumers (job info, statistics).
        job_ids = [job.id for job in jobs]

        if not job_ids:
            return assemble_label_analysis(labels, [], [], [], {})

        shape_rows = LabeledShape.objects.filter(
            job_id__in=job_ids
        ).values_list('label_id', 'frame')

        image_rows = LabeledImage.objects.filter(
            job_id__in=job_ids
        ).values_list('label_id', 'frame')

        tracked_rows = TrackedShape.objects.filter(
            track__job_id__in=job_ids
        ).values_list('track__label_id', 'frame')

        track_counts = {
            row['label_id']: row['count']
            for row in LabeledTrack.objects.filter(job_id__in=job_ids)
            .values('label_id')
            .annotate(count=Count('id'))
        }

        return assemble_label_analysis(
            labels, shape_rows, image_rows, tracked_rows, track_counts
        )


    def _generate_task_statistics(self, task: Task, jobs, annotation_analysis: Dict) -> Dict:
        """Generate comprehensive task statistics."""

        # Basic counts
        total_jobs = len(jobs)
        total_labels = len(annotation_analysis["labels_analysis"])
        total_annotated_frames = annotation_analysis["total_annotated_frames"]

        # Calculate total frames in task
        total_task_frames = 0
        if task.data:
            total_task_frames = task.data.size or 0

        # Calculate annotation density
        annotation_density = 0
        if total_task_frames > 0:
            annotation_density = (total_annotated_frames / total_task_frames) * 100

        # Label statistics
        label_stats = {}
        most_used_label = None
        max_frame_count = 0

        for label_name, label_data in annotation_analysis["labels_analysis"].items():
            frame_count = label_data["frame_count"]
            label_stats[label_name] = {
                "frame_count": frame_count,
                "percentage_of_annotated_frames": (frame_count / total_annotated_frames * 100) if total_annotated_frames > 0 else 0,
                "annotation_counts": label_data["annotation_counts"]
            }

            if frame_count > max_frame_count:
                max_frame_count = frame_count
                most_used_label = label_name

        # Job statistics
        job_stats = []
        for job in jobs:
            job_frame_count = job.segment.stop_frame - job.segment.start_frame + 1
            job_stats.append({
                "job_id": job.id,
                "frame_range": f"{job.segment.start_frame}-{job.segment.stop_frame}",
                "total_frames": job_frame_count,
                "status": job.status
            })

        return {
            "summary": {
                "total_jobs": total_jobs,
                "total_labels": total_labels,
                "total_task_frames": total_task_frames,
                "total_annotated_frames": total_annotated_frames,
                "annotation_density_percentage": round(annotation_density, 2),
                "most_used_label": most_used_label,
                "most_used_label_frame_count": max_frame_count
            },
            "label_statistics": label_stats,
            "job_statistics": job_stats
        }
