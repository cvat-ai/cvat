import os

from rest_framework import viewsets
from rest_framework.response import Response


# Create your views here.

class AllowedApps(viewsets.ViewSet):

    def list(self, request):
        result = ["tasks"]
        if os.environ.get("CVAT_ANALYTICS", '0') == '1':
            result.append("analytics")
        if os.environ.get("CVAT_SERVERLESS", '0') == '1':
            result.append("serverless")
        result.sort()
        return Response(result)
