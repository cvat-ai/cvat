# Copyright (C) 2025 CVAT Custom Analytics Module
# SPDX-License-Identifier: MIT

"""
Analytics and Reporting APIs for Train Metadata System
"""

from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from cvat.apps.engine.models import Task, Job, LabeledShape, LabeledImage, TrackedShape
from .models import TaskTrainMetadata, TrainGroupMapping
from .train_group_query import annotate_train_group, filter_by_group


class TaskAnalyticsPagination(PageNumberPagination):
    """Custom pagination for task analytics."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@method_decorator(cache_control(max_age=300), name='dispatch')  # 5-minute cache
class TasksPaginatedView(APIView):
    """
    Unified API for tasks with analytics summary and paginated task details.

    GET /api/custom/tasks-paginated/?page=1&page_size=20&verdict=AC&project_id=1&from_time=2025-01-01T00:00:00Z&search=Task&train_id=TRAIN_001&include_analytics=true

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - verdict: Filter by verdict (AC, NA, RJ)
    - project_id: Filter by project ID
    - search: 🔍 SINGLE SEARCH BAR with PARTIAL MATCHING - searches task name, train_id, owner, project, and notes
    - train_id: Specific train ID search with partial matching (optional, for advanced filtering)
    - from_time/created_after: Tasks created after this datetime (ISO format)
    - to_time/created_before: Tasks created before this datetime (ISO format)
    - updated_after: Tasks updated after this datetime (ISO format)
    - updated_before: Tasks updated before this datetime (ISO format)
    - include_analytics: Include analytics summary in response (default: true)

    Returns:
    - Analytics summary (total counts, percentages by verdict) - if include_analytics=true
    - Paginated task list with:
      - Train metadata (train_id, verdict, notes, confidence_score)
      - Time data (created_date, updated_date)
      - Status (verdict display)
      - Annotation statistics (annotated frames / total frames)
    """

    permission_classes = [IsAuthenticated]
    pagination_class = TaskAnalyticsPagination

    def get(self, request):
        """
        Handle GET request for unified tasks and analytics API.

        Returns:
            Response: JSON response with paginated tasks and optional analytics summary
        """
        try:
            # Get and validate query parameters
            verdict_filter = request.query_params.get('verdict')
            project_id_filter = request.query_params.get('project_id')
            search = request.query_params.get('search', '').strip()
            from_time = request.query_params.get('from_time')
            to_time = request.query_params.get('to_time')
            created_after = request.query_params.get('created_after')
            created_before = request.query_params.get('created_before')
            updated_after = request.query_params.get('updated_after')
            updated_before = request.query_params.get('updated_before')
            include_analytics = request.query_params.get('include_analytics', 'true').lower() == 'true'

            # Validate search parameter length (prevent overly long searches)
            if search and len(search) > 255:
                return Response(
                    {'error': 'Search query too long. Maximum 255 characters allowed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Build base queryset with optimizations
            queryset = Task.objects.select_related(
                'project', 'owner', 'assignee', 'data'
            ).prefetch_related(
                'train_metadata', 'vision_analysis'
            ).order_by('-id')
            queryset = annotate_train_group(queryset)
            queryset = filter_by_group(queryset, request.query_params.get("group"))

            # Apply filters
            if project_id_filter:
                try:
                    project_id_filter = int(project_id_filter)
                    queryset = queryset.filter(project_id=project_id_filter)
                except ValueError:
                    return Response(
                        {'error': 'project_id must be an integer'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Enhanced search functionality with partial matching
            train_id_search = request.query_params.get('train_id')

            if search or train_id_search:
                search_conditions = Q()

                if search:
                    # Partial matching search across all fields (case-insensitive)
                    search_conditions |= (
                        Q(name__icontains=search) |                           # Task name
                        Q(train_metadata__train_id__icontains=search) |       # Train ID
                        Q(owner__username__icontains=search) |                # Owner username
                        Q(project__name__icontains=search) |                  # Project name
                        Q(train_metadata__notes__icontains=search)            # Train notes
                    )

                if train_id_search:
                    # Specific train ID search with partial matching
                    search_conditions |= Q(train_metadata__train_id__icontains=train_id_search)

                queryset = queryset.filter(search_conditions).distinct()

            # Apply datetime filters
            if from_time or created_after:
                try:
                    filter_time = from_time or created_after
                    from_datetime = datetime.fromisoformat(filter_time.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_date__gte=from_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid from_time/created_after format. Use ISO format: 2025-01-01T00:00:00Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if to_time or created_before:
                try:
                    filter_time = to_time or created_before
                    to_datetime = datetime.fromisoformat(filter_time.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_date__lte=to_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid to_time/created_before format. Use ISO format: 2025-12-31T23:59:59Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if updated_after:
                try:
                    updated_datetime = datetime.fromisoformat(updated_after.replace('Z', '+00:00'))
                    queryset = queryset.filter(updated_date__gte=updated_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid updated_after format. Use ISO format: 2025-01-01T00:00:00Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if updated_before:
                try:
                    updated_datetime = datetime.fromisoformat(updated_before.replace('Z', '+00:00'))
                    queryset = queryset.filter(updated_date__lte=updated_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid updated_before format. Use ISO format: 2025-12-31T23:59:59Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Apply verdict filter (need to handle tasks without metadata)
            if verdict_filter:
                verdict_filter = verdict_filter.upper()
                if verdict_filter not in ['AC', 'NA', 'RJ']:
                    return Response(
                        {'error': 'Invalid verdict. Must be AC, NA, or RJ'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Get tasks with the specified verdict
                task_ids_with_verdict = TaskTrainMetadata.objects.filter(
                    verdict=verdict_filter
                ).values_list('task_id', flat=True)

                if verdict_filter == 'NA':
                    # For NA, also include tasks without metadata
                    tasks_without_metadata = queryset.exclude(
                        id__in=TaskTrainMetadata.objects.values_list('task_id', flat=True)
                    )
                    queryset = queryset.filter(
                        Q(id__in=task_ids_with_verdict) | Q(id__in=tasks_without_metadata)
                    )
                else:
                    queryset = queryset.filter(id__in=task_ids_with_verdict)

            # Calculate analytics if requested (before pagination to get accurate totals)
            analytics_data = None
            if include_analytics:
                analytics_data = self._calculate_analytics(queryset, from_time, to_time, project_id_filter)

            # Apply pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)

            if page is not None:
                # Build response data
                tasks_data = []
                for task in page:
                    # Get or create train metadata
                    train_metadata, created = TaskTrainMetadata.get_or_create_for_task(task)
                    vision = getattr(task, "vision_analysis", None)

                    # Calculate annotation statistics
                    annotation_stats = self._get_annotation_stats(task)

                    task_data = {
                        "task_id": task.id,
                        "task_name": task.name,
                        "project_id": task.project.id if task.project else None,
                        "project_name": task.project.name if task.project else None,
                        "owner": task.owner.username if task.owner else None,
                        "assignee": task.assignee.username if task.assignee else None,
                        "status": task.status,
                        "group": getattr(task, "train_group", None),

                        # Orochi Vision summary (None until On-Prem pushes chapters)
                        "vision": vision.summary() if vision else None,

                        # Train metadata
                        "train_metadata": {
                            "train_id": train_metadata.train_id,
                            "verdict": train_metadata.verdict,
                            "verdict_display": train_metadata.verdict_display,
                            "notes": train_metadata.notes,
                            "confidence_score": train_metadata.confidence_score,
                            "created_date": train_metadata.created_date.isoformat(),
                            "updated_date": train_metadata.updated_date.isoformat()
                        },

                        # Time data
                        "time_data": {
                            "task_created": task.created_date.isoformat() if task.created_date else None,
                            "task_updated": task.updated_date.isoformat() if task.updated_date else None,
                            "metadata_created": train_metadata.created_date.isoformat(),
                            "metadata_updated": train_metadata.updated_date.isoformat()
                        },

                        # Annotation statistics
                        "annotation_stats": annotation_stats,

                        # Task data info
                        "task_info": {
                            "total_frames": task.data.size if task.data else 0,
                            "start_frame": task.data.start_frame if task.data else 0,
                            "stop_frame": task.data.stop_frame if task.data else 0,
                            "chunk_size": task.data.chunk_size if task.data else 0,
                            "image_quality": task.data.image_quality if task.data else 0
                        }
                    }

                    tasks_data.append(task_data)

                # Build paginated response with optional analytics
                response_data = tasks_data
                paginated_response = paginator.get_paginated_response(response_data)

                # Add analytics to response if requested
                if include_analytics and analytics_data:
                    paginated_response.data['analytics'] = analytics_data

                return paginated_response

            # Fallback if pagination fails
            fallback_response = {"results": [], "count": 0}
            if include_analytics and analytics_data:
                fallback_response['analytics'] = analytics_data
            return Response(fallback_response)

        except Exception as e:
            # Log the error (in production, use proper logging)
            # logger.error(f"Error in TasksPaginatedView: {str(e)}")
            return Response(
                {
                    'error': 'An internal error occurred while processing your request.',
                    'details': str(e) if request.user.is_staff else None  # Only show details to staff
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _calculate_analytics(self, queryset, from_time, to_time, project_id):
        """
        Calculate analytics summary for the filtered queryset.
        Optimized for performance with bulk operations and minimal database queries.
        """
        # Get total tasks count from the filtered queryset (single query)
        total_tasks = queryset.count()

        if total_tasks == 0:
            return self._empty_analytics_response(from_time, to_time, project_id)

        # Get task IDs efficiently (single query)
        task_ids = list(queryset.values_list('id', flat=True))

        # Bulk create missing metadata (optimized approach)
        existing_metadata_task_ids = set(
            TaskTrainMetadata.objects.filter(task_id__in=task_ids).values_list('task_id', flat=True)
        )

        # Bulk create missing metadata for better performance
        missing_task_ids = set(task_ids) - existing_metadata_task_ids
        if missing_task_ids:
            missing_tasks = queryset.filter(id__in=missing_task_ids)
            metadata_to_create = []
            for task in missing_tasks:
                metadata_to_create.append(TaskTrainMetadata(task=task))

            # Bulk create for better performance
            if metadata_to_create:
                TaskTrainMetadata.objects.bulk_create(metadata_to_create, ignore_conflicts=True)

        # Single optimized query to get all verdict counts
        verdict_counts = TaskTrainMetadata.objects.filter(
            task_id__in=task_ids
        ).aggregate(
            ac_count=Count(Case(When(verdict='AC', then=1), output_field=IntegerField())),
            rj_count=Count(Case(When(verdict='RJ', then=1), output_field=IntegerField())),
            na_count=Count(Case(When(verdict='NA', then=1), output_field=IntegerField()))
        )

        # Extract counts with safe defaults
        ac_count = verdict_counts['ac_count'] or 0
        rj_count = verdict_counts['rj_count'] or 0
        na_count = verdict_counts['na_count'] or 0

        # Build optimized analytics response
        return {
            "summary": {
                "total_tasks": total_tasks,
                "ac_tasks": ac_count,
                "rj_tasks": rj_count,
                "na_tasks": na_count,
                "applicable_tasks": ac_count + rj_count
            },
            "percentages": {
                "ac_percentage": round((ac_count / total_tasks * 100), 2),
                "rj_percentage": round((rj_count / total_tasks * 100), 2),
                "na_percentage": round((na_count / total_tasks * 100), 2),
                "applicable_percentage": round(((ac_count + rj_count) / total_tasks * 100), 2)
            },
            "filters_applied": {
                "from_time": from_time,
                "to_time": to_time,
                "project_id": project_id
            },
            "generated_at": timezone.now().isoformat()
        }

    def _empty_analytics_response(self, from_time, to_time, project_id):
        """Return empty analytics response when no tasks found."""
        return {
            "summary": {
                "total_tasks": 0,
                "ac_tasks": 0,
                "rj_tasks": 0,
                "na_tasks": 0,
                "applicable_tasks": 0
            },
            "percentages": {
                "ac_percentage": 0.0,
                "rj_percentage": 0.0,
                "na_percentage": 0.0,
                "applicable_percentage": 0.0
            },
            "filters_applied": {
                "from_time": from_time,
                "to_time": to_time,
                "project_id": project_id
            },
            "generated_at": timezone.now().isoformat()
        }

    def _get_annotation_stats(self, task):
        """Calculate annotation statistics for a task."""

        # Get all jobs for this task
        jobs = Job.objects.filter(segment__task=task)

        # Get total frames
        total_frames = task.data.size if task.data else 0

        # Get annotated frames (unique frames with any annotation)
        annotated_frames = set()

        for job in jobs:
            # Frames with shapes
            shape_frames = LabeledShape.objects.filter(job=job).values_list('frame', flat=True)
            annotated_frames.update(shape_frames)

            # Frames with tags
            image_frames = LabeledImage.objects.filter(job=job).values_list('frame', flat=True)
            annotated_frames.update(image_frames)

            # Frames with tracks
            tracked_frames = TrackedShape.objects.filter(track__job=job).values_list('frame', flat=True)
            annotated_frames.update(tracked_frames)

        annotated_count = len(annotated_frames)

        # Calculate annotation density
        annotation_density = (annotated_count / total_frames * 100) if total_frames > 0 else 0

        return {
            "total_frames": total_frames,
            "annotated_frames": annotated_count,
            "unannotated_frames": total_frames - annotated_count,
            "annotation_density_percentage": round(annotation_density, 2),
            "annotation_status": self._get_annotation_status(annotation_density)
        }

    def _get_annotation_status(self, density):
        """Get human-readable annotation status based on density."""
        if density == 0:
            return "Not Started"
        elif density < 25:
            return "In Progress (Low)"
        elif density < 75:
            return "In Progress (Medium)"
        elif density < 100:
            return "In Progress (High)"
        else:
            return "Complete"


class TasksQuickStatsView(APIView):
    """
    Quick statistics API for dashboard widgets.

    GET /api/custom/tasks-quick-stats/

    Returns quick stats without heavy computation:
    - Task counts by verdict
    - Recent activity
    - Top projects
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get basic counts
        total_tasks = Task.objects.count()

        # Get verdict counts (create metadata if needed)
        verdict_counts = TaskTrainMetadata.objects.aggregate(
            ac_count=Count(Case(When(verdict='AC', then=1), output_field=IntegerField())),
            rj_count=Count(Case(When(verdict='RJ', then=1), output_field=IntegerField())),
            na_count=Count(Case(When(verdict='NA', then=1), output_field=IntegerField()))
        )

        # Tasks without metadata count as NA
        tasks_with_metadata = TaskTrainMetadata.objects.count()
        tasks_without_metadata = total_tasks - tasks_with_metadata
        na_count = (verdict_counts['na_count'] or 0) + tasks_without_metadata

        # Recent activity (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_tasks = Task.objects.filter(created_date__gte=week_ago).count()
        recent_updates = TaskTrainMetadata.objects.filter(updated_date__gte=week_ago).count()

        # Top projects by task count
        top_projects = Task.objects.filter(project__isnull=False).values(
            'project__id', 'project__name'
        ).annotate(
            task_count=Count('id')
        ).order_by('-task_count')[:5]

        stats = {
            "summary": {
                "total_tasks": total_tasks,
                "ac_tasks": verdict_counts['ac_count'] or 0,
                "rj_tasks": verdict_counts['rj_count'] or 0,
                "na_tasks": na_count,
                "tasks_with_metadata": tasks_with_metadata
            },
            "recent_activity": {
                "new_tasks_last_week": recent_tasks,
                "metadata_updates_last_week": recent_updates
            },
            "top_projects": [
                {
                    "project_id": proj['project__id'],
                    "project_name": proj['project__name'],
                    "task_count": proj['task_count']
                }
                for proj in top_projects
            ],
            "generated_at": timezone.now().isoformat()
        }

        return Response(stats)


