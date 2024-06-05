# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import ast
import cv2 as cv
from collections import namedtuple
import hashlib
import importlib
import sys
import traceback
from contextlib import suppress, nullcontext
from typing import Any, Dict, Optional, Callable, Union, Iterable
import subprocess
import os
import urllib.parse
import re
import logging
import platform

from datumaro.util.os_util import walk
from rq.job import Job, Dependency
from django_rq.queues import DjangoRQ
from pathlib import Path

from django.http.request import HttpRequest
from django.utils import timezone
from django.utils.http import urlencode
from rest_framework.reverse import reverse as _reverse

from av import VideoFrame
from PIL import Image
from multiprocessing import cpu_count

from django.core.exceptions import ValidationError
from django_sendfile import sendfile as _sendfile
from django.conf import settings
from redis.lock import Lock

Import = namedtuple("Import", ["module", "name", "alias"])

KEY_TO_EXCLUDE_FROM_DEPENDENCY = 'exclude_from_dependency'

def parse_imports(source_code: str):
    root = ast.parse(source_code)

    for node in ast.iter_child_nodes(root):
        if isinstance(node, ast.Import):
            module = []
        elif isinstance(node, ast.ImportFrom):
            module = node.module
        else:
            continue

        for n in node.names:
            yield Import(module, n.name, n.asname)

def import_modules(source_code: str):
    results = {}
    imports = parse_imports(source_code)
    for import_ in imports:
        module = import_.module if import_.module else import_.name
        loaded_module = importlib.import_module(module)

        if not import_.name == module:
            loaded_module = getattr(loaded_module, import_.name)

        if import_.alias:
            results[import_.alias] = loaded_module
        else:
            results[import_.name] = loaded_module

    return results

class InterpreterError(Exception):
    pass

def execute_python_code(source_code, global_vars=None, local_vars=None):
    try:
        # pylint: disable=exec-used
        exec(source_code, global_vars, local_vars)
    except SyntaxError as err:
        error_class = err.__class__.__name__
        details = err.args[0]
        line_number = err.lineno
        raise InterpreterError("{} at line {}: {}".format(error_class, line_number, details))
    except AssertionError as err:
        # AssertionError doesn't contain any args and line number
        error_class = err.__class__.__name__
        raise InterpreterError("{}".format(error_class))
    except Exception as err:
        error_class = err.__class__.__name__
        details = err.args[0]
        _, _, tb = sys.exc_info()
        line_number = traceback.extract_tb(tb)[-1][1]
        raise InterpreterError("{} at line {}: {}".format(error_class, line_number, details))

def av_scan_paths(*paths):
    if 'yes' == os.environ.get('CLAM_AV'):
        command = ['clamscan', '--no-summary', '-i', '-o']
        command.extend(paths)
        res = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE) # nosec
        if res.returncode:
            raise ValidationError(res.stdout)

def rotate_image(image, angle):
    height, width = image.shape[:2]
    image_center = (width/2, height/2)
    matrix = cv.getRotationMatrix2D(image_center, angle, 1.)
    abs_cos = abs(matrix[0,0])
    abs_sin = abs(matrix[0,1])
    bound_w = int(height * abs_sin + width * abs_cos)
    bound_h = int(height * abs_cos + width * abs_sin)
    matrix[0, 2] += bound_w/2 - image_center[0]
    matrix[1, 2] += bound_h/2 - image_center[1]
    matrix = cv.warpAffine(image, matrix, (bound_w, bound_h))
    return matrix

def md5_hash(frame):
    if isinstance(frame, VideoFrame):
        frame = frame.to_image()
    elif isinstance(frame, str):
        frame = Image.open(frame, 'r')
    return hashlib.md5(frame.tobytes()).hexdigest() # nosec

def parse_specific_attributes(specific_attributes):
    assert isinstance(specific_attributes, str), 'Specific attributes must be a string'
    parsed_specific_attributes = urllib.parse.parse_qsl(specific_attributes)
    return {
        key: value for (key, value) in parsed_specific_attributes
    } if parsed_specific_attributes else dict()


def parse_exception_message(msg):
    parsed_msg = msg
    try:
        if 'ErrorDetail' in msg:
            # msg like: 'rest_framework.exceptions.ValidationError:
            # [ErrorDetail(string="...", code=\'invalid\')]\n'
            parsed_msg = msg.split('string=')[1].split(', code=')[0].strip("\"")
        elif msg.startswith('rest_framework.exceptions.'):
            parsed_msg = msg.split(':')[1].strip()
    except Exception: # nosec
        pass
    return parsed_msg

