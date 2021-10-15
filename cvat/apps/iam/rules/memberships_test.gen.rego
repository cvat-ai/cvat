package memberships

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 19}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 99}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 37}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 31}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"user": {"id": 67}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 386}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 309}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 395}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 388}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"user": {"id": 366}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 14}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 73}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 65}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 54}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"user": {"id": 14}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 328}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 397}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 332}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 314}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"user": {"id": 345}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 43}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 24}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 6}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 81}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"user": {"id": 33}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 42}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 378}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 361}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 302}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 393}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"user": {"id": 384}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 61}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 45}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 15}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 63}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"id": 36}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 326}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 324}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 331}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 383}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"id": 307}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 25}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 91}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 42}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 3}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"user": {"id": 98}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 349}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 309}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 325}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 325}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"id": 311}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 2}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 348}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 34}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 364}, "role": "supervisor"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 28}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 362}, "role": "supervisor"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 0}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 366}, "role": "owner"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 58}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 314}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 41}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 30}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 27}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 66}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"user": {"id": 92}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 388}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 348}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 300}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 326}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"id": 396}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 18}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 18}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 82}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 51}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 14}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"user": {"id": 90}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 322}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 384}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 302}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 300}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"user": {"id": 344}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 54}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 5}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 58}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 22}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"user": {"id": 26}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 362}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 315}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 339}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 315}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"user": {"id": 325}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 65}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 2}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 63}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 41}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"id": 60}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 396}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 331}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 320}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 368}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"user": {"id": 318}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 10}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 30}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 51}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 10}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"user": {"id": 34}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 307}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 305}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 348}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 327}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 273}, "user": {"role": null}}}, "resource": {"user": {"id": 343}, "role": "worker"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 63}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 326}, "role": "owner"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 30}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 328}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 27}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 399}, "role": "supervisor"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 16}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 309}, "role": "worker"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 46}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 361}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 20}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 20}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 76}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 4}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 5}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"user": {"id": 17}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 8}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 374}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 359}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 386}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 355}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"user": {"id": 352}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 43}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 23}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 94}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 66}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"id": 31}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 365}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 385}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 397}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 313}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"id": 343}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 15}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 44}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 84}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 61}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"id": 7}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 374}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 333}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 374}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 309}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"user": {"id": 391}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 65}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 2}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 78}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 74}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"user": {"id": 73}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 37}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 381}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 367}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 374}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 353}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"id": 376}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 44}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 44}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 98}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 55}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 75}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"id": 9}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 302}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 350}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 391}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 344}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"user": {"id": 384}, "role": "supervisor"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 88}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 330}, "role": "maintainer"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 45}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 325}, "role": "supervisor"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 83}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 366}, "role": "owner"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 6}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 335}, "role": "maintainer"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 15}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 329}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 47}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 65}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 65}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 73}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"user": {"id": 77}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 388}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 399}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 369}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 304}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"user": {"id": 368}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 49}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 87}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 2}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 85}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"id": 91}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 359}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 396}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 343}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 327}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"id": 340}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 97}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 44}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 88}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 79}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"user": {"id": 26}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 342}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 338}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 301}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 302}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"user": {"id": 380}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 17}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 24}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 3}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 11}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"id": 22}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 392}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 357}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 302}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 346}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"user": {"id": 370}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 97}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 71}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 67}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 66}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"id": 97}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 44}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 372}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 308}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 337}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 383}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"user": {"id": 372}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 18}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 312}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 65}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 350}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 86}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 334}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 28}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 300}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 78}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 341}, "role": "owner"}}
}



