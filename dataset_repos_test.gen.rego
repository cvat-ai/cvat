package dataset_repos

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": null}, "resource": {"id": 324, "organization": {"id": 548}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": null}, "resource": {"id": 359, "organization": {"id": 595}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": null}, "resource": {"id": 354, "organization": {"id": 506}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": null}, "resource": {"id": 350, "organization": {"id": 555}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": null}, "resource": {"id": 324, "organization": {"id": 528}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"id": 327, "organization": {"id": 516}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 396, "organization": {"id": 571}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 359, "organization": {"id": 533}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"id": 312, "organization": {"id": 596}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": 386, "organization": {"id": 526}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 391, "organization": {"id": 512}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 377, "organization": {"id": 541}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": 379, "organization": {"id": 555}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 328, "organization": {"id": 504}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": 303, "organization": {"id": 536}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"id": 383, "organization": {"id": 553}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 367, "organization": {"id": 547}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 376, "organization": {"id": 516}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 312, "organization": {"id": 553}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 349, "organization": {"id": 516}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"id": 310, "organization": {"id": 519}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "organization": {"id": 540}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 340, "organization": {"id": 550}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 350, "organization": {"id": 504}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 358, "organization": {"id": 557}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 64}, "user": {"role": "owner"}}}, "resource": {"id": 382, "organization": {"id": 521}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 389, "organization": {"id": 576}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": 357, "organization": {"id": 552}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 328, "organization": {"id": 551}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 365, "organization": {"id": 578}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"id": 327, "organization": {"id": 531}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": null}, "resource": {"id": 346, "organization": {"id": 525}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": null}, "resource": {"id": 363, "organization": {"id": 569}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": null}, "resource": {"id": 347, "organization": {"id": 597}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"id": 399, "organization": {"id": 570}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": 313, "organization": {"id": 580}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": 381, "organization": {"id": 521}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": 342, "organization": {"id": 591}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 395, "organization": {"id": 528}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 311, "organization": {"id": 595}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"id": 334, "organization": {"id": 568}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 320, "organization": {"id": 515}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 385, "organization": {"id": 553}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"id": 396, "organization": {"id": 572}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"id": 340, "organization": {"id": 571}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"id": 360, "organization": {"id": 567}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 386, "organization": {"id": 515}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 351, "organization": {"id": 582}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 303, "organization": {"id": 570}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"id": 308, "organization": {"id": 561}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": 385, "organization": {"id": 591}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "organization": {"id": 514}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 371, "organization": {"id": 560}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 328, "organization": {"id": 513}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 340, "organization": {"id": 513}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 328, "organization": {"id": 581}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 352, "organization": {"id": 582}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 366, "organization": {"id": 508}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 356, "organization": {"id": 530}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 321, "organization": {"id": 525}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": null}, "resource": {"id": 360, "organization": {"id": 501}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"id": 337, "organization": {"id": 515}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"id": 360, "organization": {"id": 506}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": null}, "resource": {"id": 391, "organization": {"id": 541}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": null}, "resource": {"id": 366, "organization": {"id": 527}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 373, "organization": {"id": 577}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"id": 392, "organization": {"id": 507}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "organization": {"id": 550}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 361, "organization": {"id": 552}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"id": 308, "organization": {"id": 501}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"id": 396, "organization": {"id": 568}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "organization": {"id": 549}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "organization": {"id": 543}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"id": 310, "organization": {"id": 557}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"id": 344, "organization": {"id": 591}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": 379, "organization": {"id": 581}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "organization": {"id": 580}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"id": 391, "organization": {"id": 531}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 311, "organization": {"id": 506}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"id": 304, "organization": {"id": 597}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"id": 311, "organization": {"id": 530}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"id": 393, "organization": {"id": 570}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 378, "organization": {"id": 506}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 303, "organization": {"id": 511}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 306, "organization": {"id": 578}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": 369, "organization": {"id": 546}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 366, "organization": {"id": 586}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "organization": {"id": 510}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 358, "organization": {"id": 561}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"id": 379, "organization": {"id": 564}}}
}