def process_failed_job(rq_job: Job):
    exc_info = str(rq_job.exc_info or '')
    rq_job.delete()

    msg = parse_exception_message(exc_info)
    log = logging.getLogger('cvat.server.engine')
    log.error(msg)
    return msg


def define_dependent_job(
    queue: DjangoRQ,
    user_id: int,
    should_be_dependent: bool = settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER,
    *,
    rq_id: Optional[str] = None,
) -> Optional[Dependency]:
    if not should_be_dependent:
        return None

    queues = [queue.deferred_job_registry, queue, queue.started_job_registry]
    # Since there is no cleanup implementation in DeferredJobRegistry,
    # this registry can contain "outdated" jobs that weren't deleted from it
    # but were added to another registry. Probably such situations can occur
    # if there are active or deferred jobs when restarting the worker container.
    filters = [lambda job: job.is_deferred, lambda _: True, lambda _: True]
    all_user_jobs = []
    for q, f in zip(queues, filters):
        job_ids = q.get_job_ids()
        jobs = q.job_class.fetch_many(job_ids, q.connection)
        jobs = filter(lambda job: job and job.meta.get("user", {}).get("id") == user_id and f(job), jobs)
        all_user_jobs.extend(jobs)

    # prevent possible cyclic dependencies
    if rq_id:
        all_job_dependency_ids = {
            dep_id.decode()
            for job in all_user_jobs
            for dep_id in job.dependency_ids or ()
        }

        if Job.redis_job_namespace_prefix + rq_id in all_job_dependency_ids:
            return None

    user_jobs = [
        job for job in all_user_jobs
        if not job.meta.get(KEY_TO_EXCLUDE_FROM_DEPENDENCY)
    ]

    return Dependency(jobs=[sorted(user_jobs, key=lambda job: job.created_at)[-1]], allow_failure=True) if user_jobs else None


def get_rq_lock_by_user(queue: DjangoRQ, user_id: int) -> Union[Lock, nullcontext]:
    if settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER:
        return queue.connection.lock(f'{queue.name}-lock-{user_id}', timeout=30)
    return nullcontext()

def get_rq_job_meta(request, db_obj):
    # to prevent circular import
    from cvat.apps.webhooks.signals import project_id, organization_id
    from cvat.apps.events.handlers import task_id, job_id, organization_slug

    oid = organization_id(db_obj)
    oslug = organization_slug(db_obj)
    pid = project_id(db_obj)
    tid = task_id(db_obj)
    jid = job_id(db_obj)

    return {
        'user': {
            'id': getattr(request.user, "id", None),
            'username': getattr(request.user, "username", None),
            'email': getattr(request.user, "email", None),
        },
        'request': {
            "uuid": request.uuid,
            "timestamp": timezone.localtime(),
        },
        'org_id': oid,
        'org_slug': oslug,
        'project_id': pid,
        'task_id': tid,
        'job_id': jid,
    }

def reverse(viewname, *, args=None, kwargs=None,
    query_params: Optional[Dict[str, str]] = None,
    request: Optional[HttpRequest] = None,
) -> str:
    """
    The same as rest_framework's reverse(), but adds custom query params support.
    The original request can be passed in the 'request' parameter to
    return absolute URLs.
    """

    url = _reverse(viewname, args, kwargs, request)

    if query_params:
        return f'{url}?{urlencode(query_params)}'

    return url

def get_server_url(request: HttpRequest) -> str:
    return request.build_absolute_uri('/')

def build_field_filter_params(field: str, value: Any) -> Dict[str, str]:
    """
    Builds a collection filter query params for a single field and value.
    """
    return { field: value }

def get_list_view_name(model):
    # Implemented after
    # rest_framework/utils/field_mapping.py.get_detail_view_name()
    """
    Given a model class, return the view name to use for URL relationships
    that refer to instances of the model.
    """
    return '%(model_name)s-list' % {
        'model_name': model._meta.object_name.lower()
    }

def get_import_rq_id(
    resource_type: str,
    resource_id: int,
    subresource_type: str,
    user: str,
) -> str:
    # import:<task|project|job>-<id|uuid>-<annotations|dataset|backup>-by-<user>
    return f"import:{resource_type}-{resource_id}-{subresource_type}-by-{user}"

def import_resource_with_clean_up_after(
    func: Union[Callable[[str, int, int], int], Callable[[str, int, str, bool], None]],
    filename: str,
    *args,
    **kwargs,
) -> Any:
    try:
        result = func(filename, *args, **kwargs)
    finally:
        with suppress(FileNotFoundError):
            os.remove(filename)
    return result

