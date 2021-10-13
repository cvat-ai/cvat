package organizations

test_scope_CREATE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 98}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 96}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 49, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 49}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 63}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 67}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 80, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 80}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 73}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 28}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 28}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 21}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 82, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 82}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_CREATE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 0}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 208}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 237}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 222}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 203}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 201}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 251}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 206}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 70, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 274}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 22, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 234}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 288}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 216}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 292}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 218}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 250}}}
}

test_scope_CREATE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 23, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 229}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 283}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 281}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 293}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 292}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 266}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 254}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_USER_resource_SUPERVISOR_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 266}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_USER_resource_SUPERVISOR_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 63, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 256}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_USER_resource_SUPERVISOR_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 212}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_WORKER_resource_WORKER_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 293}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_WORKER_resource_WORKER_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 26, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 257}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_WORKER_resource_WORKER_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 41, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 227}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_NONE_resource_SUPERVISOR_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 210}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_NONE_resource_SUPERVISOR_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 274}}}
}

test_scope_CREATE_context_NA_ownership_MEMBER_privilege_NONE_resource_SUPERVISOR_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 213}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 231}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 94, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 207}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 20, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 236}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 247}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_1 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 296}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_10 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 73, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 299}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_USER_resource_NONE_0 {
    allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 287}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_USER_resource_NONE_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 252}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_USER_resource_NONE_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 259}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 77, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 255}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 87, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 227}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 89, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 278}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_0 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 222}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_1 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 209}}}
}

test_scope_CREATE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_10 {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 76, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 211}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 8}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 9}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 27}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 59}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 61}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 96}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 89}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 69}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 78}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 4}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 10}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 47}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 68}}}
}

test_scope_VIEW_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 25}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 297}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 213}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 254}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 299}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 230}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 215}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 261}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 228}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 268}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 260}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 212}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 227}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 214}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 203}}}
}

test_scope_VIEW_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 206}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_ADMIN_resource_SUPERVISOR_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 299}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_ADMIN_resource_SUPERVISOR_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 297}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_ADMIN_resource_SUPERVISOR_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 240}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 285}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 217}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 223}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 260}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 254}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 232}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 223}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 235}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 267}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 268}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 217}}}
}

test_scope_VIEW_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 229}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_0 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 281}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_1 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 232}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_10 {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 220}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_0 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 287}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_1 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 286}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_10 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 232}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_USER_resource_NONE_0 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 289}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_USER_resource_NONE_1 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 234}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_USER_resource_NONE_10 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 207}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_0 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 236}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_1 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 225}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_10 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 216}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_NONE_resource_NONE_0 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 214}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_NONE_resource_NONE_1 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 296}}}
}

test_scope_VIEW_context_NA_ownership_NONE_privilege_NONE_resource_NONE_10 {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 268}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 31, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 31}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 42}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 59}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 40}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 92}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 53}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 62}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 42}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 71}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 6, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 6}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 7}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 49, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 49}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 36, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 36}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 11}}}
}

test_scope_LIST_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 85}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 79, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 217}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 87, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 219}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 241}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 258}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 58, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 262}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 238}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 229}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 229}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 269}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 298}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 207}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 211}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 24, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 297}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 3, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 214}}}
}

test_scope_LIST_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 268}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_ADMIN_resource_SUPERVISOR_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 74, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 279}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_ADMIN_resource_SUPERVISOR_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 239}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_ADMIN_resource_SUPERVISOR_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 292}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 234}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 55, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 292}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_WORKER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 58, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 288}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 236}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 244}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 4, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 223}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 3, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 223}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 39, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 257}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 268}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_NONE_resource_SUPERVISOR_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 230}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_NONE_resource_SUPERVISOR_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 41, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 218}}}
}

test_scope_LIST_context_NA_ownership_MEMBER_privilege_NONE_resource_SUPERVISOR_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 257}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_0 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 240}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_1 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 236}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_10 {
    allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 267}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_0 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 259}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_1 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 284}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_10 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 236}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_USER_resource_NONE_0 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 264}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_USER_resource_NONE_1 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 26, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 213}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_USER_resource_NONE_10 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 6, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 261}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_0 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 284}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_1 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 266}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_10 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 30, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 293}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_NONE_resource_NONE_0 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 262}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_NONE_resource_NONE_1 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 292}}}
}

