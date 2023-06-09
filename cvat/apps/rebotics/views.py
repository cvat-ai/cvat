from rest_framework.viewsets import GenericViewSet
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from django.http.response import Http404, HttpResponsePermanentRedirect
from django.shortcuts import render
from django.conf import settings
from django.urls import resolve, Resolver404
from django.views.decorators.common import no_append_slash

from .authentication import RetailerAuthentication
from .serializers import ImportSerializer, ImportResponseSerializer
from cvat.apps.rebotics import task as task_api


@extend_schema(tags=['retailer_import'])
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


@no_append_slash
def index_view(request, url, *args, **kwargs):
    # same as django.contrib.admin.sites.AdminSite.catch_all_view
    # except returns index.html when url is not found.
    if settings.APPEND_SLASH and not url.endswith('/'):
        urlconf = getattr(request, 'urlconf', None)
        try:
            match = resolve('%s/' % request.path_info, urlconf)
        except Resolver404:
            pass
        else:
            if getattr(match.func, 'should_append_slash', True):
                return HttpResponsePermanentRedirect('%s/' % request.path)
    return render(request, 'index.html')
