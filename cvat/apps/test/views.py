
from rest_framework.response import Response
from rest_framework.views import APIView


class AnnotationCountView(APIView):
    def get(self, request, task_id):
        return Response({
            "task_id": task_id,
            "counts": [],
            "message": "Annotation count endpoint is ready."
        })
