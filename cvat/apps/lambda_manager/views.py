from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.dataset_manager.task import put_task_data, patch_task_data
from django.core.exceptions import ValidationError
import base64
import json
import requests
import django_rq
import rq
from functools import wraps
from cvat.apps.engine.serializers import LabeledDataSerializer
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

class LambdaGateway:
    NUCLIO_ROOT_URL = '/api/functions'

    def _http(self, method="get", scheme=None, host=None, port=None,
        url=None, data=None):
        NUCLIO_GATEWAY = '{}://{}:{}'.format(
            scheme or settings.NUCLIO['SCHEME'],
            host or settings.NUCLIO['HOST'],
            port or settings.NUCLIO['PORT'])
        NUCLIO_HEADERS = {'x-nuclio-project-name': 'cvat'}
        NUCLIO_TIMEOUT = settings.NUCLIO['DEFAULT_TIMEOUT']

        if url:
            url = "{}{}".format(NUCLIO_GATEWAY, url)
        else:
            url = NUCLIO_GATEWAY

        reply = getattr(requests, method)(url, headers=NUCLIO_HEADERS,
            timeout=NUCLIO_TIMEOUT, json=data)
        reply.raise_for_status()
        response = reply.json()

        return response

    def list(self):
        data = self._http(url=self.NUCLIO_ROOT_URL)
        response = [LambdaFunction(self, item) for item in data.values()]
        return response

    def get(self, name):
        data = self._http(url=self.NUCLIO_ROOT_URL + '/' + name)
        response = LambdaFunction(self, data)
        return response

    def invoke(self, func, payload):
        return self._http(method="post", port=func.port, data=payload)

class LambdaFunction:
    def __init__(self, gateway, data):
        # name of the function (e.g. omz.public.yolo-v3)
        self.name = data['metadata']['name']
        # type of the function (e.g. detector, interactor)
        self.kind = data['metadata']['annotations'].get('type')
        # dictionary of labels for the function (e.g. car, person)
        spec = json.loads(data['metadata']['annotations'].get('spec') or '[]')
        labels = [item['name'] for item in spec]
        if len(labels) != len(set(labels)):
            raise ValidationError(
                "`{}` lambda function has non-unique labels".format(self.name),
                code=status.HTTP_404_NOT_FOUND)
        self.labels = labels
        # state of the function
        self.state = data['status']['state']
        # description of the function
        self.description = data['spec']['description']
        # http port to access the serverless function
        self.port = data["status"]["httpPort"]
        self.gateway = gateway

    def to_dict(self):
        response = {
            'name': self.name,
            'kind': self.kind,
            'labels': self.labels,
            'state': self.state,
            'description': self.description
        }
        return response

    def invoke(self, db_task, frame, points=None):
        payload = {
            'image': self._get_image(db_task, frame),
            'points': points
        }

        return self.gateway.invoke(self, payload)

    def _get_image(self, db_task, frame):
        frame_provider = FrameProvider(db_task.data)
        # FIXME: now we cannot use the original quality because nuclio has body
        # limit size by default 4Mb (from FastHTTP).
        image = frame_provider.get_frame(frame, quality=FrameProvider.Quality.COMPRESSED)
        return base64.b64encode(image[0].getvalue()).decode('utf-8')


class LambdaQueue:
    def _get_queue(self):
        QUEUE_NAME = "low"
        return django_rq.get_queue(QUEUE_NAME)

    def get_jobs(self):
        queue = self._get_queue()
        return [LambdaJob(job) for job in queue.jobs if job.meta.get("lambda")]

    # TODO: protect from running multiple times for the same task
    # Only one job for an annotation task
    def enqueue(self, lambda_func, threshold, task):
        queue = self._get_queue()
        # LambdaJob(None) is a workaround for python-rq. It has multiple issues
        # with invocation of non trivial functions. For example, it cannot run
        # staticmethod, it cannot run a callable class. Thus I provide an object
        # which has __call__ function.
        job = queue.create_job(LambdaJob(None),
            meta = { "lambda": True },
            kwargs = {
                "function": lambda_func,
                "threshold": threshold,
                "task": task
            })

        queue.enqueue_job(job)

        return LambdaJob(job)

    def fetch_job(self, pk):
        queue = self._get_queue()
        job = queue.fetch_job(pk)
        if job == None or not job.meta.get("lambda"):
            raise ValidationError("{} lambda job is not found".format(pk),
                code=status.HTTP_404_NOT_FOUND)

        return LambdaJob(job)


