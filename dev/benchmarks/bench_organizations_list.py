"""Benchmark organizations / memberships / invitations list endpoints.

Measures wall-clock time and DB query count for each endpoint at a couple
of page sizes, using Django's test client + force_login. Median over a few
repetitions.

Pre-requisite: the seeding script populated bench-prefixed rows
(`dev/benchmarks/seed_organizations.py`). Adjust `ORG_ID` to the largest
seeded org if seeding output reports a different id.

Run inside the test container:

    docker cp dev/benchmarks/bench_organizations_list.py \\
        test_cvat_server_1:/tmp/bench_organizations_list.py
    docker exec test_cvat_server_1 bash -c \\
        "cd /home/django && python manage.py shell < /tmp/bench_organizations_list.py"

Output: one line per (endpoint, page_size) with median queries and time_ms.
"""
import time
import statistics
from django.conf import settings
settings.DEBUG = True  # required for connection.queries to be populated
from django.test import Client
from django.contrib.auth import get_user_model
from django.db import connection, reset_queries

c = Client(HTTP_HOST="localhost")
admin = get_user_model().objects.filter(is_superuser=True).first()
c.force_login(admin)

# warmup
c.get("/api/organizations?page_size=10")

ORG_ID = 4  # biggest seeded org (m_0 = 100 in the geometric distribution)

ENDPOINTS = [
    ("organizations", "/api/organizations"),
    ("memberships",   f"/api/memberships?org_id={ORG_ID}"),
    ("invitations",   f"/api/invitations?org_id={ORG_ID}"),
]
PAGE_SIZES = [10, 100]
REPS = 5

for label, base in ENDPOINTS:
    for ps in PAGE_SIZES:
        path = f"{base}{'&' if '?' in base else '?'}page_size={ps}"
        times, qs, last_count = [], [], 0
        for _ in range(REPS):
            reset_queries()
            t0 = time.perf_counter()
            r = c.get(path)
            t1 = time.perf_counter()
            assert r.status_code == 200, (label, r.status_code, r.content[:200])
            times.append((t1 - t0) * 1000)
            qs.append(len(connection.queries))
            last_count = len(r.json().get("results", []))
        print(
            f"{label:14s} ps={ps:3d}  "
            f"queries={statistics.median(qs):.0f}  "
            f"time_ms={statistics.median(times):6.1f}  "
            f"rows={last_count}"
        )
