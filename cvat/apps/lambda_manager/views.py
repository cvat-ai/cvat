from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Task as TaskModel
import base64
import json
import requests
import django_rq

# FIXME: need to define the host in settings
NUCLIO_GATEWAY = 'http://localhost:8070/api/functions'
NUCLIO_HEADERS = {'x-nuclio-project-name': 'cvat'}
NUCLIO_TIMEOUT = 60

class FunctionViewSet(viewsets.ViewSet):
    lookup_value_regex = '[a-zA-Z0-9_.-]+'
    lookup_field = 'name'

    def list(self, request):
        response = []
        try:
            reply = requests.get(NUCLIO_GATEWAY, headers=NUCLIO_HEADERS,
                timeout=NUCLIO_TIMEOUT)
            reply.raise_for_status()
            output = reply.json()
            for name in output:
                response.append(self._extract_function_info(output[name]))
        except requests.RequestException as err:
            return Response(str(err), status=reply.status_code)

        return Response(data=response)

    @staticmethod
    def _get_function(name):
        reply = requests.get(NUCLIO_GATEWAY + '/' + name,
            headers=NUCLIO_HEADERS, timeout=NUCLIO_TIMEOUT)
        reply.raise_for_status()
        output = reply.json()

        return output


    def retrieve(self, request, name):
        try:
            output = self._get_function(name)
            response = self._extract_function_info(output)
        except requests.RequestException as err:
            return Response(str(err), status=output.status_code)

        return Response(data=response)

    @staticmethod
    def _call(function, task_id, frame, points=None):
        reply = FunctionViewSet._get_function(function)
        port = reply["status"]["httpPort"]

        data = {
            'image': FunctionViewSet._get_image(task_id, frame),
            'points': points
        }

        reply = requests.post('http://localhost:{}'.format(port),
            json=data, timeout=NUCLIO_TIMEOUT)
        reply.raise_for_status()

        # TODO: validate output of a function (detector, tracker, etc...)
        return reply


    def call(self, request, name):
        try:
            tid = request.data['task']
            frame = request.data['frame']
            points = request.data.get('points')

            reply = self._call(function=name, task_id=tid, frame=frame, points=points)
        except requests.RequestException as err:
            return Response(str(err), status=reply.status_code)

        return Response(data=reply.json())

    @staticmethod
    def _get_image(tid, frame):
        db_task = TaskModel.objects.get(pk=tid)
        frame_provider = FrameProvider(db_task.data)
        # FIXME: now we cannot use the original quality because nuclio has body
        # limit size by default 4Mb (from FastHTTP).
        image = frame_provider.get_frame(frame, quality=FrameProvider.Quality.COMPRESSED)

        return base64.b64encode(image[0].getvalue()).decode('utf-8')

    @staticmethod
    def _extract_function_info(data):
        return {
            'name': data['metadata']['name'],
            'kind': data['metadata']['labels'].get('type'),
            'state': data['status']['state'],
            'description': data['spec']['description']
        }

class RequestViewSet(viewsets.ViewSet):
    QUEUE_NAME = 'low'

    @staticmethod
    def _get_job(job):
        return {
            "id": job.id,
            "function": {
                "name": job.args[0],
                "args": job.args[1:]
            },
            "status": job.get_status(),
            "enqueued": job.enqueued_at(),
            "started": job.started_at(),
            "ended": job.ended_at(),
            "exc_info": job.exc_info
        }

    def list(self, request):
        queue = django_rq.get_queue(RequestViewSet.QUEUE_NAME)
        results = []
        for job in queue.jobs:
            results.append(self._get_job(job))

        return Response(data=results)

    @staticmethod
    def _save_annotations(db_task, frame, annotations):
        pass

    @staticmethod
    def _call(function, threshold, task_id):
        try:
            db_task = TaskModel.objects.get(pk=task_id)
            for frame in range(db_task.size):
                reply = FunctionViewSet._call(function, task_id, frame)
                RequestViewSet._save_annotations(db_task, frame, reply.json())
        except requests.RequestException as err:
            return Response(str(err), status=reply.status_code)


    # { 'function': 'name', 'threshold': 'n', 'task': 'id'}
    def create(self, request):
        function = request.data['function']
        threshold = request.data['threshold']
        task_id = request.data['task']

        queue = django_rq.get_queue(RequestViewSet.QUEUE_NAME)
        queue.enqueue(self._call, function, threshold, task_id)


    def retrieve(self, request, pk):
        queue = django_rq.get_queue(RequestViewSet.QUEUE_NAME)
        job = queue.fetch_job(pk)
        if job != None:
            return Response(data=self._get_job(job))
        else:
            return Response(status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        queue = django_rq.get_queue(RequestViewSet.QUEUE_NAME)
        job = queue.fetch_job(pk)
        if job != None:
            job.delete()
            return Response(status.HTTP_204_NO_CONTENT)
        else:
            return Response(status.HTTP_404_NOT_FOUND)

