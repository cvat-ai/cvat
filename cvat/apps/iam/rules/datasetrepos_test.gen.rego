package datasetrepos

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": null}, "resource": {"id": 374, "organization": {"id": 579}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}, "resource": {"id": 386, "organization": {"id": 517}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}, "resource": {"id": 398, "organization": {"id": 538}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": null}, "resource": {"id": 399, "organization": {"id": 549}}}
}

test_scope_CREATE_IN_TASK_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": null}, "resource": {"id": 334, "organization": {"id": 575}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"id": 331, "organization": {"id": 574}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"id": 315, "organization": {"id": 507}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 372, "organization": {"id": 517}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"id": 303, "organization": {"id": 571}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"id": 334, "organization": {"id": 542}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"id": 368, "organization": {"id": 520}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 360, "organization": {"id": 519}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"id": 300, "organization": {"id": 541}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 309, "organization": {"id": 538}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 397, "organization": {"id": 581}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": 391, "organization": {"id": 536}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "create@task", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 305, "organization": {"id": 554}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 362, "organization": {"id": 543}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": 317, "organization": {"id": 584}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 270}, "user": {"role": null}}}, "resource": {"id": 353, "organization": {"id": 537}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 337, "organization": {"id": 534}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"id": 362, "organization": {"id": 550}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 337, "organization": {"id": 589}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 392, "organization": {"id": 583}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 376, "organization": {"id": 589}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"id": 375, "organization": {"id": 508}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 367, "organization": {"id": 573}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"id": 352, "organization": {"id": 584}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 313, "organization": {"id": 524}}}
}

test_scope_CREATE_IN_TASK_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "create@task", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 361, "organization": {"id": 533}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": null}, "resource": {"id": 306, "organization": {"id": 521}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": null}, "resource": {"id": 377, "organization": {"id": 511}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": null}, "resource": {"id": 366, "organization": {"id": 590}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": null}, "resource": {"id": 348, "organization": {"id": 595}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": null}, "resource": {"id": 357, "organization": {"id": 501}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 81}, "user": {"role": "owner"}}}, "resource": {"id": 385, "organization": {"id": 597}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"id": 347, "organization": {"id": 541}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "organization": {"id": 516}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 349, "organization": {"id": 536}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"id": 321, "organization": {"id": 539}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"id": 314, "organization": {"id": 586}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "organization": {"id": 510}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"id": 341, "organization": {"id": 541}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 305, "organization": {"id": 522}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 324, "organization": {"id": 518}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"id": 320, "organization": {"id": 583}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"id": 346, "organization": {"id": 516}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 345, "organization": {"id": 585}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"id": 317, "organization": {"id": 504}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 301, "organization": {"id": 541}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"id": 373, "organization": {"id": 530}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 355, "organization": {"id": 544}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "organization": {"id": 593}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"id": 355, "organization": {"id": 569}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 303, "organization": {"id": 533}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 353, "organization": {"id": 521}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 378, "organization": {"id": 581}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 306, "organization": {"id": 514}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"id": 389, "organization": {"id": 508}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"id": 375, "organization": {"id": 584}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": null}, "resource": {"id": 323, "organization": {"id": 585}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": null}, "resource": {"id": 354, "organization": {"id": 549}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": null}, "resource": {"id": 335, "organization": {"id": 515}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": null}, "resource": {"id": 345, "organization": {"id": 585}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": null}, "resource": {"id": 344, "organization": {"id": 526}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"id": 353, "organization": {"id": 592}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 375, "organization": {"id": 534}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"id": 355, "organization": {"id": 547}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 363, "organization": {"id": 579}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"id": 343, "organization": {"id": 518}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 385, "organization": {"id": 542}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 332, "organization": {"id": 565}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "organization": {"id": 504}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 397, "organization": {"id": 566}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"id": 342, "organization": {"id": 576}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": 356, "organization": {"id": 531}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 397, "organization": {"id": 587}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"id": 355, "organization": {"id": 505}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 363, "organization": {"id": 584}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"id": 339, "organization": {"id": 512}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"id": 344, "organization": {"id": 518}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "organization": {"id": 541}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 364, "organization": {"id": 540}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"id": 312, "organization": {"id": 538}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"id": 302, "organization": {"id": 508}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"id": 352, "organization": {"id": 597}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 362, "organization": {"id": 552}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "organization": {"id": 596}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 321, "organization": {"id": 577}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"id": 310, "organization": {"id": 548}}}
}



# datasetrepo_test.gen.py
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
# NAME = 'datasetrepos'
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

# datasetrepos.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# list,DatasetRepo,Sandbox,N/A,,GET,"/dataset-repositories",None,N/A
# list,DatasetRepo,Organization,N/A,,GET,"/dataset-repositories",None,Worker
# create@task,"DatasetRepo, Task",Sandbox,N/A,,POST,"/dataset-repositories",Admin,N/A
# create@task,"DatasetRepo, Task",Sandbox,"Task:owner",,POST,"/dataset-repositories",Worker,N/A
# create@task,"DatasetRepo, Task",Organization,N/A,,POST,"/dataset-repositories",User,Maintainer
# create@task,"DatasetRepo, Task",Organization,"Task:owner",,POST,"/dataset-repositories",Worker,Worker
# view,DatasetRepo,Sandbox,None,,GET,"/dataset-repositories/{task_id}, /dataset-repositories/{task_id}/push, /dataset-repositories/{rq_id}/status",Admin,N/A
# view,DatasetRepo,Sandbox,Owner,,GET,"/dataset-repositories/{task_id}, /dataset-repositories/{task_id}/push, /dataset-repositories/{rq_id}/status",None,N/A
# view,DatasetRepo,Organization,Owner,,GET,"/dataset-repositories/{task_id}, /dataset-repositories/{task_id}/push, /dataset-repositories/{rq_id}/status",None,Worker
# view,DatasetRepo,Organization,None,,GET,"/dataset-repositories/{task_id}",User,Supervisor
# update,DatasetRepo,Sandbox,None,,PATCH,"/dataset-repositories/{task_id}",Admin,N/A
# update,DatasetRepo,Sandbox,Owner,,PATCH,"/dataset-repositories/{task_id}",Worker,N/A
# update,DatasetRepo,Organization,Owner,,PATCH,"/dataset-repositories/{task_id}",Worker,Worker
# update,DatasetRepo,Organization,None,,PATCH,"/dataset-repositories/{task_id}",User,Maintainer