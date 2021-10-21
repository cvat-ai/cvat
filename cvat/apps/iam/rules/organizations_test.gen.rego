package organizations

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 30}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 43}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 17}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 81}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 2}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 34}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 8}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 71}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 385}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 350}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 323}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 315}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 340}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 373}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 382}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 310}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 370}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 377}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 327}}}
}

test_scope_CREATE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 328}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 387}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 311}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 308}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 345}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 372}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 361}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 388}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 371}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 376}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 371}}}
}

test_scope_CREATE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 397}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 355}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 383}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 365}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 354}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 306}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 399}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 304}}}
}

test_scope_CREATE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 318}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 302}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 317}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 392}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 303}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 324}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 368}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 396}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 371}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 377}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 317}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 27}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 244}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 77}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 89}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 65}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 72}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 83}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 34}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 99}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 41}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 30}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 74}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 213}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 98}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 265}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 53}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 34}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 17}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 43}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 66}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 55}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 264}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 80}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 283}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 73}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 10}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 80}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 31}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 66}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 52}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 73}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 10}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 97}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 17}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 264}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 43}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 90}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 91}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 28}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 71}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 95}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 77}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 35}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 49}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 75}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 283}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 279}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 36}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 280}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 34}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 93}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 25}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 50}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 32}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 48}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 79}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 33}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 39}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 63}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 303}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 222}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 360}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 282}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 379}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 365}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 332}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 347}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 357}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 326}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 354}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 390}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 351}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 376}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 310}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 382}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 384}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 380}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 330}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 203}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 357}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 329}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 351}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 380}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 319}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 370}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 279}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 324}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 350}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 279}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 320}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 397}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 391}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 385}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 380}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 379}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 313}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 361}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 347}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 374}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 331}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 365}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 360}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 232}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 396}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 241}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 381}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 334}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 394}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 371}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 340}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 336}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 334}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 380}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 318}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 308}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 293}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 388}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 369}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 397}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 332}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 358}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 320}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 315}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 315}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 300}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 336}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 205}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 305}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 369}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 357}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 392}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 372}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 398}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 387}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 341}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 316}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 353}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 307}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 268}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 391}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 323}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 339}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 308}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 348}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 399}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 357}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 308}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 379}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 322}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 339}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 385}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 281}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 306}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 379}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 370}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 326}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 307}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 354}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 312}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 322}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 291}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 367}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 286}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 332}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 356}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 363}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 389}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 345}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 320}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 393}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 304}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 385}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 244}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 332}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 330}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 272}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 306}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 352}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 327}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 356}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 374}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 304}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 268}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 358}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 303}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 224}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 373}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 283}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 330}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 388}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 344}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 374}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 353}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 387}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 312}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 340}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 355}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 374}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 331}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 332}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 394}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 393}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 344}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 308}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 331}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 323}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 352}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 301}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 230}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 308}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 371}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 372}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 377}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 373}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 317}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 316}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 360}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 307}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 334}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 380}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 286}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 338}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 356}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 366}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 318}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 366}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 348}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 307}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 355}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 307}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 328}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 391}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 281}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 341}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 232}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 326}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 307}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 328}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 328}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 305}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 314}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 355}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 397}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 340}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 210}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 282}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 311}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 381}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 383}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 356}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 274}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 333}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 304}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 318}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 332}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 363}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 387}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 394}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 397}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 323}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 323}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 314}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 255}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 330}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 281}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 399}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 323}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 320}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 361}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 346}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 344}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 391}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 301}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 381}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 367}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 331}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 303}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 210}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 367}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 370}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 335}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 364}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 360}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 395}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 368}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 382}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 320}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 328}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 317}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 310}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 343}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 213}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 393}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 311}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 384}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 375}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 373}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 374}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 365}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 328}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 309}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 392}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 123, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 333}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 362}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 360}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 338}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 325}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 319}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 349}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 315}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 329}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 390}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 388}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 329}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 345}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 333}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 322}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 365}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 358}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 342}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 330}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 9}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 37}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 71}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 84}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 26}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 5}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 26}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 84}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 83}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 78}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 11}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 82}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 374}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 388}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 330}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 317}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 381}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 311}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 353}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 322}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 353}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 386}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 316}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 379}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 305}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 316}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 307}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 332}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 341}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 305}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 313}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 365}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 364}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 319}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 339}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 340}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 396}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 385}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 331}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 331}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 304}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 389}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 316}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 367}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 342}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 390}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 394}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 383}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 304}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 379}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 336}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 346}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 320}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 383}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 333}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 359}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 326}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 367}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 327}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 72}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 284}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 297}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 23}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 92}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 59}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 78}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 68}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 96}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 53}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 253}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 98}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 42}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 44}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 36}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 54}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 93}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 35}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 18}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 18}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 55}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 63}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 75}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 36}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 291}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 94}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 54}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 69}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 48}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 55}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 15}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 36}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 45}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 29}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 60}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 238}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 74}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 74}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 33}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 233}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 55}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 80}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 27}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 97}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 33}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 98}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 82}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 275}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 39}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 232}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 93}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 249}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 224}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 74}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 87}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 29}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 80}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 71}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 72}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 232}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 232}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 306}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 356}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 329}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 331}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 332}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 310}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 361}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 368}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 388}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 319}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 374}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 231}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 327}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 238}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 316}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 399}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 350}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 370}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 333}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 389}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 361}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 367}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 344}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 348}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 339}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 366}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 313}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 373}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 322}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 311}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 339}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 369}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 368}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 296}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 330}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 272}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 374}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 327}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 323}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 369}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 385}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 379}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 333}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 320}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 344}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 326}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 373}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 326}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 231}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 358}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 313}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 365}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 391}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 340}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 397}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 370}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 337}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 333}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 366}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 323}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 247}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 341}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 342}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 364}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 343}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 331}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 384}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 380}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 388}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 316}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 372}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 205}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 389}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 365}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 327}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 386}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 317}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 323}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 392}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 399}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 398}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 301}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 201}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 312}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 386}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 358}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 308}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 379}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 386}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 367}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 319}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 356}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 353}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 307}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 217}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 397}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 389}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 339}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 345}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 304}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 306}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 313}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 397}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 370}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 372}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 320}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 240}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 383}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 372}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 374}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 323}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 373}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 331}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 306}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 369}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 349}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 380}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 323}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 307}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 229}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 336}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 326}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 373}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 351}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 376}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 312}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 388}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 372}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 245}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 333}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 341}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 351}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 371}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 348}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 316}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 356}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 393}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 394}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 320}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 314}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 328}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 355}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 395}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 398}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 282}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 370}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 301}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 391}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 317}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 373}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 383}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 398}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 305}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 380}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 332}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 392}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 368}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 233}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 366}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 222}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 386}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 341}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 387}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 343}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 363}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 339}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 313}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 311}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 366}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 376}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 391}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 394}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 344}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 337}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 305}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 264}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 365}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 275}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 394}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 202}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 372}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 344}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 318}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 367}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 379}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 351}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 389}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 357}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 389}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 396}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 366}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 222}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 309}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 357}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 240}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 337}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 375}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 350}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 354}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 346}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 387}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 352}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 305}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 337}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 351}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 397}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 353}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 250}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 303}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 339}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 311}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 321}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 330}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 350}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 312}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 329}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 359}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 369}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 330}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 330}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 342}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 332}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 311}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 371}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 394}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 360}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 337}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 320}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 396}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 382}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 388}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 315}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 313}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 229}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 398}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 203}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 378}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 398}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 359}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 338}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 343}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 354}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 310}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 354}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 306}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 390}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 302}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 335}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 395}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 294}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 51}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 1}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 87}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 88}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 55}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 42}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 15}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 324}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 329}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 385}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 332}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 397}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 339}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 396}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 394}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 301}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 309}}}
}

