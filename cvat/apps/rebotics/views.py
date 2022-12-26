from rest_framework.viewsets import GenericViewSet
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .admin_auth import RetailerInAdminAuthentication
from .serializers import ImportSerializer, ImportResponseSerializer
from cvat.apps.rebotics import task as task_api

from django.http.response import Http404


class ImportTrainingDataViewSet(GenericViewSet):
    authentication_classes = [RetailerInAdminAuthentication, TokenAuthentication, ]
    permission_classes = [IsAuthenticated, ]

    def create(self, request, *args, **kwargs):
        serializer = ImportSerializer(data=request.data, many=True)
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
