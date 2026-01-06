# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import ast
import hashlib
import importlib
import logging
import os
import platform
import re
import stat
import subprocess
import sys
import traceback
import urllib.parse
from collections import defaultdict, namedtuple
from collections.abc import Callable, Generator, Iterable, Mapping, Sequence
from contextlib import contextmanager, nullcontext, suppress
from itertools import islice
from multiprocessing import cpu_count
from pathlib import Path
from typing import Any, TypeVar

import cv2 as cv
from attr.converters import to_bool
from av import VideoFrame
from datumaro.util.os_util import walk
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.utils.http import urlencode
from django_rq.queues import DjangoRQ
from django_sendfile import sendfile as _sendfile
from PIL import Image
from redis.lock import Lock
from rest_framework.reverse import reverse as _reverse
from rq.job import Job as RQJob

from cvat.apps.engine.types import ExtendedRequest

Import = namedtuple("Import", ["module", "name", "alias"])


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


class CvatChunkTimestampMismatchError(Exception):
    pass


def av_scan_paths(*paths):
    if "yes" == os.environ.get("CLAM_AV"):
        command = ["clamscan", "--no-summary", "-i", "-o"]
        command.extend(paths)
        res = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)  # nosec
        if res.returncode:
            raise ValidationError(res.stdout)


def rotate_image(image, angle):
    height, width = image.shape[:2]
    image_center = (width / 2, height / 2)
    matrix = cv.getRotationMatrix2D(image_center, angle, 1.0)
    abs_cos = abs(matrix[0, 0])
    abs_sin = abs(matrix[0, 1])
    bound_w = int(height * abs_sin + width * abs_cos)
    bound_h = int(height * abs_cos + width * abs_sin)
    matrix[0, 2] += bound_w / 2 - image_center[0]
    matrix[1, 2] += bound_h / 2 - image_center[1]
    matrix = cv.warpAffine(image, matrix, (bound_w, bound_h))
    return matrix


def md5_hash(frame):
    if isinstance(frame, VideoFrame):
        frame = frame.to_image()
    elif isinstance(frame, str):
        frame = Image.open(frame, "r")
    return hashlib.md5(frame.tobytes()).hexdigest()  # nosec


def parse_specific_attributes(specific_attributes):
    assert isinstance(specific_attributes, str), "Specific attributes must be a string"
    parsed_specific_attributes = urllib.parse.parse_qsl(specific_attributes)
    return (
        {key: value for (key, value) in parsed_specific_attributes}
        if parsed_specific_attributes
        else dict()
    )


def parse_exception_message(msg: str) -> str:
    parsed_msg = msg
    try:
        if "ErrorDetail" in msg:
            # msg like: 'rest_framework.exceptions.ValidationError:
            # [ErrorDetail(string="...", code=\'invalid\')]\n'
            parsed_msg = msg.split("string=")[1].split(", code=")[0].strip('"')
        elif msg.startswith("rest_framework.exceptions."):
            parsed_msg = msg.split(":")[1].strip()
    except Exception:  # nosec
        pass
    return parsed_msg


def process_failed_job(rq_job: RQJob) -> str:
    exc_info = str(rq_job.exc_info or "")
    rq_job.delete()

    msg = parse_exception_message(exc_info)
    log = logging.getLogger("cvat.server.engine")
    log.error(msg)
    return msg


def get_rq_lock_by_user(
    queue: DjangoRQ,
    user_id: int,
    *,
    timeout: int | None = 30,
    blocking_timeout: int | None = None,
) -> Lock | nullcontext:
    if settings.ONE_RUNNING_JOB_IN_QUEUE_PER_USER:
        return queue.connection.lock(
            name=f"{queue.name}-lock-{user_id}",
            timeout=timeout,
            blocking_timeout=blocking_timeout,
        )
    return nullcontext()


def get_rq_lock_for_job(
    queue: DjangoRQ, rq_id: str, *, timeout: int = 60, blocking_timeout: int = 50
) -> Lock:
    # lock timeout corresponds to the nginx request timeout (proxy_read_timeout)

    assert timeout is not None
    assert blocking_timeout is not None
    return queue.connection.lock(
        name=f"lock-for-job-{rq_id}".lower(),
        timeout=timeout,
        blocking_timeout=blocking_timeout,
    )


def reverse(
    viewname,
    *,
    args=None,
    kwargs=None,
    query_params: dict[str, str] | None = None,
    request: ExtendedRequest | None = None,
) -> str:
    """
    The same as rest_framework's reverse(), but adds custom query params support.
    The original request can be passed in the 'request' parameter to
    return absolute URLs.
    """

    url = _reverse(viewname, args, kwargs, request)

    if query_params:
        return f"{url}?{urlencode(query_params)}"

    return url


def get_server_url(request: ExtendedRequest) -> str:
    return request.build_absolute_uri("/")


def build_field_filter_params(field: str, value: Any) -> dict[str, str]:
    """
    Builds a collection filter query params for a single field and value.
    """
    return {field: value}


def get_list_view_name(model):
    # Implemented after
    # rest_framework/utils/field_mapping.py.get_detail_view_name()
    """
    Given a model class, return the view name to use for URL relationships
    that refer to instances of the model.
    """
    return "%(model_name)s-list" % {"model_name": model._meta.object_name.lower()}