test_scope_VIEW_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 331}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 332}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 365}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 324}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 395}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 364}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 309}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 360}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 388}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 364}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 337}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 308}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 356}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 312}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 363}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 343}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 392}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 363}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 385}}}
}

test_scope_VIEW_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 365}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 388}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 353}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 322}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 321}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 319}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 367}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 308}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 358}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 317}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 288}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 81}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 202}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 84}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 49}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 18}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 94}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 32}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 45}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 42}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 89}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 29}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 15}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 61}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 81}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 35}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 45}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 78}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 82}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 52}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 61}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 52}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 92}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 92}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 221}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 53}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 97}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 44}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 52}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 90}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 15}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 79}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 62}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 251}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 78}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 96}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 97}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 30}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 30}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 84}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 59}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 94}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 97}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 32}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 31}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 25}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 32}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 80}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 68}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 36}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 91}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 31}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 10}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 286}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 247}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 345}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 327}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 386}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 351}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 368}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 373}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 355}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 358}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 371}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 370}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 304}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 376}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 376}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 384}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 398}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 384}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 312}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 329}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 317}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 385}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 307}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 351}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 202}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 258}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 281}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 398}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 334}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 392}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 340}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 305}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 340}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 362}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 398}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 246}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 379}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 355}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 288}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 356}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 376}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 394}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 337}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 301}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 345}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 369}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 363}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 347}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 270}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 366}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 366}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 372}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 289}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 356}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 384}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 350}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 392}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 313}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 328}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 312}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 345}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 338}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 167, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 361}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 367}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 373}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 335}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 339}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 391}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 302}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 332}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 167, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 374}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 335}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 390}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 369}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 202}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 385}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 343}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 333}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 398}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 365}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 373}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 327}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 328}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 381}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 342}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 393}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 362}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 312}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 378}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 353}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 372}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 318}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 343}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 300}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 317}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 315}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 386}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 390}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 326}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 212}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 363}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 123, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 395}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 310}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 350}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 337}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 307}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 388}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 345}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 397}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 392}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 351}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 371}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 238}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 302}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 284}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 387}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 210}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 367}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 387}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 327}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 396}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 351}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 337}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 393}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 288}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 224}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 365}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 360}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 378}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 361}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 353}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 301}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 361}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 379}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 210}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 312}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 332}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 380}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 379}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 310}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 316}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 329}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 310}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 250}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 320}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 301}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 369}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 302}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 379}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 332}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 324}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 334}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 361}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 308}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 272}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 321}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 361}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 365}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 336}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 347}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 369}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 318}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 329}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 327}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 379}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 399}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 320}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 392}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 231}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 309}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 206}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 364}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 399}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 386}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 367}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 352}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 311}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 327}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 397}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 308}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 376}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 273}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 352}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 389}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 282}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 327}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 291}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 310}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 374}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 396}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 381}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 338}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 376}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 313}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 346}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 377}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 332}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 334}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 337}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 339}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 211}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 329}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 253}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 354}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 343}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 347}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 331}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 382}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 352}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 313}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 389}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 337}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 346}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 393}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 302}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 245}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 360}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 220}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 397}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 346}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 383}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 382}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 362}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 379}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 353}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 304}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 395}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 368}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 394}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 219}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 310}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 277}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 380}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 351}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 319}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 309}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 381}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 375}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 318}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 325}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 303}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 320}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 357}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 372}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 370}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 385}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 296}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 375}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 272}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 336}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 321}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 356}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 314}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 319}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 365}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 358}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 390}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 329}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 380}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 394}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 340}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 382}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 381}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 47}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 28}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 82}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 17}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 11}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 69}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 17}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 94}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 12}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 327}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 366}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 316}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 348}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 385}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 372}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 399}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 365}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 389}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 390}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 330}}}
}

