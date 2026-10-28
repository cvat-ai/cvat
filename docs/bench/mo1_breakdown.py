"""
Server-side split of the MO-1 request, run inside cvat_server:
  docker exec -i cvat_server python3 /opt/cvat/manage.py shell < docs/bench/mo1_breakdown.py
Times (5 x 20 calls, median of each run's median): the SQL aggregation used by the endpoint,
the OPA permission check, and a naive alternative that loads every shape into Python.
"""

import statistics
import time
from collections import Counter

from django.contrib.auth import get_user_model
from django.test import RequestFactory

from cvat.apps.engine.models import JobType, LabeledShape, Task
from cvat.apps.iam.middleware import get_organization
from cvat.apps.iam.permissions import get_iam_context
from cvat.apps.test.permissions import AnnotationStatsPermission
from cvat.apps.test.stats import count_annotations_by_label

TASK_ID = 2
task = Task.objects.get(id=TASK_ID)
request = RequestFactory().get("/")
request.user = get_user_model().objects.get(username="admin")
request.iam_context = get_organization(request)  # what ContextMiddleware sets per request
iam_context = get_iam_context(request, task)


def opa_check():
    perm = AnnotationStatsPermission(**iam_context, obj=task, scope="view:annotations")
    assert perm.check_access().allow


def naive_python_loop():
    shapes = LabeledShape.objects.filter(
        job__segment__task_id=TASK_ID, job__type=JobType.ANNOTATION, parent__isnull=True
    )
    return Counter(shape.label.name for shape in shapes.select_related("label"))


def bench(name, fn, runs=5, calls=20):
    fn()
    run_medians = []
    for _ in range(runs):
        samples = []
        for _ in range(calls):
            t0 = time.perf_counter()
            fn()
            samples.append((time.perf_counter() - t0) * 1000)
        run_medians.append(statistics.median(samples))
    print(
        f"{name:<28} median {statistics.median(run_medians):7.1f} ms   runs {[round(m, 1) for m in run_medians]}"
    )


bench("sql aggregation (endpoint)", lambda: count_annotations_by_label(task))
bench("opa permission check", opa_check)
bench("naive python loop", naive_python_loop, runs=5, calls=3)
