import base64
import json
from functools import wraps

import django_rq
import requests
import rq
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from rest_framework import status, viewsets
from rest_framework.response import Response

from cvat.apps.authentication import auth
from cvat.apps.dataset_manager.task import delete_task_data, patch_task_data
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Task as TaskModel
from cvat.apps.engine.serializers import LabeledDataSerializer
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated

class LambdaGateway:
    NUCLIO_ROOT_URL = '/api/functions'

    def _http(self, method="get", scheme=None, host=None, port=None,
        url=None, headers=None, data=None):
        NUCLIO_GATEWAY = '{}://{}:{}'.format(
            scheme or settings.NUCLIO['SCHEME'],
            host or settings.NUCLIO['HOST'],
            port or settings.NUCLIO['PORT'])
        extra_headers = {
            'x-nuclio-project-name': 'cvat',
            'x-nuclio-function-namespace': 'nuclio',
        }
        if headers:
            extra_headers.update(headers)
        NUCLIO_TIMEOUT = settings.NUCLIO['DEFAULT_TIMEOUT']

        if url:
            url = "{}{}".format(NUCLIO_GATEWAY, url)
        else:
            url = NUCLIO_GATEWAY

        reply = getattr(requests, method)(url, headers=extra_headers,
            timeout=NUCLIO_TIMEOUT, json=data)
        reply.raise_for_status()
        response = reply.json()

        return response

    def list(self):
        data = self._http(url=self.NUCLIO_ROOT_URL)
        response = [LambdaFunction(self, item) for item in data.values()]
        return response

    def get(self, func_id):
        data = self._http(url=self.NUCLIO_ROOT_URL + '/' + func_id)
        response = LambdaFunction(self, data)
        return response

    def invoke(self, func, payload):
        # NOTE: it is overhead to invoke a function using nuclio
        # dashboard REST API. Better to call host.docker.internal:<port>
        # Look at https://github.com/docker/for-linux/issues/264.
        # host.docker.internal isn't supported by docker on Linux.
        # There are many workarounds but let's try to use the
        # simple solution.
        return self._http(method="post", url='/api/function_invocations',
            data=payload, headers={
                'x-nuclio-function-name': func.id,
                'x-nuclio-path': '/'
            })

class LambdaFunction:
    def __init__(self, gateway, data):
        # ID of the function (e.g. omz.public.yolo-v3)
        self.id = data['metadata']['name']
        # type of the function (e.g. detector, interactor)
        self.kind = data['metadata']['annotations'].get('type')
        # dictionary of labels for the function (e.g. car, person)
        spec = json.loads(data['metadata']['annotations'].get('spec') or '[]')
        labels = [item['name'] for item in spec]
        if len(labels) != len(set(labels)):
            raise ValidationError(
                "`{}` lambda function has non-unique labels".format(self.id),
                code=status.HTTP_404_NOT_FOUND)
        self.labels = labels
        # state of the function
        self.state = data['status']['state']
        # description of the function
        self.description = data['spec']['description']
        # http port to access the serverless function
        self.port = data["status"].get("httpPort")
        # framework which is used for the function (e.g. tensorflow, openvino)
        self.framework = data['metadata']['annotations'].get('framework')
        # display name for the function
        self.name = data['metadata']['annotations'].get('name', self.id)
        self.gateway = gateway

    def to_dict(self):
        response = {
            'id': self.id,
            'kind': self.kind,
            'labels': self.labels,
            'state': self.state,
            'description': self.description,
            'framework': self.framework,
            'name': self.name,
        }

        return response

    def invoke(self, db_task, frame, quality, mapping, points=None):
        payload = {
            'image': self._get_image(db_task, frame, quality),
            'points': points,
        }

        response = self.gateway.invoke(self, payload)
        if mapping:
            for item in response:
                item['label'] = mapping.get(item['label'], item['label'])

        return response

    def _get_image(self, db_task, frame, quality):
        if quality is None or quality == "original":
            quality = FrameProvider.Quality.ORIGINAL
        elif  quality == "compressed":
            quality = FrameProvider.Quality.COMPRESSED
        else:
            raise ValidationError(
                '`{}` lambda function was run '.format(self.id) +
                'with wrong arguments (quality={})'.format(quality),
                code=status.HTTP_400_BAD_REQUEST)

        frame_provider = FrameProvider(db_task.data)
        image = frame_provider.get_frame(frame, quality=quality)
        return base64.b64encode(image[0].getvalue()).decode('utf-8')


