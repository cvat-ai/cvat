from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class ClassCountView(APIView):
    def get(self, request, task_id):
        return Response({"detail": "not implemented"}, status=status.HTTP_501_NOT_IMPLEMENTED)
