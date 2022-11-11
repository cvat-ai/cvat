from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .admin_auth import RetailerInAdminAuthentication
from .serializers import ImportSerializer, ImportResponseSerializer


class ImportTrainingDataViewSet(viewsets.GenericViewSet):
    authentication_classes = [RetailerInAdminAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, ]
    serializer_class = ImportSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        data = self._import_task(serializer)

        response_serializer = ImportResponseSerializer(instance=data, many=True)
        return Response(response_serializer.data)

    def _import_task(self, serializer):
        # get images from serializer and create into task.
        # 1) convert images from imggal json format to cvat data
        # 2) import as a task.
        # 3) return task.data
        pass
