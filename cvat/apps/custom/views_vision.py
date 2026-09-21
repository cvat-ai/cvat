# Copyright (C) 2026 CVAT Custom Vision Module
# SPDX-License-Identifier: MIT

"""Vision chapters per task.

    GET  /api/custom/tasks/{id}/chapters/   the stored document + summary (404 if none)
    POST /api/custom/tasks/{id}/chapters/   store/replace it (body = the document)
    PUT  same as POST

On-Prem calls POST right after it creates the task, with the same session cookie
it uses for train-metadata. The dashboard calls GET.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cvat.apps.engine.models import Task

from .models import TaskVisionAnalysis
from .vision import validate_chapters


class TaskChaptersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        task = get_object_or_404(Task, pk=pk)
        analysis = getattr(task, "vision_analysis", None)
        if analysis is None:
            return Response({"error": "No Vision analysis for this task"},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({"task_id": task.id, "summary": analysis.summary(),
                         "chapters": analysis.chapters})

    def post(self, request, pk):
        task = get_object_or_404(Task, pk=pk)
        doc = request.data
        errors = validate_chapters(doc)
        if errors:
            return Response({"error": "invalid chapters document", "details": errors},
                            status=status.HTTP_400_BAD_REQUEST)
        analysis, created = TaskVisionAnalysis.upsert_from_chapters(task, dict(doc))
        return Response({"task_id": task.id, "created": created, "summary": analysis.summary()},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    put = post