test_scope_DELETE_context_SANDBOX_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 331}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 379}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 354}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 301}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 366}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 334}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 315}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 313}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 323}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 395}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 338}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 323}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 348}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 399}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 389}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 363}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 364}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 317}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 338}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 356}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 381}}}
}

test_scope_DELETE_context_SANDBOX_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 396}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 332}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 337}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 357}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 347}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 301}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 322}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 337}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 380}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 309}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 373}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": null}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 315}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 229}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 255}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 18}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 11}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 51}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 46}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 77}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 11}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 275}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 235}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 279}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 50}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 221}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 15}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 61}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 47}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 90}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 245}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 96}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 63}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 213}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 47}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 81}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 94}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 17}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 60}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 69}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 43}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 64}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 65}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 68}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 19}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 10}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 206}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 39}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 262}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 52}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 92}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 12}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 66}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 18}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 45}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 14}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 72}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 15}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 211}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 26}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 87}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 234}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 69}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 22}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 95}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 42}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 35}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 38}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 41}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 66}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 78}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 16}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 379}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 265}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 361}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 310}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 380}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 390}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 389}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 391}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 383}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 373}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 352}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 390}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 383}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 371}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 263}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 321}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 274}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 303}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 230}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 353}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 392}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 353}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 307}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 358}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 312}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 341}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 316}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 396}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 379}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 375}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 332}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 365}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 384}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 368}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 396}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 341}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 378}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 393}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 386}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 338}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 363}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 270}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 312}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 256}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 377}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 216}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 369}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 332}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 343}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 349}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 328}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 366}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 334}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 308}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 346}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 375}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 344}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 310}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 304}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 224}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 362}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 254}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 395}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 314}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 356}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 340}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 355}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 312}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 304}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_MAINTAINER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 326}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 223}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 360}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 272}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 389}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 328}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 320}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 331}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 374}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 327}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 352}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 381}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 327}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 347}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 307}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 237}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 347}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 269}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 302}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 320}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 333}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 319}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 394}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 313}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 387}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 235}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 324}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 228}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 203}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 358}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 357}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 398}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 333}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 310}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 386}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 373}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 385}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 245}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 391}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 344}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_USER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 341}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 281}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 371}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 222}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 351}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 357}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 377}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 386}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 338}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 376}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 321}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 360}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 301}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 337}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 333}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 317}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 225}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 304}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 229}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 331}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 217}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 360}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 390}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 361}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 354}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 399}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 370}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 365}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 337}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 272}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 357}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SUPERVISOR_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 399}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 312}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 290}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 246}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 383}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 319}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 370}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 301}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 392}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 302}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 381}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 371}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 326}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 200}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 385}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 329}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 360}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 381}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 320}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 374}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 337}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 395}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 369}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 374}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 370}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 393}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 206}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 314}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 211}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 311}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 336}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 394}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 338}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 375}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 306}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 318}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 307}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 393}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_USER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 324}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 208}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 345}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 297}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 243}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 356}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 334}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 315}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 320}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 365}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 324}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 395}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 392}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 379}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 349}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 371}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 387}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 252}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 332}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 369}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 365}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 388}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 300}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 351}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 365}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_WORKER_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 390}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 325}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 382}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 377}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 367}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 304}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 374}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 316}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 345}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 304}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 345}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_0_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 379}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_1_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 359}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_user_num_resources_10_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 350}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 372}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 249}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 326}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 282}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 353}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 314}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 366}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 309}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 321}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 310}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 344}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 355}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 382}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 343}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 328}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 375}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 296}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 387}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 266}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 348}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 276}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 340}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 374}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 355}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 354}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 322}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 329}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 307}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 305}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 339}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 376}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 387}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 387}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 396}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 244}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 306}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 273}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 301}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 355}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 385}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 335}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 359}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 343}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 399}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 391}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 346}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 382}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 368}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 265}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 304}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 265}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 377}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 231}, "user": {"role": "owner"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 309}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 388}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 353}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 337}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 377}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 342}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 376}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 330}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 324}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_0_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 388}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_1_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 348}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_user_num_resources_10_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 378}}}
}



