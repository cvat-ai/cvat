import os

from django.apps import apps
from rest_framework import viewsets
from rest_framework.response import Response


# Create your views here.

class Plugins(viewsets.ViewSet):

    def list(self, request):
        result = {
            'GIT_INTEGRATION': False,
            'ANALYTICS': False,
            'MODELS': False,
        }
        if apps.is_installed('cvat.apps.git'):
            result['GIT_INTEGRATION'] = True
        if os.environ.get("CVAT_ANALYTICS", '0') == '1':
            result['ANALYTICS'] = True
        if os.environ.get("CVAT_SERVERLESS", '0') == '1':
            result['MODELS'] = True
        return Response(result)
