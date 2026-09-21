# Copyright (C) 2025 CVAT Custom Module
# SPDX-License-Identifier: MIT

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_optimized
from . import views_cvat_integrated
from . import views_task_analysis
from . import views_train_metadata
from . import views_task_extension
from . import views_analytics
from . import views_task_comments
from . import views_frame_data
from . import views_s3_videos
from . import views_train_groups
from . import views_taxonomy
from . import views_user_admin
from . import views_vision

# Create a router for our extended task endpoints
router = DefaultRouter(trailing_slash=False)
router.register('tasks-extended', views_task_extension.ExtendedTaskViewSet, basename='tasks-extended')

# Task Comments router - register with proper viewset
comments_router = DefaultRouter(trailing_slash=False)
comments_router.register(r'comments', views_task_comments.TaskCommentViewSet, basename='task-comments')

urlpatterns = [
    # Frame download endpoints
    path('download-annotated-frames/', views.DownloadAnnotatedFramesView.as_view(),
         name='download-annotated-frames'),
    path('download-task-frames/', views.DownloadTaskFramesView.as_view(),
         name='download-task-frames'),
    path('download-task-frames-optimized/', views_optimized.OptimizedDownloadTaskFramesView.as_view(),
         name='download-task-frames-optimized'),
    path('export-task/', views_cvat_integrated.CVATIntegratedExportView.as_view(),
         name='cvat-integrated-export'),
    path('formats/', views_cvat_integrated.CVATFormatsListView.as_view(),
         name='export-formats'),

    # Task analysis endpoints
    path('task-analysis/', views_task_analysis.TaskAnalysisView.as_view(),
         name='task-analysis'),

    # Train metadata endpoints
    path('train-metadata/', views_train_metadata.TrainMetadataView.as_view(),
         name='train-metadata'),
    path('update-verdict/', views_train_metadata.TrainVerdictUpdateView.as_view(),
         name='update-verdict'),
    path('train-metadata-list/', views_train_metadata.TrainMetadataListView.as_view(),
         name='train-metadata-list'),

    # Task extension endpoints (for UI integration)
    path('tasks/<int:pk>/train-metadata/', views_task_extension.TaskTrainMetadataAPIView.as_view(),
         name='task-train-metadata'),
    path('tasks/<int:pk>/verdict/', views_task_extension.TaskVerdictUpdateAPIView.as_view(),
         name='task-verdict-update'),

    # Orochi Vision findings (chapters) per task
    path('tasks/<int:pk>/chapters/', views_vision.TaskChaptersView.as_view(),
         name='task-chapters'),

    # Analytics and reporting endpoints
    path('tasks-paginated/', views_analytics.TasksPaginatedView.as_view(),
         name='tasks-paginated'),
    path('tasks-summary/', views_analytics.TasksSummaryView.as_view(),
         name='tasks-summary'),
    path('tasks-quick-stats/', views_analytics.TasksQuickStatsView.as_view(),
         name='tasks-quick-stats'),

    # Task Comments endpoints
    path('task-comments/create/', views_task_comments.TaskCommentCreateView.as_view(),
         name='task-comment-create'),
    path('task-comments/stats/', views_task_comments.TaskCommentsStatsView.as_view(),
         name='task-comments-stats'),
    path('tasks/<int:task_id>/comments/', views_task_comments.TaskCommentsListView.as_view({'get': 'list'}),
         name='task-comments-list'),
    path('tasks/<int:task_id>/comments/create/', views_task_comments.TaskCommentCreateView.as_view(),
         name='task-comments-create'),

    # Per-frame data endpoints
    path('jobs/<int:job_id>/frame/<int:frame_number>/', views_frame_data.JobFrameView.as_view(),
         name='job-frame-data'),

    # S3 Videos with presigned URLs
    path('tasks/<int:task_id>/videos/', views_s3_videos.TaskVideosView.as_view(),
         name='task-videos'),
    path('tasks/<int:task_id>/videos/check/', views_s3_videos.TaskVideosQuickView.as_view(),
         name='task-videos-check'),
    path('tasks/<int:task_id>/videos/<path:video_path>/', views_s3_videos.TaskSingleVideoView.as_view(),
         name='task-single-video'),

    # Train group schedule endpoints
    path('train-groups/mappings/', views_train_groups.MappingsListView.as_view(),
         name='train-groups-mappings'),
    path('train-groups/mappings/template.csv', views_train_groups.MappingTemplateCsvView.as_view(),
         name='train-groups-template-csv'),
    path('train-groups/mappings/export.csv', views_train_groups.MappingExportCsvView.as_view(),
         name='train-groups-export-csv'),
    path('train-groups/mappings/upload/', views_train_groups.UploadView.as_view(),
         name='train-groups-upload'),
    path('train-groups/versions/', views_train_groups.VersionsListView.as_view(),
         name='train-groups-versions'),
    path('train-groups/versions/<int:version_no>/', views_train_groups.VersionDetailView.as_view(),
         name='train-groups-version-detail'),
    path('train-groups/versions/<int:version_no>/rollback/',
         views_train_groups.RollbackView.as_view(),
         name='train-groups-rollback'),

    # Train group rotation schedule endpoints (scheduler sub-package)
    path('train-groups/schedule/', include('cvat.apps.custom.scheduler.urls')),

    # Label taxonomy endpoints
    path('taxonomy/labels/', views_taxonomy.TaxonomyLabelListCreateView.as_view(),
         name='taxonomy-labels'),
    path('taxonomy/labels/<int:pk>/', views_taxonomy.TaxonomyLabelDetailView.as_view(),
         name='taxonomy-label-detail'),
    path('taxonomy/labels/<int:pk>/archive/', views_taxonomy.TaxonomyLabelArchiveView.as_view(),
         name='taxonomy-label-archive'),
    path('taxonomy/labels/<int:pk>/restore/', views_taxonomy.TaxonomyLabelRestoreView.as_view(),
         name='taxonomy-label-restore'),
    path('taxonomy/sync/', views_taxonomy.TaxonomySyncView.as_view(),
         name='taxonomy-sync'),

    # User admin console endpoints
    path('user-admin/users/', views_user_admin.UserAdminListCreateView.as_view(),
         name='user-admin-users'),
    path('user-admin/users/<int:pk>/', views_user_admin.UserAdminDetailView.as_view(),
         name='user-admin-user-detail'),
    path('user-admin/users/<int:pk>/deactivate/', views_user_admin.UserAdminDeactivateView.as_view(),
         name='user-admin-deactivate'),
    path('user-admin/users/<int:pk>/reactivate/', views_user_admin.UserAdminReactivateView.as_view(),
         name='user-admin-reactivate'),
    path('user-admin/users/<int:pk>/reset-password/', views_user_admin.UserAdminResetPasswordView.as_view(),
         name='user-admin-reset-password'),
    path('user-admin/audit/', views_user_admin.UserAdminAuditListView.as_view(),
         name='user-admin-audit'),
]

# Add the router URLs
urlpatterns += router.urls
urlpatterns += comments_router.urls

# Debug: Print registered URLs (remove in production)
# print("Custom app URLs registered:")
# for pattern in urlpatterns:
#     print(f"  - {pattern}")
# for pattern in comments_router.urls:
#     print(f"  - Router: {pattern}")