# generate_tests_for_dataset_repo.py
# # datsetrepo_test.gen.py
# # Copyright (C) 2022 Intel Corporation
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
# NAME = 'dataset_repos'
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
# OWNERSHIPS = ['none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
#
# def RESOURCES(scope):
#     if scope == 'list':
#         return [None]
#     else:
#         return [{
#             "id": random.randrange(300, 400),
#             "organization": {
#                 "id": random.randrange(500,600)
#             },
#         }]
#
# def eval_rule(scope, context, ownership, privilege, membership, data):
#     if privilege == 'admin':
#         return True
#
#     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: r['membership'] == 'na' or
#         ORG_ROLES.index(membership) <= ORG_ROLES.index(r['membership']), rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
#     resource = data['resource']
#     rules = list(filter(lambda r: not r['limit'] or eval(r['limit'], {'resource': resource}), rules))
#
#     return bool(rules)
#
# def get_data(scope, context, ownership, privilege, membership, resource):
#     data = {
#     "scope": scope,
#     "auth": {
#         "user": { "id": random.randrange(0,100), "privilege": privilege },
#         "organization": {
#             "id": random.randrange(100,200),
#             "owner": { "id": random.randrange(200, 300) },
#             "user": { "role": membership }
#         } if context == 'organization' else None
#     },
#     "resource": resource
#     }
#
#     user_id = data['auth']['user']['id']
#     if context == 'organization':
#         if data['auth']['organization']['user']['role'] == 'owner':
#             data['auth']['organization']['owner']['id'] = user_id
#
#     return data
#
# def _get_name(prefix, **kwargs):
#     name = prefix
#     for k,v in kwargs.items():
#         if k == 'resource':
#             continue
#         prefix = '_' + str(k)
#         if isinstance(v, dict):
#             if 'id' in v:
#                 v = v.copy()
#                 v.pop('id')
#             if v:
#                 name += _get_name(prefix, **v)
#         else:
#             name += ''.join(map(lambda c: c if c.isalnum() else {'@':'_IN_'}.get(c, '_'),
#                 f'{prefix}_{str(v).upper()}'))
#
#     return name
#
# def get_name(scope, context, ownership, privilege, membership, resource):
#     return _get_name('test', **locals())
#
# def is_valid(scope, context, ownership, privilege, membership, resource):
#     if context == "sandbox" and membership:
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
#             for resource in RESOURCES(scope):
#                 if not is_valid(scope, context, ownership, privilege, membership, resource):
#                     continue
#
#                 data = get_data(scope, context, ownership, privilege, membership, resource)
#                 test_name = get_name(scope, context, ownership, privilege, membership, resource)
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


# dataset_repos.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# list,DatasetRepo,Sandbox,N/A,,GET,/datasetrepo,None,N/A
# list,DatasetRepo,Organization,N/A,,GET,/datasetrepo,None,Worker
# create@task,"DatasetRepo, Task",Sandbox,N/A,,POST,/datasetrepo,Admin,N/A
# create@task,"DatasetRepo, Task",Sandbox,"Task:owner",,POST,/datasetrepo,Worker,N/A
# create@task,"DatasetRepo, Task",Organization,N/A,,POST,/datasetrepo,User,Maintainer
# create@task,"DatasetRepo, Task",Organization,"Task:owner",,POST,/datasetrepo,Worker,Worker
# view,DatasetRepo,Sandbox,None,,GET,"/datasetrepo/{task_id}, /datasetrepo/{task_id}/push, /datasetrepo/{rq_id}/status",Admin,N/A
# view,DatasetRepo,Sandbox,Owner,,GET,"/datasetrepo/{task_id}, /datasetrepo/{task_id}/push, /datasetrepo/{rq_id}/status",None,N/A
# view,DatasetRepo,Organization,Owner,,GET,"/datasetrepo/{task_id}, /datasetrepo/{task_id}/push, /datasetrepo/{rq_id}/status",None,Worker
# view,DatasetRepo,Organization,None,,GET,/datasetrepo/{task_id},User,Supervisor
# update,DatasetRepo,Sandbox,None,,PATCH,/datasetrepo/{task_id},Admin,N/A
# update,DatasetRepo,Sandbox,Owner,,PATCH,/datasetrepo/{task_id},Worker,N/A
# update,DatasetRepo,Organization,Owner,,PATCH,/datasetrepo/{task_id},Worker,Worker
# update,DatasetRepo,Organization,None,,PATCH,/datasetrepo/{task_id},User,Maintainer