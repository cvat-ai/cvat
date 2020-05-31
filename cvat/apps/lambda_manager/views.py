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
NUCLIO_TIMEOUT = 10

class FunctionViewSet(viewsets.ViewSet):
    lookup_value_regex = '[a-zA-Z0-9_.]+'
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

    def call(self, request, name):
        try:
            tid = request.data['task']
            frame = request.data['frame']
            reply = self._get_function(name)
            port = reply["status"]["httpPort"]

            points = request.data.get('points')
            data = {
                'image': self._get_image(tid, frame),
                'points': points
            }

            reply = requests.post('http://localhost:{}'.format(port),
                json=data, timeout=NUCLIO_TIMEOUT)
            reply.raise_for_status()

            # TODO: validate output of a function (detector, tracker, etc...)
            response = reply.json()
        except requests.RequestException as err:
            return Response(str(err), status=reply.status_code)

        return Response(data=response)

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
    def list(self, request):
        pass

    def create(self, request):
        pass

    def retrieve(self, request, pk):
        pass

    def delete(self, request, pk):
        pass


# # { 'function': 'name', 'task': 'id', 'frames': { 'start': 0, 'stop': 10 } }
# # { 'function': 'name', 'job':  'id', 'frames': { 'start': 0, 'stop': 10 } }
# def create_request(request):
#     try:
#         params = request.data
#         queue = django_rq.get_queue("low")
#         func_name = params['function']
#         tid = params.get('task')
#         jid = params.get('job')
#         frames = params.get('frames')


#     except:
#         pass

# def get_requests():
#     queue = django_rq.get_queue("low")
#     response = []
#     for job in queue.jobs:
#         if job.func_name.starts_with("labmda"):
#             response.append({
#                 "id": job.get_id(),
#                 ""
#             })
