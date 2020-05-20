from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
import requests
import django_rq

# FIXME: need to define the host in settings
NUCLIO_GATEWAY = 'http://localhost:8070/api/functions'
NUCLIO_HEADERS = {'x-nuclio-project-name': 'cvat'}
NUCLIO_TIMEOUT = 10

class FunctionViewSet(viewsets.ViewSet):
    lookup_value_regex = '[a-zA-Z0-9_.]+'

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


    def retrieve(self, request, pk):
        try:
            reply = requests.get(NUCLIO_GATEWAY + '/' + pk,
                headers=NUCLIO_HEADERS, timeout=NUCLIO_TIMEOUT)
            reply.raise_for_status()
            output = reply.json()
            response = self._extract_function_info(output)
        except requests.RequestException as err:
            return Response(str(err), status=reply.status_code)

        return Response(data=response)

    def call(self, request, pk):
        try:
            tid = request.data['task']
            frame = request.data['frame']
            extra = request.data.get('extra')
            data = {
                'image': _get_image(tid, frame),
                'extra': extra
            }
            reply = requests.post(NUCLIO_GATEWAY + '/' + pk,
                headers=NUCLIO_HEADERS, json=data, timeout=NUCLIO_TIMEOUT)
            reply.raise_for_status()

            # TODO: validate output of a function (detector, tracker, etc...)
            response = reply.json()
        except requests.RequestException as err:
            return Response(str(err), status=reply.status_code)

        return Response(data=response)

    @staticmethod
    def _get_image(jid, frame):
        pass

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



