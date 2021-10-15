package users

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 379}, "id": 89}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 384}, "id": 43}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 385}, "id": 64}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 346}, "id": 34}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 372}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 233}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 345}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 378}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 374}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 335}, "id": 35}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 375}, "id": 91}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 320}, "id": 86}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 384}, "id": 61}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 218}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 359}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 334}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 327}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 390}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 137, "owner": {"id": 255}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 385}, "id": 15}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 326}, "id": 19}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 301}, "id": 72}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 399}, "id": 7}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 211}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 364}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 318}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 316}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 367}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 288}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 382}, "id": 8}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 394}, "id": 92}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 318}, "id": 86}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 326}, "id": 83}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 295}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 308}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 123, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 317}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 381}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 313}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 203}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 325}, "id": 6}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 386}, "id": 6}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 371}, "id": 44}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 338}, "id": 54}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 270}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 357}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 344}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 313}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 326}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 304}, "id": 13}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 358}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 367}, "id": 11}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 348}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 323}, "id": 80}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 377}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 389}, "id": 39}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 361}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 369}, "id": 53}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 395}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 278}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 338}, "id": 33}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 349}, "id": 97}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 365}, "id": 55}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 344}, "id": 77}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 399}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 394}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 397}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 345}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 292}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 338}, "id": 86}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 358}, "id": 32}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 376}, "id": 12}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 364}, "id": 66}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 321}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 397}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 355}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 359}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 207}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 386}, "id": 22}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 341}, "id": 85}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 333}, "id": 87}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 319}, "id": 73}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 242}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 321}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 353}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 320}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 395}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 227}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 327}, "id": 99}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 338}, "id": 15}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 356}, "id": 38}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 336}, "id": 39}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 264}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 384}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 344}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 377}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 375}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 280}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 357}, "id": 15}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 374}, "id": 88}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 365}, "id": 45}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 301}, "id": 60}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 358}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 378}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 353}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 391}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 389}, "id": 98}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 388}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 344}, "id": 99}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 324}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 375}, "id": 20}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 305}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 345}, "id": 85}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 300}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 368}, "id": 55}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 307}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 226}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 353}, "id": 55}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 343}, "id": 9}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 167, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 301}, "id": 2}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 314}, "id": 14}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 340}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 325}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 385}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 380}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 334}, "id": 32}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 320}, "id": 87}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 327}, "id": 77}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 306}, "id": 3}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 204}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 337}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 365}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 399}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 314}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 373}, "id": 5}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 393}, "id": 41}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 337}, "id": 39}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 351}, "id": 91}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 271}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 359}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 390}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 359}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 348}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 294}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 309}, "id": 60}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 311}, "id": 81}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 357}, "id": 15}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 360}, "id": 69}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 299}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 330}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 306}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 391}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 346}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 206}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 311}, "id": 39}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 309}, "id": 45}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 360}, "id": 53}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 393}, "id": 78}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 328}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 354}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 325}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 323}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 355}, "id": 15}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 395}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 323}, "id": 51}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 341}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 328}, "id": 26}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 387}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 343}, "id": 60}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 329}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 318}, "id": 33}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 387}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 290}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 321}, "id": 25}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 346}, "id": 40}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 339}, "id": 46}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 307}, "id": 85}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 236}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 346}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 325}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 313}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 354}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 214}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 393}, "id": 46}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 335}, "id": 76}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 319}, "id": 45}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 393}, "id": 30}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 319}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 340}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 307}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 330}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 332}, "id": 53}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 372}, "id": 90}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 394}, "id": 16}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 395}, "id": 92}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 298}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 339}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 316}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 317}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 300}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 248}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 392}, "id": 70}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 326}, "id": 2}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 300}, "id": 62}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 312}, "id": 40}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 220}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 370}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 342}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 370}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 326}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 285}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 393}, "id": 1}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 300}, "id": 36}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 370}, "id": 28}}
}