# organizations_test.gen.rego.py
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
#
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
#
# import csv
# import json
# import random
# import sys
# import os
# from itertools import product
#
# NAME = 'organizations'
#
# def read_rules(name):
#     rules = []
#     with open(os.path.join(sys.argv[1], f'{name}.csv')) as f:
#         reader = csv.DictReader(f)
#         for row in reader:
#             row = {k.lower():v.lower().replace('n/a','na') for k,v in row.items()}
#             row['limit'] = row['limit'].replace('none', 'None')
#             found = False
#             for col,val in row.items():
#                 if col in ["limit", "method", "url"]:
#                     continue
#                 complex_val = [v.strip() for v in val.split(',')]
#                 if len(complex_val) > 1:
#                     found = True
#                     for item in complex_val:
#                         new_row = row.copy()
#                         new_row[col] = item
#                         rules.append(new_row)
#             if not found:
#                 rules.append(row)
#
#     return rules
#
# simple_rules = read_rules(NAME)
#
# SCOPES = {rule['scope'] for rule in simple_rules}
# CONTEXTS = ['sandbox', 'organization']
# OWNERSHIPS = ['owner', 'maintainer', 'supervisor', 'worker', 'none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
# def RESOURCES(ownership):
#     return [{
#         'user': {
#             'num_resources': n,
#             'role': ownership if ownership != 'none' else None
#         }
#     } for n in (0, 1, 10)] + [None]
#
#
# def eval_rule(scope, context, ownership, privilege, membership, data):
#     if privilege == 'admin':
#         return True
#     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: r['membership'] == 'na' or membership == r['membership'], rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
#     resource = data['resource']
#     rules = list(filter(lambda r: not r['limit'] or r['limit'].startswith('filter')
#         or eval(r['limit'], {'resource': resource}), rules))
#
#     return bool(rules)
#
# def get_data(scope, context, ownership, privilege, membership, resource):
#     data = {
#         "scope": scope,
#         "auth": {
#             "user": { "id": random.randrange(0,100), "privilege": privilege },
#             "organization": {
#                 "id": random.randrange(100,200),
#                 "owner": { "id": random.randrange(200, 300) },
#                 "user": { "role": membership }
#             } if context == 'organization' else None
#         },
#         "resource": {**resource,
#             "owner": { "id": random.randrange(300, 400) }
#         } if resource else None
#     }
#
#     user_id = data['auth']['user']['id']
#     if ownership == 'owner':
#         data['resource']['owner']['id'] = user_id
#
#     return data
#
# def _get_name(prefix, **kwargs):
#     name = prefix
#     for k,v in kwargs.items():
#         name += '_' + str(k)
#         if isinstance(v, dict):
#             name += _get_name('', **v)
#         else:
#             name += f'_{str(v).upper()}'
#
#     return name
#
# def get_name(scope, context, ownership, privilege, membership, resource):
#     return _get_name('test', **locals())
#
# def is_valid(scope, context, ownership, privilege, membership, resource):
#     if context == "sandbox" and membership:
#         return False
#     if scope == 'list' and resource != None:
#         return False
#     if resource == None and scope != 'list':
#         return False
#     if scope == 'list' and ownership != 'None':
#         return False
#
#     return True
#
# def gen_test_rego(name):
#     with open(f'{name}_test.gen.rego', 'wt') as f:
#         f.write(f'package {name}\n\n')
#         for scope, context, ownership, privilege, membership in product(
#             SCOPES, CONTEXTS, OWNERSHIPS, GROUPS, ORG_ROLES):
#             for resource in RESOURCES(ownership):
#                 if not is_valid(scope, context, ownership, privilege, membership, resource):
#                     continue
#
#                 test_name = get_name(scope, context, ownership, privilege, membership, resource)
#                 data = get_data(scope, context, ownership, privilege, membership, resource)
#                 result = eval_rule(scope, context, ownership, privilege, membership, data)
#                 f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                     test_name=test_name, allow='allow' if result else 'not allow',
#                     data=json.dumps(data)))
#
#         # Write the script which is used to generate the file
#         with open(sys.argv[0]) as this_file:
#             f.write(f'\n\n# {os.path.split(sys.argv[0])[1]}\n')
#             for line in this_file:
#                 if line.strip():
#                     f.write(f'# {line}')
#                 else:
#                     f.write(f'#\n')
#
#         # Write rules which are used to generate the file
#         with open(os.path.join(sys.argv[1], f'{name}.csv')) as rego_file:
#             f.write(f'\n\n# {name}.csv\n')
#             for line in rego_file:
#                 if line.strip():
#                     f.write(f'# {line}')
#                 else:
#                     f.write(f'#\n')
#
# gen_test_rego(NAME)

# organizations.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# create,Organization,N/A,N/A,"resource[""user""][""num_resources""] < 1",POST,/organizations,User,N/A
# create,Organization,N/A,N/A,,POST,/organizations,Business,N/A
# list,N/A,N/A,N/A,,GET,/organizations,None,N/A
# view,Organization,N/A,"Worker, Supervisor, Maintainer, Owner",,GET,/organizations/{id},None,N/A
# view,Organization,N/A,None,,GET,/organizations/{id},Admin,N/A
# update,Organization,N/A,"Owner, Maintainer",,PATCH,/organizations/{id},Worker,N/A
# update,Organization,N/A,"None, Worker, Supervisor",,PATCH,/organizations/{id},Admin,N/A
# delete,Organization,N/A,Owner,,DELETE,/organizations/{id},Worker,N/A
# delete,Organization,N/A,"None, Worker, Supervisor, Maintainer",,DELETE,/organizations/{id},Admin,N/A