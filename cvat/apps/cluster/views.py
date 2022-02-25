from urllib.parse import urlparse
from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from cvat.apps.iam.permissions import NodePermission
from .models import Node
from .serializers import NodeReadSerializer, NodeWriteSerializer

@extend_schema_view(retrieve=extend_schema(
    summary='Method returns details about a node',
    responses={
        '200': NodeReadSerializer,
    }, tags=['nodes'], versions=['2.0']))
@extend_schema_view(list=extend_schema(
    summary='Method returns a paginated list of nodes according to query parameters',
    responses={
        '200': NodeReadSerializer(many=True),
    }, tags=['nodes'], versions=['2.0']))
@extend_schema_view(update=extend_schema(
    summary='Method updates a node by id',
    responses={
        '200': NodeWriteSerializer,
    }, tags=['nodes'], versions=['2.0']))
@extend_schema_view(partial_update=extend_schema(
   summary='Methods does a partial update of chosen fields for a node',
   responses={
       '200': NodeWriteSerializer,
   }, tags=['nodes'], versions=['2.0']))
@extend_schema_view(create=extend_schema(
    summary='Method creates a node',
    responses={
        '201': NodeWriteSerializer,
    }, tags=['nodes'], versions=['2.0']))
@extend_schema_view(destroy=extend_schema(
    summary='Method deletes a node',
    responses={
        '204': OpenApiResponse(description='The node has been deleted'),
    }, tags=['nodes'], versions=['2.0']))
class ClusterViewSet(viewsets.ModelViewSet):
    queryset = Node.objects.all()
    search_fields = ['alias', 'owner']
    filter_fields = search_fields + ['id']
    lookup_fields = {'owner': 'owner__username'}
    ordering_fields = filter_fields
    ordering = '-id'
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    iam_organization_field = 'organization'

    def get_queryset(self):
        queryset = super().get_queryset()
        permission = NodePermission(self.request, self)
        return permission.filter(queryset)

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return NodeReadSerializer
        else:
            return NodeWriteSerializer

    def perform_create(self, serializer):
        extra_kwargs = { 'owner': self.request.user }
        if not serializer.validated_data.get('alias'):
            url = urlparse(serializer.validated_data['url'])
            extra_kwargs.update({ 'alias': url.netloc })
        serializer.save(**extra_kwargs)