def get_cpu_number() -> int:
    cpu_number = None
    try:
        if platform.system() == 'Linux':
            # we cannot use just multiprocessing.cpu_count because when it runs
            # inside a docker container, it will just return the number of CPU cores
            # for the physical machine the container runs on
            cfs_quota_us_path = Path("/sys/fs/cgroup/cpu/cpu.cfs_quota_us")
            cfs_period_us_path = Path("/sys/fs/cgroup/cpu/cpu.cfs_period_us")

            if cfs_quota_us_path.exists() and cfs_period_us_path.exists():
                with open(cfs_quota_us_path) as fp:
                    cfs_quota_us = int(fp.read())
                with open(cfs_period_us_path) as fp:
                    cfs_period_us = int(fp.read())
                container_cpu_number = cfs_quota_us // cfs_period_us
                # For physical machine, the `cfs_quota_us` could be '-1'
                cpu_number = cpu_count() if container_cpu_number < 1 else container_cpu_number
        cpu_number = cpu_number or cpu_count()
    except NotImplementedError:
        # the number of cpu cannot be determined
        cpu_number = 1
    return cpu_number

def make_attachment_file_name(filename: str) -> str:
    # Borrowed from sendfile() to minimize changes for users.
    # Added whitespace conversion and squashing into a single space
    # Added removal of control characters

    filename = str(filename).replace("\\", "\\\\").replace('"', r"\"")
    filename = re.sub(r"\s+", " ", filename)

    # From https://github.com/encode/uvicorn/blob/cd18c3b14aa810a4a6ebb264b9a297d6f8afb9ac/uvicorn/protocols/http/httptools_impl.py#L51
    filename = re.sub(r"[\x00-\x1F\x7F]", "", filename)

    return filename

def sendfile(
    request, filename,
    attachment=False, attachment_filename=None, mimetype=None, encoding=None
):
    """
    Create a response to send file using backend configured in ``SENDFILE_BACKEND``

    ``filename`` is the absolute path to the file to send.

    If ``attachment`` is ``True`` the ``Content-Disposition`` header will be set accordingly.
    This will typically prompt the user to download the file, rather
    than view it. But even if ``False``, the user may still be prompted, depending
    on the browser capabilities and configuration.

    The ``Content-Disposition`` filename depends on the value of ``attachment_filename``:

        ``None`` (default): Same as ``filename``
        ``False``: No ``Content-Disposition`` filename
        ``String``: Value used as filename

    If neither ``mimetype`` or ``encoding`` are specified, then they will be guessed via the
    filename (using the standard Python mimetypes module)
    """
    # A drop-in replacement for sendfile with extra filename cleaning

    if attachment_filename:
        attachment_filename = make_attachment_file_name(attachment_filename)

    return _sendfile(request, filename, attachment, attachment_filename, mimetype, encoding)

def preload_image(image: tuple[str, str, str])-> tuple[Image.Image, str, str]:
    pil_img = Image.open(image[0])
    pil_img.load()
    return pil_img, image[1], image[2]

def preload_images(images: Iterable[tuple[str, str, str]]) -> list[tuple[Image.Image, str, str]]:
    return list(map(preload_image, images))

def build_backup_file_name(
    *,
    class_name: str,
    identifier: str | int,
    timestamp: str,
    extension: str = "{}",
) -> str:
    # "<project|task>_<name>_backup_<timestamp>.zip"
    return "{}_{}_backup_{}{}".format(
        class_name, identifier, timestamp, extension,
    ).lower()

def build_annotations_file_name(
    *,
    class_name: str,
    identifier: str | int,
    timestamp: str,
    format_name: str,
    is_annotation_file: bool = True,
    extension: str = "{}",
) -> str:
    # "<project|task|job>_<name|id>_<annotations|dataset>_<timestamp>_<format>.zip"
    return "{}_{}_{}_{}_{}{}".format(
        class_name, identifier, 'annotations' if is_annotation_file else 'dataset',
        timestamp, format_name, extension,
    ).lower()


def directory_tree(path, max_depth=None) -> str:
    if not os.path.exists(path):
        raise Exception(f"No such file or directory: {path}")

    tree = ""

    baselevel = path.count(os.sep)
    for root, _, files in walk(path, max_depth=max_depth):
        curlevel = root.count(os.sep)
        indent = "|  " * (curlevel - baselevel) + "|-"
        tree += f"{indent}{os.path.basename(root)}/\n"
        for file in files:
            tree += f"{indent}-{file}\n"
    return tree