class LambdaQueue:
    def _get_queue(self):
        QUEUE_NAME = "low"
        return django_rq.get_queue(QUEUE_NAME)

    def get_jobs(self):
        queue = self._get_queue()
        # Only failed jobs are not included in the list below.
        job_ids = set(queue.get_job_ids() +
            queue.started_job_registry.get_job_ids() +
            queue.finished_job_registry.get_job_ids() +
            queue.scheduled_job_registry.get_job_ids() +
            queue.deferred_job_registry.get_job_ids())
        jobs = queue.job_class.fetch_many(job_ids, queue.connection)

        return [LambdaJob(job) for job in jobs if job.meta.get("lambda")]

    def enqueue(self, lambda_func, threshold, task, quality, mapping, cleanup):
        jobs = self.get_jobs()
        # It is still possible to run several concurrent jobs for the same task.
        # But the race isn't critical. The filtration is just a light-weight
        # protection.
        if list(filter(lambda job: job.get_task() == task and not job.is_finished, jobs)):
            raise ValidationError(
                "Only one running request is allowed for the same task #{}".format(task),
                code=status.HTTP_409_CONFLICT)

        queue = self._get_queue()
        # LambdaJob(None) is a workaround for python-rq. It has multiple issues
        # with invocation of non-trivial functions. For example, it cannot run
        # staticmethod, it cannot run a callable class. Thus I provide an object
        # which has __call__ function.
        job = queue.create_job(LambdaJob(None),
            meta = { "lambda": True },
            kwargs = {
                "function": lambda_func,
                "threshold": threshold,
                "task": task,
                "quality": quality,
                "cleanup": cleanup,
                "mapping": mapping
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
                "id": lambda_func.id if lambda_func else None,
                "threshold": self.job.kwargs.get("threshold"),
                "task": self.job.kwargs.get("task")
            },
            "status": self.job.get_status(),
            "progress": self.job.meta.get('progress', 0),
            "enqueued": self.job.enqueued_at,
            "started": self.job.started_at,
            "ended": self.job.ended_at,
            "exc_info": self.job.exc_info
        }

    def get_task(self):
        return self.job.kwargs.get("task")

    def get_status(self):
        return self.job.get_status()

    @property
    def is_finished(self):
        return self.get_status() == rq.job.JobStatus.FINISHED

    @property
    def is_queued(self):
        return self.get_status() == rq.job.JobStatus.QUEUED

    @property
    def is_failed(self):
        return self.get_status() == rq.job.JobStatus.FAILED

    @property
    def is_started(self):
        return self.get_status() == rq.job.JobStatus.STARTED

    @property
    def is_deferred(self):
        return self.get_status() == rq.job.JobStatus.DEFERRED

    @property
    def is_scheduled(self):
        return self.get_status() == rq.job.JobStatus.SCHEDULED

    def delete(self):
        self.job.delete()

    @staticmethod
    def __call__(function, threshold, task, quality, cleanup, mapping):
        # TODO: need logging
        db_task = TaskModel.objects.get(pk=task)
        if cleanup:
            delete_task_data(db_task.id)
        db_labels = db_task.label_set.prefetch_related("attributespec_set").all()
        labels = {db_label.name:db_label.id for db_label in db_labels}

        class Results:
            def __init__(self, task_id):
                self.task_id = task_id
                self.reset()

            def append_shape(self, shape):
                self.data["shapes"].append(shape)

            def submit(self):
                if not self.is_empty():
                    serializer = LabeledDataSerializer(data=self.data)
                    if serializer.is_valid(raise_exception=True):
                        patch_task_data(self.task_id, serializer.data, "create")
                    self.reset()

            def is_empty(self):
                return not (self.data["tags"] or self.data["shapes"] or self.data["tracks"])

            def reset(self):
                # TODO: need to make "tags" and "tracks" are optional
                # FIXME: need to provide the correct version here
                self.data = {"version": 0, "tags": [], "shapes": [], "tracks": []}

        results = Results(db_task.id)

        for frame in range(db_task.data.size):
            annotations = function.invoke(db_task, frame, quality, mapping)
            job = rq.get_current_job()
            # If the job has been deleted, get_status will return None. Thus it will
            # exist the loop.
            if job.get_status() is None:
                break
            job.meta["progress"] = int((frame + 1) / db_task.data.size * 100)
            job.save_meta()

            for anno in annotations:
                label_id = labels.get(anno["label"])
                if label_id is not None:
                    results.append_shape({
                        "frame": frame,
                        "label_id": label_id,
                        "type": anno["type"],
                        "occluded": False,
                        "points": anno["points"],
                        "z_order": 0,
                        "group": None,
                        "attributes": [],
                        "source": "auto"
                    })

                # Accumulate data during 100 frames before sumbitting results.
                # It is optimization to make fewer calls to our server. Also
                # it isn't possible to keep all results in memory.
                if frame % 100 == 0:
                    results.submit()

            results.submit()


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
    lookup_field = 'func_id'

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in ["POST"]:
            permissions.append(auth.TaskAccessPermission)

        return [perm() for perm in permissions]

    @return_response()
    def list(self, request):
        gateway = LambdaGateway()
        return [f.to_dict() for f in gateway.list()]

    @return_response()
    def retrieve(self, request, func_id):
        gateway = LambdaGateway()
        return gateway.get(func_id).to_dict()

    @return_response()
    def call(self, request, func_id):
        try:
            # Mandatory parameters
            task = request.data['task']
            frame = request.data['frame']

            # Optional parameters
            points = request.data.get('points')
            quality = request.data.get('quality')
            mapping = request.data.get('mapping')

            db_task = TaskModel.objects.get(pk=task)
            # Check that the user has enough permissions to read
            # data from the task.
            self.check_object_permissions(self.request, db_task)
        except (KeyError, ObjectDoesNotExist) as err:
            raise ValidationError(
                '`{}` lambda function was run '.format(func_id) +
                'with wrong arguments ({})'.format(str(err)),
                code=status.HTTP_400_BAD_REQUEST)

        gateway = LambdaGateway()
        lambda_func = gateway.get(func_id)

        return lambda_func.invoke(db_task, frame, quality, mapping, points)

class RequestViewSet(viewsets.ViewSet):
    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in ["POST", "DELETE"]:
            permissions.append(auth.TaskChangePermission)

        return [perm() for perm in permissions]

    @return_response()
    def list(self, request):
        queue = LambdaQueue()
        return [job.to_dict() for job in queue.get_jobs()]

    @return_response()
    def create(self, request):
        try:
            function = request.data['function']
            threshold = request.data.get('threshold')
            task = request.data['task']
            quality = request.data.get("quality")
            cleanup = request.data.get('cleanup', False)
            mapping = request.data.get('mapping')

            db_task = TaskModel.objects.get(pk=task)
            # Check that the user has enough permissions to modify
            # the task.
            self.check_object_permissions(self.request, db_task)
        except (KeyError, ObjectDoesNotExist) as err:
            raise ValidationError(
                '`{}` lambda function was run '.format(function) +
                'with wrong arguments ({})'.format(str(err)),
                code=status.HTTP_400_BAD_REQUEST)

        gateway = LambdaGateway()
        queue = LambdaQueue()
        lambda_func = gateway.get(function)
        job = queue.enqueue(lambda_func, threshold, task, quality,
            mapping, cleanup)

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
