package users

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": null}, "resource": {"id": 20, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"id": 11, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": null}, "resource": {"id": 75, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": null}, "resource": {"id": 65, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": null}, "resource": {"id": 64, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": null}, "resource": {"id": 372, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": null}, "resource": {"id": 393, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": null}, "resource": {"id": 386, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": null}, "resource": {"id": 378, "membership": {"role": null}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": null}, "resource": {"id": 325, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": 95, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"id": 23, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"id": 40, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 33, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": 95, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 7, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 20, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 74, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 88, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"id": 26, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 20, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 16, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 87, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 68, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 99, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 68, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"id": 48, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"id": 58, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 87, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"id": 27, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"id": 51, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 21}, "user": {"role": "owner"}}}, "resource": {"id": 21, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"id": 1, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": 62, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"id": 80, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 31, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 28, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 30, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 10, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 73, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 2, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"id": 82, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"id": 34, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 88, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"id": 9, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 69, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 68, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 55, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 1, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 10, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"id": 66, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"id": 1, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 69, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": 63, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 61, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"id": 74, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 274}, "user": {"role": "maintainer"}}}, "resource": {"id": 98, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"id": 42, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 19, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 89, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 21, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 54, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 10, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 7, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 8, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 46, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"id": 95, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"id": 41, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 57, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 94, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"id": 50, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 0, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 55, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"id": 53, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": 77, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"id": 83, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 43, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 83, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 85, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 46, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 16, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"id": 25, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": 30, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 36, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 75, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 58, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"id": 46, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 10, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"id": 26, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 75, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 98}, "user": {"role": "owner"}}}, "resource": {"id": 98, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"id": 54, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"id": 99, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 4, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 55, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 22, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 120, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 51, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 86, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 1, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"id": 47, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"id": 88, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 44, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 53, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 66, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 78, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 53, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 82, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 91, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"id": 0, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 62, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"id": 349, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 352, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": 393, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 52}, "user": {"role": "owner"}}}, "resource": {"id": 366, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"id": 372, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 392, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": 390, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"id": 390, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 336, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": 340, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 309, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"id": 391, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"id": 388, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": 370, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"id": 311, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"id": 314, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 308, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 307, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 26}, "user": {"role": "owner"}}}, "resource": {"id": 398, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"id": 354, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 320, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"id": 359, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"id": 364, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 363, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 353, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 372, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"id": 326, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": 385, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 307, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 304, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 349, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 317, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 319, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"id": 379, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"id": 301, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 342, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"id": 363, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"id": 330, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"id": 379, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 350, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": 322, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 375, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 312, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": 317, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 385, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": 342, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 307, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 302, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 336, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 355, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 360, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 351, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"id": 375, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 325, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"id": 342, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": 327, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 60}, "user": {"role": "owner"}}}, "resource": {"id": 372, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 373, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 304, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 385, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 366, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": 309, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 397, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 322, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 385, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"id": 334, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 378, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 334, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 370, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"id": 334, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"id": 328, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": 321, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 8}, "user": {"role": "owner"}}}, "resource": {"id": 396, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"id": 360, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": 347, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"id": 386, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"id": 357, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 367, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 325, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 308, "membership": {"role": null}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 364, "membership": {"role": "owner"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 359, "membership": {"role": "maintainer"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 316, "membership": {"role": "supervisor"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 320, "membership": {"role": "worker"}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 370, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": null}, "resource": {"id": 16, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": null}, "resource": {"id": 75, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": null}, "resource": {"id": 33, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": null}, "resource": {"id": 14, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": null}, "resource": {"id": 99, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": null}, "resource": {"id": 348, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": null}, "resource": {"id": 351, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": null}, "resource": {"id": 335, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": null}, "resource": {"id": 372, "membership": {"role": null}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"id": 339, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": 79, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"id": 35, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 81}, "user": {"role": "owner"}}}, "resource": {"id": 81, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"id": 89, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": 31, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 46, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"id": 77, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 37, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": 52, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"id": 97, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"id": 10, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 65, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 19, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 55, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"id": 29, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"id": 33, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 66, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 23, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 56, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"id": 35, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 46, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"id": 91, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"id": 78, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 41, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"id": 94, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 72, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 14, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": 77, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 70, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 29, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"id": 49, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 74, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 76, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 247}, "user": {"role": "supervisor"}}}, "resource": {"id": 36, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 83, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 80, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 82, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"id": 95, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"id": 84, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 61, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 96, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 55, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"id": 91, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"id": 43, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"id": 73, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"id": 54, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 29, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 241}, "user": {"role": "maintainer"}}}, "resource": {"id": 59, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": 93, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 87, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 45, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"id": 57, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 31, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 78, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": 70, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 80, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 32, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 61, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 30, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 62, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"id": 30, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 86, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 96, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": 79, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": 58, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 8, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 22, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"id": 94, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 66, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 81, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 91, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 27, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 69, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 88, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 46, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 84, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": 5, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 18, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 32, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 14, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 4, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"id": 80, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"id": 12, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 41, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 98}, "user": {"role": "owner"}}}, "resource": {"id": 98, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 34, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 42, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 1, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 65, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 72, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 11, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 35, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 31, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 62, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": 29, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 71, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 99, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 79, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 63, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 90, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"id": 373, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": 318, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": 389, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"id": 355, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"id": 355, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 309, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 308, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 381, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"id": 316, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 331, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 311, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 172, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 331, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 317, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 377, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 373, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 332, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 320, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 366, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"id": 337, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 346, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 382, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"id": 355, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 331, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 307, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 344, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 353, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": 367, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 306, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 363, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": 393, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 324, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 390, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 326, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 316, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 384, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 302, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 390, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 304, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": 319, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 42}, "user": {"role": "owner"}}}, "resource": {"id": 304, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 398, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 378, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 363, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 341, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 319, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 346, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 309, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 390, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 301, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 322, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"id": 367, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 399, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"id": 378, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 383, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"id": 355, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 393, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 369, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"id": 311, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": 312, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"id": 313, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 351, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 336, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 314, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 350, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"id": 394, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 326, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 384, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 347, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 364, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"id": 393, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 123, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 362, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"id": 341, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"id": 388, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 320, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"id": 338, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 369, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 318, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 359, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 341, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 307, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 399, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 393, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 316, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"id": 355, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"id": 392, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 344, "membership": {"role": null}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_OWNER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 312, "membership": {"role": "owner"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_MAINTAINER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 323, "membership": {"role": "maintainer"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_SUPERVISOR {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 396, "membership": {"role": "supervisor"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_WORKER {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"id": 329, "membership": {"role": "worker"}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 328, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_ADMIN_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": null}, "resource": {"id": 21, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_BUSINESS_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"id": 11, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_USER_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": null}, "resource": {"id": 24, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_WORKER_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"id": 34, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_SELF_privilege_NONE_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": null}, "resource": {"id": 27, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": null}, "resource": {"id": 381, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}, "resource": {"id": 362, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": null}, "resource": {"id": 392, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": null}, "resource": {"id": 369, "membership": {"role": null}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": null}, "resource": {"id": 302, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"id": 92, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"id": 97, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 46, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"id": 35, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": 31, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": 19, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 88, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 161, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 66, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 9, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 32, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 77, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 42, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 58, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"id": 11, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 17, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 24, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 70, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 98, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 0, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_ADMIN_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"id": 27, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 33, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 7, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"id": 74, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": 76, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"id": 13, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"id": 47, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 31, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 19, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"id": 58, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"id": 89, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 75, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 86, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 20, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"id": 73, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 0, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 59, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 4, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"id": 11, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": 67, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_BUSINESS_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 39, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"id": 43, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 87, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"id": 9, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 61, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"id": 27, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 46, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 48, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 22, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 70, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"id": 76, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 42, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 64, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 57, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": 67, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 28, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 5, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 99, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 58, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 11, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_USER_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"id": 66, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"id": 92, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"id": 9, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"id": 35, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": 22, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"id": 91, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 72, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 28, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": 48, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 60, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 9, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 61, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 37, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 96, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 88, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 2, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 63, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 99, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 78, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 282}, "user": {"role": "worker"}}}, "resource": {"id": 40, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_WORKER_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 27, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 18}, "user": {"role": "owner"}}}, "resource": {"id": 18, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"id": 88, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 32, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": 31, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 87, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"id": 6, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": 17, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 67, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 94, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 13, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 76, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 33, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 79, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 4, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 31, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 90, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 3, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 86, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 19, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_SELF_privilege_NONE_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 88, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 317, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 346, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"id": 376, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"id": 326, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": 332, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 368, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 396, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 311, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 389, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": 315, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"id": 365, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 350, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"id": 391, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_membership_role_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 331, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 349, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 328, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 307, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 37}, "user": {"role": "owner"}}}, "resource": {"id": 361, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 371, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 306, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 320, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 376, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 345, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 308, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 309, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 321, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 318, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 326, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 310, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": 393, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 321, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 324, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 320, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"id": 307, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": 344, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": 337, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 376, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 321, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": 335, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"id": 386, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 348, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 325, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"id": 307, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 323, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"id": 352, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 302, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 388, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 347, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 378, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"id": 322, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"id": 398, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 81}, "user": {"role": "owner"}}}, "resource": {"id": 393, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"id": 394, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 389, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 365, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 312, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 343, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 341, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 387, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 360, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 375, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 394, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": 367, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": 348, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 390, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 330, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 373, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 387, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 82}, "user": {"role": "owner"}}}, "resource": {"id": 316, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"id": 399, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 347, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"id": 387, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 328, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": 330, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"id": 382, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 320, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 352, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 387, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 313, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 359, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 316, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 309, "membership": {"role": null}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"id": 309, "membership": {"role": "owner"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": 396, "membership": {"role": "maintainer"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"id": 304, "membership": {"role": "supervisor"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 366, "membership": {"role": "worker"}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_membership_role_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 373, "membership": {"role": null}}}
}