test_scope_LIST_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 382}, "id": 73}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 304}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 367}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 387}}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 389}}}
}

test_scope_LIST_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 354}, "id": 73}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 319}}}
}

test_scope_LIST_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 314}, "id": 60}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 332}}}
}

test_scope_LIST_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 343}, "id": 23}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 321}}}
}

test_scope_LIST_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 383}, "id": 14}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 338}}}
}

test_scope_LIST_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 321}, "id": 54}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 345}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 260}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 392}, "id": 12}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 358}, "id": 74}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 313}, "id": 56}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 355}, "id": 22}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 239}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 361}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 346}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 375}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 364}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 225}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 309}, "id": 13}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 398}, "id": 59}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 352}, "id": 29}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 399}, "id": 51}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 287}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 341}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 371}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 339}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 303}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 247}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 343}, "id": 86}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 333}, "id": 42}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 391}, "id": 39}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 300}, "id": 51}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 267}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 373}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 377}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 321}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 314}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 259}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 325}, "id": 0}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 374}, "id": 46}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 344}, "id": 96}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 361}, "id": 13}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 257}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 383}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 346}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 337}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 390}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 261}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 330}, "id": 99}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 399}, "id": 71}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 352}, "id": 36}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 370}, "id": 76}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 221}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 347}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 384}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 363}}}
}

test_scope_VIEW_SELF_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 305}}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 330}, "id": 60}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 351}}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 369}, "id": 73}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 313}}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 328}, "id": 49}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 389}}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 366}, "id": 30}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 394}}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 332}, "id": 93}}
}

test_scope_VIEW_SELF_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view:self", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 300}}}
}



# users_test.gen.rego.py
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
## import csv
# import json
# import random
# import sys
# import os
## simple_rules = []
# with open(os.path.join(sys.argv[1], 'users.csv')) as f:
#     reader = csv.DictReader(f)
#     for row in reader:
#         row = {k.lower():v.lower().replace('n/a','na') for k,v in row.items()}
#         row['limit'] = row['limit'].replace('none', 'None')
#         row['limit'] = row['limit'].replace('true', 'True')
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
# OWNERSHIPS = ['self', 'none']
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
#             "user": { "id": random.randrange(300, 400) }
#         }
#     }
##     user_id = data['auth']['user']['id']
#     if ownership == 'self':
#         data['resource']['id'] = user_id
##     return data
## def get_name(scope, context, ownership, privilege, membership):
#     return (f'test_scope_{scope.replace(":", "_").upper()}_context_{context.upper()}'
#         f'_ownership_{str(ownership).upper()}_privilege_{privilege.upper()}'
#         f'_membership_{str(membership).upper()}')
## with open('users_test.gen.rego', 'wt') as f:
#     f.write('package users\n\n')
##     for scope in SCOPES:
#         for context in CONTEXTS:
#             for privilege in GROUPS:
#                 for ownership in OWNERSHIPS:
#                     for membership in ORG_ROLES:
#                         if context == 'sandbox' and membership:
#                             continue
#                         elif context == 'organization' and membership is None:
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
##     with open(os.path.join(sys.argv[1], 'users.csv')) as rego_file:
#         f.write(f'\n\n# users.csv\n')
#         for line in rego_file:
#             if line.strip():
#                 f.write(f'# {line}')
#             else:
#                 f.write(f'#')

# users.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# list,User,N/A,N/A,,GET,/users,Admin,N/A
# view:self,User,N/A,N/A,,GET,/users/self,None,N/A
# view,User,N/A,None,,GET,/users/{id},Admin,N/A
# view,User,N/A,Self,,GET,/users/{id},None,N/A
# update,User,N/A,None,,PATCH,/users/{id},Admin,N/A
# update,User,N/A,Self,,PATCH,/users/{id},None,N/A
# delete,User,N/A,None,,DELETE,/users/{id},Admin,N/A
# delete,User,N/A,Self,,DELETE,/users/{id},None,N/A