test_scope_LIST_context_NA_ownership_NONE_privilege_NONE_resource_NONE_10 {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 44, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 211}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 81}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 95}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 81}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 44}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 25}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 65}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 31}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 16}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 69}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 25}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 77}}}
}

test_scope_DELETE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 56}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 232}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 237}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 287}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 283}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 228}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 270}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 230}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 218}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 213}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 226}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 289}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 297}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 212}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 223}}}
}

test_scope_DELETE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 269}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 237}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 292}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 289}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_SUPERVISOR_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 201}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_SUPERVISOR_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 203}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_SUPERVISOR_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 283}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 225}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 218}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 259}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 264}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 264}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 255}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 256}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 254}}}
}

test_scope_DELETE_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 250}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_0 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 268}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_1 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 273}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_10 {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 299}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 294}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 234}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 293}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_USER_resource_NONE_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 258}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_USER_resource_NONE_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 289}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_USER_resource_NONE_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 260}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 203}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 233}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 276}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_0 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 289}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_1 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 298}}}
}

test_scope_DELETE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_10 {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 234}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 86}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 92}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_ADMIN_resource_OWNER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 70}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 58}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 47}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_BUSINESS_resource_OWNER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 54}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 41}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 20}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_USER_resource_OWNER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 57}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 83}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 74}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_WORKER_resource_OWNER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 51}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "owner"}, "owner": {"id": 24}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "owner"}, "owner": {"id": 26}}}
}

test_scope_UPDATE_context_NA_ownership_OWNER_privilege_NONE_resource_OWNER_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "owner"}, "owner": {"id": 76}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 209}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 269}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_ADMIN_resource_MAINTAINER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 213}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 286}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 261}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_BUSINESS_resource_MAINTAINER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 291}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 245}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 244}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_USER_resource_MAINTAINER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 275}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 253}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 290}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_WORKER_resource_MAINTAINER_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 235}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "maintainer"}, "owner": {"id": 294}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "maintainer"}, "owner": {"id": 204}}}
}

test_scope_UPDATE_context_NA_ownership_MAINTAINER_privilege_NONE_resource_MAINTAINER_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "maintainer"}, "owner": {"id": 200}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 261}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 201}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_ADMIN_resource_WORKER_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 214}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_SUPERVISOR_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 252}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_SUPERVISOR_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 276}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_BUSINESS_resource_SUPERVISOR_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 243}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 253}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 230}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_USER_resource_WORKER_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 290}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": "supervisor"}, "owner": {"id": 209}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": "supervisor"}, "owner": {"id": 280}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_WORKER_resource_SUPERVISOR_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": "supervisor"}, "owner": {"id": 218}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": "worker"}, "owner": {"id": 266}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": "worker"}, "owner": {"id": 225}}}
}

test_scope_UPDATE_context_NA_ownership_MEMBER_privilege_NONE_resource_WORKER_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": "worker"}, "owner": {"id": 276}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_0 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "admin"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 242}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_1 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "admin"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 214}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_ADMIN_resource_NONE_10 {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "admin"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 218}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "business"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 287}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "business"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 259}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_BUSINESS_resource_NONE_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "business"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 293}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_USER_resource_NONE_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "user"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 283}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_USER_resource_NONE_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "user"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 256}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_USER_resource_NONE_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "user"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 285}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "worker"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 230}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "worker"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 258}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_WORKER_resource_NONE_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "worker"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 278}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_0 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "none"}}, "resource": {"user": {"num_resources": 0, "role": null}, "owner": {"id": 241}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_1 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "none"}}, "resource": {"user": {"num_resources": 1, "role": null}, "owner": {"id": 270}}}
}

test_scope_UPDATE_context_NA_ownership_NONE_privilege_NONE_resource_NONE_10 {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "none"}}, "resource": {"user": {"num_resources": 10, "role": null}, "owner": {"id": 217}}}
}



