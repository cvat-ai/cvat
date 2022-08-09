from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .admin_auth import RetailerInAdminAuthentication
from .serializers import DetectionImageSerializer, DetectionImageImportSerializer


class ImportTrainingDataViewSet(viewsets.GenericViewSet):
    authentication_classes = [RetailerInAdminAuthentication, TokenAuthentication]
    permission_classes = [IsAuthenticated, ]
    serializer_class = DetectionImageImportSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        detection_images = self._perform_multiple_create(serializer)

        detection_image_serializer = DetectionImageSerializer(instance=detection_images, many=True)
        return Response(detection_image_serializer.data)

    def _perform_multiple_create(self, serializer):
        detection_images = []
        for validated_item in serializer.validated_data:
            detection_images.append(serializer.child.create(validated_item))
        return detection_images