# users_test.gen.rego.py
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
# NAME = 'users'
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
# OWNERSHIPS = ['self', 'none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
#
# def RESOURCES(scope):
#     if scope == 'list':
#         return [None]
#     else:
#         return [{
#             "id": random.randrange(300, 400),
#             "membership": { "role": role }
#         } for role in ORG_ROLES]
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
#     if ownership == 'self':
#         data['resource']['id'] = user_id
#
#     return data
#
# def _get_name(prefix, **kwargs):
#     name = prefix
#     for k,v in kwargs.items():
#         prefix = '_' + str(k)
#         if isinstance(v, dict):
#             if 'id' in v:
#                 v = v.copy()
#                 v.pop('id')
#             if v:
#                 name += _get_name(prefix, **v)
#         else:
#             name += f'{prefix}_{str(v).upper().replace(":", "_")}'
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
#     if context == "sandbox" and resource["membership"]["role"] != None:
#         return False
#     if context == "organization" and membership == None:
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

# users.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# list,User,N/A,N/A,,GET,/users,None,N/A
# view,User,Sandbox,None,,GET,/users/{id},Admin,N/A
# view,User,N/A,Self,,GET,/users/{id},None,N/A
# view,User,Organization,None,"resource[""membership""][""role""] != None",GET,/users/{id},None,Worker
# update,User,N/A,None,,PATCH,/users/{id},Admin,N/A
# update,User,N/A,Self,,PATCH,/users/{id},None,N/A
# delete,User,N/A,None,,DELETE,/users/{id},Admin,N/A
# delete,User,N/A,Self,,DELETE,/users/{id},None,N/A