class LambdaJob:
    def __init__(self, job):
        self.job = job

    def to_dict(self):
        lambda_func = self.job.kwargs.get("function")
        return {
            "id": self.job.id,
            "function": {
                "name": lambda_func.name if lambda_func else None,
                "threshold": self.job.kwargs.get("threshold"),
                "task": self.job.kwargs.get("task")
            },
            "status": self.job.get_status(),
            "enqueued": self.job.enqueued_at,
            "started": self.job.started_at,
            "ended": self.job.ended_at,
            "exc_info": self.job.exc_info
        }

    def delete(self):
        self.job.delete()

    @staticmethod
    def __call__(function, threshold, task):
        # TODO: need to remove annotations if clear flag is True
        # TODO: need logging
        db_task = TaskModel.objects.get(pk=task)
        # TODO: check tasks with a frame step
        for frame in range(db_task.data.size):
            annotations = function.invoke(db_task, frame)
            # TODO: optimize
            # TODO: need user mapping between model labels and task labels
            db_labels = db_task.label_set.prefetch_related("attributespec_set").all()
            attributes = {db_label.id:
                {db_attr.name: db_attr.id for db_attr in db_label.attributespec_set.all()}
                for db_label in db_labels}
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


def return_response(success_code=status.HTTP_200_OK):
    def wrap_response(func):
        @wraps(func)
        def func_wrapper(*args, **kwargs):
            data = None
            status_code = success_code
            try:
                data = func(*args, **kwargs)
            except requests.ConnectionError as err:
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
                data = str(err)
            except requests.HTTPError as err:
                status_code = err.response.status_code
                data = str(err)
            except requests.Timeout as err:
                status_code = status.HTTP_504_GATEWAY_TIMEOUT
                data = str(err)
            except requests.RequestException as err:
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                data = str(err)
            except ValidationError as err:
                status_code = err.code
                data = err.message

            return Response(data=data, status=status_code)

        return func_wrapper
    return wrap_response

class FunctionViewSet(viewsets.ViewSet):
    lookup_value_regex = '[a-zA-Z0-9_.-]+'
    lookup_field = 'name'

    @return_response()
    def list(self, request):
        gateway = LambdaGateway()
        return [f.to_dict() for f in gateway.list()]

    @return_response()
    def retrieve(self, request, name):
        gateway = LambdaGateway()
        return gateway.get(name).to_dict()

    @return_response()
    def call(self, request, name):
        try:
            task = request.data['task']
            points = request.data.get('points')
            frame = request.data['frame']
            db_task = TaskModel.objects.get(pk=task)
        except (KeyError, ObjectDoesNotExist) as err:
            raise ValidationError(
                '`{}` lambda function was run '.format(name) +
                'with wrong arguments ({})'.format(str(err)),
                code=status.HTTP_400_BAD_REQUEST)

        gateway = LambdaGateway()
        lambda_func = gateway.get(name)

        return lambda_func.invoke(db_task, frame, points)

class RequestViewSet(viewsets.ViewSet):
    @return_response()
    def list(self, request):
        queue = LambdaQueue()
        return [job.to_dict() for job in queue.get_jobs()]

    @return_response()
    def create(self, request):
        function = request.data['function']
        threshold = request.data.get('threshold')
        task = request.data['task']

        gateway = LambdaGateway()
        queue = LambdaQueue()
        lambda_func = gateway.get(function)
        job = queue.enqueue(lambda_func, threshold, task)

        return job.to_dict()

    @return_response()
    def retrieve(self, request, pk):
        queue = LambdaQueue()
        job = queue.fetch_job(pk)

        return job.to_dict()

    @return_response(status.HTTP_204_NO_CONTENT)
    def delete(self, request, pk):
        queue = LambdaQueue()
        job = queue.fetch_job(pk)
        job.delete()
