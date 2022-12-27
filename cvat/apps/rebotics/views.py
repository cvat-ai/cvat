from rest_framework.viewsets import GenericViewSet
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from django.http.response import Http404

from .authentication import RetailerAuthentication
from .serializers import ImportSerializer, ImportResponseSerializer
from cvat.apps.rebotics import task as task_api


@extend_schema(tags=['retailer import'])
@extend_schema_view(
    create=extend_schema(
        summary='Starts dataset importing from retailer instance. Returns task id for tracking import progress.',
        request=ImportSerializer,
        responses={
            '202': ImportResponseSerializer,
        }),
    retrieve=extend_schema(
        summary='Returns import status and progress. Adds images\' description if import is finished.',
        responses={
            '200': ImportResponseSerializer,
        }),
)
class RetailerImportViewset(GenericViewSet):
    authentication_classes = [RetailerAuthentication, ]
    permission_classes = [IsAuthenticated, ]

    def create(self, request, *args, **kwargs):
        serializer = ImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task_id = task_api.create(serializer.data, request.user)
        serializer = ImportResponseSerializer(data={'task_id': task_id})
        serializer.is_valid(raise_exception=True)
        return Response(data=serializer.data, status=status.HTTP_202_ACCEPTED)

    def retrieve(self, request, *args, **kwargs):
        task_id = self.kwargs.get('pk')
        task_data = task_api.check(task_id)
        if task_data is None:
            raise Http404
        serializer = ImportResponseSerializer(data=task_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)
