package memberships

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 90}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 59}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 2}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 49}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"user": {"id": 69}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 358}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 382}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 398}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 328}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"user": {"id": 329}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 23}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 40}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 95}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 3}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"user": {"id": 42}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 18}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 352}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 315}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 388}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 343}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"user": {"id": 362}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 79}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 81}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 43}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 74}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"user": {"id": 53}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 392}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 368}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 395}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 310}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"id": 302}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 11}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 79}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 49}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 31}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"id": 91}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 44}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 312}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 365}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 375}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 380}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"user": {"id": 306}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 72}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 51}, "role": "maintainer"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 91}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 47}, "role": "worker"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"id": 40}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 395}, "role": "supervisor"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 344}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 366}, "role": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 346}, "role": "owner"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"user": {"id": 345}, "role": "owner"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 20}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 392}, "role": "worker"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 94}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 308}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 19}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 348}, "role": "supervisor"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 81}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 316}, "role": "owner"}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 6}, "role": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 357}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 92}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 85}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 69}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 95}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 253}, "user": {"role": null}}}, "resource": {"user": {"id": 89}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 383}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 350}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 318}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 382}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"user": {"id": 314}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 86}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 81}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 66}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 78}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"user": {"id": 11}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 307}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 385}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 303}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 340}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"user": {"id": 302}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 56}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 78}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 92}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 34}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"id": 11}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 303}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 376}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 378}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 364}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"id": 348}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 66}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 53}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 86}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 76}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"user": {"id": 66}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 366}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 330}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 345}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 310}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 268}, "user": {"role": null}}}, "resource": {"user": {"id": 373}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 17}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 21}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 25}, "role": "supervisor"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 56}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"id": 72}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 372}, "role": "owner"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 373}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 336}, "role": null}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 326}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"id": 392}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 30}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 349}, "role": "maintainer"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 20}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 323}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 86}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 328}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 7}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 376}, "role": "worker"}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 91}, "role": null}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 302}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 37}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 37}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 62}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 85}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 3}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"user": {"id": 17}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 358}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 370}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 386}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 340}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"id": 326}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 68}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 6}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 90}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 15}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"user": {"id": 93}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 82}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 356}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 324}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 318}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 369}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 272}, "user": {"role": null}}}, "resource": {"user": {"id": 325}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 79}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 87}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 47}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 93}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"user": {"id": 92}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 389}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 384}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 342}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 305}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"user": {"id": 398}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 98}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 98}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 54}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 97}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 29}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"id": 17}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 374}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 303}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 325}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 361}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"user": {"id": 321}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 70}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 37}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 204}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 78}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 15}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"user": {"id": 1}, "role": null}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 64}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 351}, "role": "owner"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 353}, "role": "maintainer"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 316}, "role": "worker"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 330}, "role": "supervisor"}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"user": {"id": 395}, "role": "supervisor"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 25}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 316}, "role": "worker"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 52}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 395}, "role": "owner"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 92}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 370}, "role": "worker"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 44}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 333}, "role": "maintainer"}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 13}, "role": null}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 323}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 44}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 44}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 34}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 66}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 68}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"id": 37}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 390}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 385}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 386}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 194, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 356}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"user": {"id": 375}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 2}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 2}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 97}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 53}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 16}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"id": 73}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 338}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 314}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 360}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 352}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"user": {"id": 364}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 80}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 46}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 6}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 22}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"user": {"id": 81}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 366}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 361}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 368}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 393}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 225}, "user": {"role": null}}}, "resource": {"user": {"id": 347}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 56}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 19}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 25}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 24}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"id": 83}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 347}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 350}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 346}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 345}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"user": {"id": 346}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 5}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 79}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 94}, "role": "supervisor"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 68}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"user": {"id": 77}, "role": null}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 349}, "role": "maintainer"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 305}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 378}, "role": "owner"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 372}, "role": "worker"}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"user": {"id": 312}, "role": "worker"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 5}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 307}, "role": "maintainer"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 42}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 325}, "role": "worker"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 39}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 371}, "role": "owner"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 25}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 377}, "role": "worker"}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 27}, "role": null}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 399}, "role": "supervisor"}}
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
# delete,Membership,Organization,"None, User_Self","resource[""role""] != ""owner""",DELETE,/membership/{id},User,Owner