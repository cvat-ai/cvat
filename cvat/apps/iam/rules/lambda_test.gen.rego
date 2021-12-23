package lambda

test_scope_CALL_ONLINE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": null}, "resource": null}
}

test_scope_CALL_ONLINE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": null}, "resource": null}
}

test_scope_CALL_ONLINE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": null}, "resource": null}
}

test_scope_CALL_ONLINE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": null}, "resource": null}
}

test_scope_CALL_ONLINE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "call:online", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": null}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 209}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 232}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 275}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "call:online", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 230}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "call:online", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "call:online", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "call:online", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "call:online", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_ONLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "call:online", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 281}, "user": {"role": null}}}, "resource": null}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": null}, "resource": null}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": null}, "resource": null}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": null}, "resource": null}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": null}, "resource": null}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": null}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 216}, "user": {"role": null}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 235}, "user": {"role": null}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 233}, "user": {"role": null}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 6}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 279}, "user": {"role": null}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 247}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": null}
}

test_scope_CALL_OFFLINE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": null}, "resource": null}
}

test_scope_CALL_OFFLINE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": null}, "resource": null}
}

test_scope_CALL_OFFLINE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": null}, "resource": null}
}

test_scope_CALL_OFFLINE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": null}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 236}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "call:offline", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 234}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 251}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 294}, "user": {"role": null}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": null}
}

test_scope_CALL_OFFLINE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "call:offline", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 242}, "user": {"role": null}}}, "resource": null}
}



# lambda_test.gen.repo.py
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
#
# NAME = 'lambda'
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
#                 if col in ["limit", "method", "url", "resource"]:
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
# SCOPES = list({rule['scope'] for rule in simple_rules})
# CONTEXTS = ['sandbox', 'organization']
# OWNERSHIPS = ['none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
#
# def RESOURCES(scope):
#     return [None]
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
#         "scope": scope,
#         "auth": {
#             "user": { "id": random.randrange(0,100), "privilege": privilege },
#             "organization": {
#                 "id": random.randrange(100,200),
#                 "owner": { "id": random.randrange(200, 300) },
#                 "user": { "role": membership }
#             } if context == 'organization' else None
#         },
#         "resource": resource
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

# lambda.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# list,N/A,N/A,N/A,,GET,/lambda/functions,None,N/A
# view,LambdaFunction,N/A,N/A,,GET,/lambda/functions/{func_id},None,N/A
# call:online,"LambdaFunction, Job",N/A,N/A,,POST,/lambda/functions/{func_id},Worker,N/A
# call:offline,"LambdaFunction, Task",N/A,N/A,,POST,/lambda/requests,Business,N/A
# call:offline,"LambdaFunction, Task",N/A,N/A,,GET,"/lambda/requests/{id}, /lambda/requests",Business,N/A