# organizations_test.gen.rego.py
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
# 
# import csv
# import json
# import random
# import sys
# import os
# 
# simple_rules = []
# with open(os.path.join(sys.argv[1], 'organizations.csv')) as f:
#     reader = csv.DictReader(f)
#     for row in reader:
#         row = {k.lower():v.lower().replace('n/a','na') for k,v in row.items()}
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
# 
#         if not found:
#             simple_rules.append(row)
# 
# SCOPES = {rule['scope'] for rule in simple_rules}
# CONTEXTS = ['na']
# OWNERSHIPS = ['owner', 'maintainer', 'member', 'none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
# 
# def RESOURCES(ownership):
#     if ownership == 'none':
#         ownership = None
#     elif ownership == 'member':
#         ownership = random.choice(['supervisor', 'worker'])
# 
#     return [{'user': {'num_resources': n, 'role': ownership}} for n in (0, 1, 10)]
# 
# def eval_rule(scope, context, ownership, privilege, resource):
#     if privilege == 'admin':
#         return True
# 
#     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
# 
#     rules = list(filter(lambda r: not r['limit'] or r['limit'].startswith('filter')
#         or eval(r['limit']), rules))
# 
#     return bool(rules)
# 
# def get_data(scope, context, ownership, privilege, resource):
#     data = {
#         "scope": scope,
#         "auth": {
#             "user": { "id": random.randrange(0,100), "privilege": privilege },
#         },
#         "resource": {**resource,
#             "owner": { "id": random.randrange(200, 300) }
#         }
#     }
# 
#     user_id = data['auth']['user']['id']
#     if ownership == 'owner':
#         data['resource']['owner']['id'] = user_id
# 
#     return data
# 
# 
# def get_name(scope, context, ownership, privilege, resource):
#     return (f'test_scope_{scope.upper()}_context_{context.upper()}'
#         f'_ownership_{ownership.upper()}_privilege_{privilege.upper()}'
#         f'_resource_{str(resource["user"]["role"]).upper()}_{resource["user"]["num_resources"]}')
# 
# with open('organizations_test.gen.rego', 'wt') as f:
#     f.write('package organizations\n\n')
# 
#     for scope in SCOPES:
#         for context in CONTEXTS:
#             for ownership in OWNERSHIPS:
#                 for privilege in GROUPS:
#                         for resource in RESOURCES(ownership):
#                             test_name = get_name(scope, context, ownership, privilege, resource)
#                             result = eval_rule(scope, context, ownership, privilege, resource)
#                             data = get_data(scope, context, ownership, privilege, resource)
# 
# 
#                             f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                                 test_name=test_name, allow='allow' if result else 'not allow',
#                                 data=json.dumps(data)))
# 
#     with open(sys.argv[0]) as this_file:
#         f.write(f'\n\n# {os.path.split(sys.argv[0])[1]}\n')
#         for line in this_file:
#             f.write(f'# {line}')
# 
#     with open(os.path.join(sys.argv[1], 'organizations.csv')) as rego_file:
#         f.write(f'\n\n# organizations.csv\n')
#         for line in rego_file:
#             f.write(f'# {line}')

# organizations.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# create,Organization,N/A,N/A,"resource[""user""][""num_resources""] < 1",POST,/organizations,User,N/A
# create,Organization,N/A,N/A,,POST,/organizations,Business,N/A
# list,Organization,N/A,"Member, Maintainer, Owner",,GET,/organizations,None,N/A
# list,Organization,N/A,None,,GET,/organizations,Admin,N/A
# view,Organization,N/A,"Member, Maintainer, Owner",,GET,/organizations/{id},None,N/A
# view,Organization,N/A,None,,GET,/organizations/{id},Admin,N/A
# update,Organization,N/A,Owner,,PATCH,/organizations/{id},Worker,N/A
# update,Organization,N/A,Maintainer,,PATCH,/organizations/{id},User,N/A
# update,Organization,N/A,"None, Member",,PATCH,/organizations/{id},Admin,N/A
# delete,Organization,N/A,Owner,,DELETE,/organizations/{id},Worker,N/A
# delete,Organization,N/A,"None, Member, Maintainer",,DELETE,/organizations/{id},Admin,N/A