# memberships_test.gen.rego.py
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
## import csv
# import json
# import random
# import sys
# import os
## simple_rules = []
# with open(os.path.join(sys.argv[1], 'memberships.csv')) as f:
#     reader = csv.DictReader(f)
#     for row in reader:
#         row = {k.lower():v.lower().replace('n/a','na') for k,v in row.items()}
#         row['limit'] = row['limit'].replace('none', 'None')
#         found = False
#         for col,val in row.items():
#             if col in ["limit", "method", "url"]:
#                 continue
#             complex_val = [v.strip() for v in val.split(',')]
#             if len(complex_val) > 1:
#                 found = True
#                 for item in complex_val:
#                     new_row = row.copy()
#                     new_row[col] = item
#                     simple_rules.append(new_row)
##         if not found:
#             simple_rules.append(row)
## SCOPES = {rule['scope'] for rule in simple_rules}
# CONTEXTS = ['organization', 'sandbox']
# OWNERSHIPS = ['user_self', 'none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
## def eval_rule(scope, context, ownership, privilege, membership, data):
#     if privilege == 'admin':
#         return True
##     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: r['membership'] == 'na' or
#         ORG_ROLES.index(membership) <= ORG_ROLES.index(r['membership']), rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
#     resource = data['resource']
#     rules = list(filter(lambda r: not r['limit'] or r['limit'].startswith('filter')
#         or eval(r['limit'], {'resource': resource }), rules))
##     return bool(rules)
## def get_data(scope, context, ownership, privilege, membership):
#     data = {
#         "scope": scope,
#         "auth": {
#             "user": { "id": random.randrange(0,100), "privilege": privilege },
#             "organization": {
#                 "id": random.randrange(100,200),
#                 "owner": { "id": random.randrange(200, 300) },
#                 "user": { "role": membership }
#             } if context == 'organization' else None
##         },
#         "resource": {
#             "user": { "id": random.randrange(300, 400) },
#             "role": random.choice(ORG_ROLES)
#         }
#     }
##     user_id = data['auth']['user']['id']
#     if ownership == 'user_self':
#         data['resource']['user']['id'] = user_id
#         data['resource']['role'] = membership
#     if membership == 'owner':
#         data['auth']['organization']['owner']['id'] = user_id
##     return data
## def get_name(scope, context, ownership, privilege, membership):
#     return (f'test_scope_{scope.replace(":", "_").upper()}_context_{context.upper()}'
#         f'_ownership_{str(ownership).upper()}_privilege_{privilege.upper()}'
#         f'_membership_{str(membership).upper()}')
## with open('memberships_test.gen.rego', 'wt') as f:
#     f.write('package memberships\n\n')
##     for scope in SCOPES:
#         for context in CONTEXTS:
#             for privilege in GROUPS:
#                 for ownership in OWNERSHIPS:
#                     for membership in ORG_ROLES:
#                         if context == 'sandbox' and membership:
#                             continue
#                         test_name = get_name(scope, context, ownership, privilege, membership)
#                         data = get_data(scope, context, ownership, privilege, membership)
#                         result = eval_rule(scope, context, ownership, privilege, membership, data)
##                         f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                             test_name=test_name, allow='allow' if result else 'not allow',
#                             data=json.dumps(data)))
##     with open(sys.argv[0]) as this_file:
#         f.write(f'\n\n# {os.path.split(sys.argv[0])[1]}\n')
#         for line in this_file:
#             if line.strip():
#                 f.write(f'# {line}')
#             else:
#                 f.write(f'#')
##     with open(os.path.join(sys.argv[1], 'memberships.csv')) as rego_file:
#         f.write(f'\n\n# memberships.csv\n')
#         for line in rego_file:
#             if line.strip():
#                 f.write(f'# {line}')
#             else:
#                 f.write(f'#')

# memberships.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# list,Membership,Sandbox,N/A,filter(organization=None),GET,/memberships,None,N/A
# list,Membership,Organization,N/A,filter(organization),GET,/memberships,None,Worker
# view,Membership,Sandbox,None,,GET,/membership/{id},Admin,N/A
# view,Membership,Sandbox,User_Self,,GET,/membership/{id},None,N/A
# view,Membership,Organization,"None, User_Self",,GET,/membership/{id},None,Worker
# change:role,Membership,Organization,"None, User_Self","resource[""role""] not in [""maintainer"", ""owner""]",PATCH,/membership/{id},User,Maintainer
# change:role,Membership,Organization,"None, User_Self","resource[""role""] != ""owner""",PATCH,/membership/{id},User,Owner
# delete,Membership,Organization,"None, User_Self","resource[""role""] not in [""maintainer"", ""owner""]",DELETE,/membership/{id},User,Maintainer
# delete,Membership,Organization,None,"resource[""role""] != ""owner""",DELETE,/membership/{id},User,Owner
# delete,Membership,Organization,User_Self,"resource[""role""] != ""owner""",DELETE,/membership/{id},Worker,Worker
# delete,Membership,Sandbox,User_Self,"resource[""role""] != ""owner""",DELETE,/membership/{id},Worker,N/A