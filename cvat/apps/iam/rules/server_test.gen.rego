package server

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 42}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 223}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 266}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 260}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 56}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 258}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 218}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 228}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 4}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 252}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 299}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 288}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 83}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 285}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 236}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 275}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 13}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 236}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 259}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 271}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": null}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 90}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 207}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 229}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 239}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 63}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 239}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 226}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 266}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 57}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 280}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 243}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 273}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 80}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 233}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 293}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 285}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 57}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 271}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 236}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 273}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": null}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 24}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 247}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 254}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 261}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 22}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 233}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 200}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 283}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 73}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 205}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 172, "owner": {"id": 203}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 239}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 80}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 277}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 287}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 258}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 44}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 213}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 227}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 217}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 27}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 236}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 260}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 209}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 56}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 261}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 217}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 201}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 68}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 270}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 265}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 296}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 88}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 211}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 268}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 273}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 25}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 291}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 252}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 226}, "user": {"role": "worker"}}}}
}



# server_test.gen.rego.py
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
# NAME = 'server'
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
#     rules = list(filter(lambda r: not r['limit'] or eval(r['limit']), rules))
#
#     return bool(rules)
#
# def get_data(scope, context, ownership, privilege, membership):
#     data = {
#         "scope": scope,
#         "auth": {
#             "user": { "id": random.randrange(0,100), "privilege": privilege },
#             "organization": {
#                 "id": random.randrange(100,200),
#                 "owner": { "id": random.randrange(200, 300) },
#                 "user": { "role": membership }
#             } if context == 'organization' else None
#         }
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
# def get_name(scope, context, ownership, privilege, membership):
#     return _get_name('test', **locals())
#
# def is_valid(scope, context, ownership, privilege, membership):
#     if context == "sandbox" and membership:
#         return False
#     if scope == 'list' and ownership != 'None':
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
#             if not is_valid(scope, context, ownership, privilege, membership):
#                 continue
#
#             data = get_data(scope, context, ownership, privilege, membership)
#             test_name = get_name(scope, context, ownership, privilege, membership)
#             result = eval_rule(scope, context, ownership, privilege, membership, data)
#             f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                 test_name=test_name, allow='allow' if result else 'not allow',
#                 data=json.dumps(data)))
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

# server.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# view,N/A,N/A,N/A,,GET,"/server/about, /server/annotation/formats, /server/plugins",None,N/A
# send:exception,N/A,N/A,N/A,,POST,/server/exception,None,N/A
# send:logs,N/A,N/A,N/A,,POST,/server/logs,None,N/A
# list:content,N/A,N/A,N/A,,GET,/server/share,Worker,N/A