from cacheops import cache, CacheMiss
from drf_yasg.utils import swagger_auto_schema
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cvat.apps.engine.models import Project
from cvat.apps.training.jobs import save_frame_prediction_to_cache_job, save_prediction_server_status_to_cache_job


class PredictView(viewsets.ViewSet):
    def get_permissions(self):
        permissions = [IsAuthenticated]

        return [perm() for perm in permissions]

    @swagger_auto_schema(method='get', operation_summary='Returns prediction for image')
    @action(detail=False, methods=['GET'], url_path='frame')
    def predict_image(self, request):
        frame = self.request.query_params.get('frame')
        task_id = self.request.query_params.get('task')
        if not task_id:
            return Response(data='query param "task" empty or not provided', status=status.HTTP_400_BAD_REQUEST)
        if not frame:
            return Response(data='query param "frame" empty or not provided', status=status.HTTP_400_BAD_REQUEST)
        cache_key = f'predict_image_{task_id}_{frame}'
        try:
            resp = cache.get(cache_key)
        except CacheMiss:
            save_frame_prediction_to_cache_job.delay(cache_key, task_id=task_id,
                                                     frame=frame)
            resp = {
                'status': 'queued',
            }
            cache.set(cache_key=cache_key, data=resp, timeout=60)

        return Response(resp)

    @swagger_auto_schema(method='get',
                         operation_summary='Returns information of the tasks of the project with the selected id')
    @action(detail=False, methods=['GET'], url_path='status')
    def predict_status(self, request):
        project_id = self.request.query_params.get('project')
        if not project_id:
            return Response(data='query param "project" empty or not provided', status=status.HTTP_400_BAD_REQUEST)
        project = Project.objects.get(pk=project_id)
        if not project.training_project:
            Response({'status': 'done'})

        cache_key = f'predict_status_{project_id}'
        try:
            resp = cache.get(cache_key)
        except CacheMiss:
            save_prediction_server_status_to_cache_job.delay(cache_key, cvat_project_id=project_id)
            resp = {
                'status': 'queued',
            }
            cache.set(cache_key=cache_key, data=resp, timeout=60)

        return Response(resp)
