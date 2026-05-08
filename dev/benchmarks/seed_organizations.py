"""Seed the test DB with users / organizations / memberships / invitations.

Used to populate enough rows so that paginator-friendly preloading strategies
(prefetch_related vs select_related) can be benchmarked against meaningful
data volumes. Idempotent: predictable name prefixes + ignore_conflicts.

Run inside the test container:

    docker cp dev/benchmarks/seed_organizations.py \\
        test_cvat_server_1:/tmp/seed_organizations.py
    docker exec test_cvat_server_1 bash -c \\
        "cd /home/django && python manage.py shell < /tmp/seed_organizations.py"

Volumes: 10 000 users, 1 000 organizations, ~10 000 memberships geometrically
distributed across organizations (m_i = round(100 * 0.99^i), sum ~= 10 000),
one invitation per seeded membership.
"""
import secrets
from django.contrib.auth import get_user_model
from cvat.apps.organizations.models import Organization, Membership, Invitation

User = get_user_model()
N_USERS, N_ORGS = 10_000, 1_000
A, R = 100, 0.99  # m_i = round(A * R^i); sum ~= 10_000

User.objects.bulk_create(
    [User(username=f"benchuser{i:05d}", email=f"benchuser{i:05d}@example.com")
     for i in range(N_USERS)],
    ignore_conflicts=True,
)
users = list(
    User.objects.filter(username__startswith="benchuser")
    .order_by("username")
    .values_list("id", flat=True)[:N_USERS]
)

Organization.objects.bulk_create(
    [Organization(slug=f"benchorg{i:04d}", name=f"Bench Org {i}", owner_id=users[i % N_USERS])
     for i in range(N_ORGS)],
    ignore_conflicts=True,
)
orgs = list(
    Organization.objects.filter(slug__startswith="benchorg")
    .order_by("slug")
    .values_list("id", flat=True)[:N_ORGS]
)

new_mems = []
cursor = 0
for i in range(N_ORGS):
    m_i = round(A * (R ** i))
    if m_i <= 0:
        continue
    for j in range(m_i):
        new_mems.append(Membership(
            user_id=users[(cursor + j) % N_USERS],
            organization_id=orgs[i],
            is_active=True,
            role="worker",
        ))
    cursor += m_i

Membership.objects.bulk_create(new_mems, ignore_conflicts=True, batch_size=1000)

mem_ids = list(
    Membership.objects.filter(organization_id__in=orgs).values_list("id", flat=True)
)

already = set(
    Invitation.objects.filter(membership_id__in=mem_ids).values_list("membership_id", flat=True)
)
Invitation.objects.bulk_create(
    [Invitation(key=secrets.token_urlsafe(48)[:64], membership_id=mid, owner_id=users[0])
     for mid in mem_ids if mid not in already],
    batch_size=1000,
)

print({
    "users": User.objects.filter(username__startswith="benchuser").count(),
    "orgs":  Organization.objects.filter(slug__startswith="benchorg").count(),
    "mems":  Membership.objects.filter(organization_id__in=orgs).count(),
    "invs":  Invitation.objects.filter(membership_id__in=mem_ids).count(),
    "biggest_org_id": orgs[0],
})
