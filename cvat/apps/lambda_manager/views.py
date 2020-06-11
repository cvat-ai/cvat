from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.dataset_manager.task import put_task_data, patch_task_data
import base64
import json
import requests
import django_rq
import rq
from cvat.apps.engine.serializers import LabeledDataSerializer

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

            reply = FunctionViewSet._call(function=name, task_id=tid, frame=frame, points=points)
        except requests.RequestException as err:
            # TODO: need to handle requests exception and return correct status
            return Response(str(err), status=status.HTTP_400_BAD_REQUEST)

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

def _callme(function, threshold, task_id):
    try:
        # TODO: need to remove annotations if clear flag is True
        # TODO: need logging
        db_task = TaskModel.objects.get(pk=task_id)
        # TODO: check tasks with a frame step
        for frame in range(db_task.data.size):
            reply = FunctionViewSet._call(function, task_id, frame)
            RequestViewSet._save_annotations(db_task, frame, reply.json())
    except requests.RequestException as err:
        # TODO: handle exceptions (e.g. no task, etc)
        return Response(str(err), status=status.HTTP_400_BAD_REQUEST)


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
            "enqueued": job.enqueued_at,
            "started": job.started_at,
            "ended": job.ended_at,
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
        # TODO: optimize
        # TODO: need user mapping between model labels and task labels
        db_labels = db_task.label_set.prefetch_related("attributespec_set").all()
        #attributes = {db_label.id:
        #    {db_attr.name: db_attr.id for db_attr in db_label.attributespec_set.all()}
        #    for db_label in db_labels}
        labels = {db_label.name:db_label.id for db_label in db_labels}

        # TODO: need to check 'cancel' operation
        job = rq.get_current_job()
        job.meta["progress"] = frame / db_task.data.size
        job.save_meta()


        # TODO: need to make "tags" and "tracks" are optional
        # FIXME: need to provide the correct version here
        results = {"version": 0, "tags": [], "shapes": [], "tracks": []}
        for anno in annotations:
            label_id = labels.get(anno["label"])
            if label_id is not None:
                results["shapes"].append({
                    "frame": frame,
                    "label_id": label_id,
                    "type": anno["type"],
                    "occluded": False,
                    "points": anno["points"],
                    "z_order": 0,
                    "group": None,
                    "attributes": []
                })

        serializer = LabeledDataSerializer(data=results)
        # TODO: handle exceptions
        if serializer.is_valid(raise_exception=True):
            patch_task_data(db_task.id, results, "create")

    # { 'function': 'name', 'threshold': 't', 'task': 'id'}
    def create(self, request):
        function = request.data['function']
        threshold = request.data.get('threshold')
        task_id = request.data['task']

        queue = django_rq.get_queue(RequestViewSet.QUEUE_NAME)
        # TODO: protect from running multiple times for the same task
        # Only one job for an annotation task
        job = queue.enqueue(_callme, function, threshold, task_id)



        return Response(data={"id": job.id})


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