def import_resource_with_clean_up_after(
    func: Callable[[str, int, int], int] | Callable[[str, int, str, bool], None],
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
        if platform.system() == "Linux":
            # we cannot use just multiprocessing.cpu_count because when it runs
            # inside a docker container, it will just return the number of CPU cores
            # for the physical machine the container runs on

            # cgroups v1
            cfs_quota_us_path = Path("/sys/fs/cgroup/cpu/cpu.cfs_quota_us")
            cfs_period_us_path = Path("/sys/fs/cgroup/cpu/cpu.cfs_period_us")

            # cgroup v2
            cpu_max_path = Path("/sys/fs/cgroup/cpu.max")

            if cfs_quota_us_path.exists() and cfs_period_us_path.exists():
                with open(cfs_quota_us_path) as fp:
                    cfs_quota_us = int(fp.read())
                with open(cfs_period_us_path) as fp:
                    cfs_period_us = int(fp.read())
                if cfs_quota_us == -1:  # No quota
                    cpu_number = cpu_count()
                else:
                    cpu_number = max(cfs_quota_us // cfs_period_us, 1)
            elif cpu_max_path.exists():
                with open(cpu_max_path) as fp:
                    quota_str, period_str = fp.read().strip().split()
                if quota_str == "max":  # No quota
                    cpu_number = cpu_count()
                else:
                    cpu_number = max(int(quota_str) // int(period_str), 1)

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
    request: ExtendedRequest,
    filename,
    attachment=False,
    attachment_filename=None,
    mimetype=None,
    encoding=None,
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


def build_backup_file_name(
    *,
    class_name: str,
    identifier: str | int,
    timestamp: str,
    lightweight: bool,
) -> str:
    # "<project|task>_<name>_backup_<timestamp>.zip"
    return "{}_{}_backup{}_{}.zip".format(
        class_name,
        identifier,
        ("-lightweight" if lightweight else ""),
        timestamp,
    ).lower()


def build_annotations_file_name(
    *,
    class_name: str,
    identifier: str | int,
    timestamp: str,
    format_name: str,
    extension: str,
    is_annotation_file: bool = True,
) -> str:
    # "<project|task|job>_<name|id>_<annotations|dataset>_<timestamp>_<format>.<ext>"
    return "{}_{}_{}_{}_{}.{}".format(
        class_name,
        identifier,
        "annotations" if is_annotation_file else "dataset",
        timestamp,
        format_name,
        extension,
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


def is_dataset_export(request: ExtendedRequest) -> bool:
    return to_bool(request.query_params.get("save_images", False))


_T = TypeVar("_T")


def take_by(iterable: Iterable[_T], chunk_size: int) -> Generator[list[_T], None, None]:
    """
    Returns elements from the input iterable by batches of N items.
    ('abcdefg', 3) -> ['a', 'b', 'c'], ['d', 'e', 'f'], ['g']
    """
    # can be changed to itertools.batched after migration to python3.12

    it = iter(iterable)
    while True:
        batch = list(islice(it, chunk_size))
        if len(batch) == 0:
            break

        yield batch


def get_path_size(path: str) -> int:
    stats = os.lstat(path)
    if stat.S_ISDIR(stats.st_mode):
        total_size = 0
        for root, _, files in os.walk(path):
            for name in files:
                file_path = os.path.join(root, name)
                total_size += os.lstat(file_path).st_size
        return total_size
    return stats.st_size


FORMATTED_LIST_DISPLAY_THRESHOLD = 10
"""
Controls maximum rendered list items. The remainder is appended as ' (and X more)'.
"""


def format_list(
    items: Sequence[str], *, max_items: int | None = None, separator: str = ", "
) -> str:
    if max_items is None:
        max_items = FORMATTED_LIST_DISPLAY_THRESHOLD

    remainder_count = len(items) - max_items
    return "{}{}".format(
        separator.join(items[:max_items]),
        f" (and {remainder_count} more)" if 0 < remainder_count else "",
    )


_K = TypeVar("_K")
_V = TypeVar("_V")


def grouped(items: Iterable[_V], *, key: Callable[[_V], _K]) -> Mapping[_K, Sequence[_V]]:
    """
    Returns a mapping with input iterable elements grouped by key, for example:

    grouped(
        [("apple1", "red"), ("apple2", "green"), ("apple3", "red")],
        key=lambda v: v[1]
    )
    ->
    {
        "red": [("apple1", "red"), ("apple3", "red")],
        "green": [("apple2", "green")]
    }

    Similar to itertools.groupby, but allows reiteration on resulting groups.
    """

    # Can be implemented with itertools.groupby, but it requires extra sorting for input elements
    grouped_items = {}
    for item in items:
        grouped_items.setdefault(key(item), []).append(item)

    return grouped_items


def defaultdict_to_regular(d):
    if isinstance(d, defaultdict):
        d = {k: defaultdict_to_regular(v) for k, v in d.items()}
    return d


@contextmanager
def transaction_with_repeatable_read():
    with transaction.atomic():
        if connection.vendor != "sqlite":
            connection.cursor().execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;")
            connection.cursor().execute("SET TRANSACTION READ ONLY;")
        yield