class TasksSummaryView(APIView):
    """
    Comprehensive tasks summary API with full filtering support.

    GET /api/custom/tasks-summary/?verdict=AC&project_id=1&from_time=2025-01-01T00:00:00Z&search=Task&train_id=TRAIN_001

    Uses the exact same filtering logic as tasks-paginated but returns ONLY the analytics summary:
    - Total counts and percentages by verdict
    - Applied filters information
    - Generation timestamp

    Query Parameters (same as tasks-paginated):
    - verdict: Filter by verdict (AC, NA, RJ)
    - project_id: Filter by project ID
    - search: 🔍 SINGLE SEARCH BAR with PARTIAL MATCHING - searches task name, train_id, owner, project, and notes
    - train_id: Specific train ID search with partial matching (optional, for advanced filtering)
    - from_time/created_after: Tasks created after this datetime (ISO format)
    - to_time/created_before: Tasks created before this datetime (ISO format)
    - updated_after: Tasks updated after this datetime (ISO format)
    - updated_before: Tasks updated before this datetime (ISO format)

    Returns ONLY:
    {
        "summary": { "total_tasks": 150, "ac_tasks": 45, "rj_tasks": 12, "na_tasks": 93, "applicable_tasks": 57 },
        "percentages": { "ac_percentage": 30.0, "rj_percentage": 8.0, "na_percentage": 62.0, "applicable_percentage": 38.0 },
        "filters_applied": { "verdict": "AC", "project_id": 1, "search": "train", ... },
        "generated_at": "2025-09-18T..."
    }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get comprehensive tasks summary with full filtering support.

        This reuses the exact same filtering logic as TasksPaginatedView
        but returns ONLY the analytics summary without the task list.
        """
        try:
            # Get and validate query parameters (same as tasks-paginated)
            verdict_filter = request.query_params.get('verdict')
            project_id_filter = request.query_params.get('project_id')
            search = request.query_params.get('search', '').strip()
            from_time = request.query_params.get('from_time')
            to_time = request.query_params.get('to_time')
            created_after = request.query_params.get('created_after')
            created_before = request.query_params.get('created_before')
            updated_after = request.query_params.get('updated_after')
            updated_before = request.query_params.get('updated_before')

            # Validate search parameter length (same validation as tasks-paginated)
            if search and len(search) > 255:
                return Response(
                    {'error': 'Search query too long. Maximum 255 characters allowed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Build base queryset with optimizations (same as tasks-paginated)
            queryset = Task.objects.select_related(
                'project', 'owner', 'assignee', 'data'
            ).prefetch_related(
                'train_metadata'
            ).all()
            queryset = annotate_train_group(queryset)
            queryset = filter_by_group(queryset, request.query_params.get("group"))

            # Apply filters (EXACT SAME LOGIC as tasks-paginated)
            if project_id_filter:
                try:
                    project_id_filter = int(project_id_filter)
                    queryset = queryset.filter(project_id=project_id_filter)
                except ValueError:
                    return Response(
                        {'error': 'project_id must be an integer'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Enhanced search functionality with partial matching (same as tasks-paginated)
            train_id_search = request.query_params.get('train_id')

            if search or train_id_search:
                search_conditions = Q()

                if search:
                    # Partial matching search across all fields (case-insensitive)
                    search_conditions |= (
                        Q(name__icontains=search) |                           # Task name
                        Q(train_metadata__train_id__icontains=search) |       # Train ID
                        Q(owner__username__icontains=search) |                # Owner username
                        Q(project__name__icontains=search) |                  # Project name
                        Q(train_metadata__notes__icontains=search)            # Train notes
                    )

                if train_id_search:
                    # Specific train ID search with partial matching
                    search_conditions |= Q(train_metadata__train_id__icontains=train_id_search)

                queryset = queryset.filter(search_conditions).distinct()

            # Apply datetime filters (same as tasks-paginated)
            if from_time or created_after:
                try:
                    filter_time = from_time or created_after
                    from_datetime = datetime.fromisoformat(filter_time.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_date__gte=from_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid from_time/created_after format. Use ISO format: 2025-01-01T00:00:00Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if to_time or created_before:
                try:
                    filter_time = to_time or created_before
                    to_datetime = datetime.fromisoformat(filter_time.replace('Z', '+00:00'))
                    queryset = queryset.filter(created_date__lte=to_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid to_time/created_before format. Use ISO format: 2025-12-31T23:59:59Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if updated_after:
                try:
                    updated_datetime = datetime.fromisoformat(updated_after.replace('Z', '+00:00'))
                    queryset = queryset.filter(updated_date__gte=updated_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid updated_after format. Use ISO format: 2025-01-01T00:00:00Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if updated_before:
                try:
                    updated_datetime = datetime.fromisoformat(updated_before.replace('Z', '+00:00'))
                    queryset = queryset.filter(updated_date__lte=updated_datetime)
                except ValueError:
                    return Response(
                        {'error': 'Invalid updated_before format. Use ISO format: 2025-12-31T23:59:59Z'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Apply verdict filter (same logic as tasks-paginated)
            if verdict_filter:
                verdict_filter = verdict_filter.upper()
                if verdict_filter not in ['AC', 'NA', 'RJ']:
                    return Response(
                        {'error': 'Invalid verdict. Must be AC, NA, or RJ'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Get tasks with the specified verdict
                task_ids_with_verdict = TaskTrainMetadata.objects.filter(
                    verdict=verdict_filter
                ).values_list('task_id', flat=True)

                if verdict_filter == 'NA':
                    # For NA, also include tasks without metadata
                    tasks_without_metadata = queryset.exclude(
                        id__in=TaskTrainMetadata.objects.values_list('task_id', flat=True)
                    )
                    queryset = queryset.filter(
                        Q(id__in=task_ids_with_verdict) | Q(id__in=tasks_without_metadata)
                    )
                else:
                    queryset = queryset.filter(id__in=task_ids_with_verdict)

            # Calculate analytics summary using the same method as tasks-paginated
            analytics_data = self._calculate_analytics_summary(
                queryset,
                from_time or created_after,
                to_time or created_before,
                project_id_filter,
                search,
                train_id_search,
                verdict_filter,
                updated_after,
                updated_before
            )

            # available_groups: distinct groups + task count (independent of current
            # ?group= filter). Counts tasks whose train_id maps to each group.
            tid_to_group = dict(TrainGroupMapping.objects.values_list("train_id", "group"))
            group_count_map: dict[str, int] = {}
            for tid in TaskTrainMetadata.objects.filter(
                train_id__in=tid_to_group.keys()
            ).values_list("train_id", flat=True):
                g = tid_to_group.get(tid)
                if g:
                    group_count_map[g] = group_count_map.get(g, 0) + 1
            analytics_data["available_groups"] = [
                {"name": name, "count": count}
                for name, count in sorted(group_count_map.items())
            ]

            # Return ONLY the analytics summary
            return Response(analytics_data)

        except Exception as e:
            # Log the error (in production, use proper logging)
            # logger.error(f"Error in TasksSummaryView: {str(e)}")
            return Response(
                {
                    'error': 'An internal error occurred while processing your request.',
                    'details': str(e) if request.user.is_staff else None  # Only show details to staff
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _calculate_analytics_summary(self, queryset, from_time, to_time, project_id, search, train_id_search, verdict_filter, updated_after, updated_before):
        """
        Calculate analytics summary for the filtered queryset.
        Uses the same logic as TasksPaginatedView._calculate_analytics but with enhanced filter tracking.
        """
        # Get total tasks count from the filtered queryset (single query)
        total_tasks = queryset.count()

        if total_tasks == 0:
            return self._empty_analytics_summary_response(
                from_time, to_time, project_id, search, train_id_search, verdict_filter, updated_after, updated_before
            )

        # Get task IDs efficiently (single query)
        task_ids = list(queryset.values_list('id', flat=True))

        # Bulk create missing metadata (optimized approach)
        existing_metadata_task_ids = set(
            TaskTrainMetadata.objects.filter(task_id__in=task_ids).values_list('task_id', flat=True)
        )

        # Bulk create missing metadata for better performance
        missing_task_ids = set(task_ids) - existing_metadata_task_ids
        if missing_task_ids:
            missing_tasks = queryset.filter(id__in=missing_task_ids)
            metadata_to_create = []
            for task in missing_tasks:
                metadata_to_create.append(TaskTrainMetadata(task=task))

            # Bulk create for better performance
            if metadata_to_create:
                TaskTrainMetadata.objects.bulk_create(metadata_to_create, ignore_conflicts=True)

        # Single optimized query to get all verdict counts
        verdict_counts = TaskTrainMetadata.objects.filter(
            task_id__in=task_ids
        ).aggregate(
            ac_count=Count(Case(When(verdict='AC', then=1), output_field=IntegerField())),
            rj_count=Count(Case(When(verdict='RJ', then=1), output_field=IntegerField())),
            na_count=Count(Case(When(verdict='NA', then=1), output_field=IntegerField()))
        )

        # Extract counts with safe defaults
        ac_count = verdict_counts['ac_count'] or 0
        rj_count = verdict_counts['rj_count'] or 0
        na_count = verdict_counts['na_count'] or 0

        # Build comprehensive analytics response
        return {
            "summary": {
                "total_tasks": total_tasks,
                "ac_tasks": ac_count,
                "rj_tasks": rj_count,
                "na_tasks": na_count,
                "applicable_tasks": ac_count + rj_count
            },
            "percentages": {
                "ac_percentage": round((ac_count / total_tasks * 100), 2),
                "rj_percentage": round((rj_count / total_tasks * 100), 2),
                "na_percentage": round((na_count / total_tasks * 100), 2),
                "applicable_percentage": round(((ac_count + rj_count) / total_tasks * 100), 2)
            },
            "filters_applied": {
                "verdict": verdict_filter,
                "project_id": project_id,
                "search": search if search else None,
                "train_id": train_id_search if train_id_search else None,
                "from_time": from_time,
                "to_time": to_time,
                "updated_after": updated_after,
                "updated_before": updated_before
            },
            "generated_at": timezone.now().isoformat()
        }

    def _empty_analytics_summary_response(self, from_time, to_time, project_id, search, train_id_search, verdict_filter, updated_after, updated_before):
        """Return empty analytics response when no tasks found."""
        return {
            "summary": {
                "total_tasks": 0,
                "ac_tasks": 0,
                "rj_tasks": 0,
                "na_tasks": 0,
                "applicable_tasks": 0
            },
            "percentages": {
                "ac_percentage": 0.0,
                "rj_percentage": 0.0,
                "na_percentage": 0.0,
                "applicable_percentage": 0.0
            },
            "filters_applied": {
                "verdict": verdict_filter,
                "project_id": project_id,
                "search": search if search else None,
                "train_id": train_id_search if train_id_search else None,
                "from_time": from_time,
                "to_time": to_time,
                "updated_after": updated_after,
                "updated_before": updated_before
            },
            "generated_at": timezone.now().isoformat()
        }
