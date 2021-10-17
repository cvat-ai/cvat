package server

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 284}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 278}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 209}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 210}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 242}, "user": {"role": null}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 246}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 260}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 229}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 215}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 292}, "user": {"role": null}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_USER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 292}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 224}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 229}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_USER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 237}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 256}, "user": {"role": null}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 267}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 250}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 237}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 208}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 281}, "user": {"role": null}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 299}, "user": {"role": "owner"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 267}, "user": {"role": "maintainer"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 275}, "user": {"role": "supervisor"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 229}, "user": {"role": "worker"}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 211}, "user": {"role": null}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": null}}
}

test_scope_VIEW_context_SANDBOX_ownership_NA_privilege_NONE_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": null}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 249}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 247}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 203}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 260}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 242}, "user": {"role": null}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 291}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 222}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 257}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 274}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 269}, "user": {"role": null}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_USER_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 216}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 290}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 236}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_USER_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 279}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 242}, "user": {"role": null}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 233}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 212}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 249}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 253}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 212}, "user": {"role": null}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 255}, "user": {"role": "owner"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 225}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 292}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 290}, "user": {"role": "worker"}}}}
}

test_scope_SEND_LOGS_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 248}, "user": {"role": null}}}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": null}}
}

test_scope_SEND_LOGS_context_SANDBOX_ownership_NA_privilege_NONE_membership_NONE {
    allow with input as {"scope": "send:logs", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 243}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 281}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 209}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 210}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 251}, "user": {"role": null}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 228}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 261}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 210}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 270}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 216}, "user": {"role": null}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_USER_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 256}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 219}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 273}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_USER_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 286}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 204}, "user": {"role": null}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 295}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 258}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 273}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 235}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 280}, "user": {"role": null}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 250}, "user": {"role": "owner"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 238}, "user": {"role": "maintainer"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 287}, "user": {"role": "supervisor"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 213}, "user": {"role": "worker"}}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 231}, "user": {"role": null}}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": null}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NA_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 201}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 291}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 235}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 267}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 200}, "user": {"role": null}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 256}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 268}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 270}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 233}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 262}, "user": {"role": null}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_USER_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 252}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_USER_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 281}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_USER_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 210}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_USER_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 273}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 254}, "user": {"role": null}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 288}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 299}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 288}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 232}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 262}, "user": {"role": null}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_OWNER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 145, "owner": {"id": 251}, "user": {"role": "owner"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_MAINTAINER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 258}, "user": {"role": "maintainer"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_SUPERVISOR {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 276}, "user": {"role": "supervisor"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_WORKER {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 282}, "user": {"role": "worker"}}}}
}

test_scope_SEND_EXCEPTION_context_ORGANIZATION_ownership_NA_privilege_NONE_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 222}, "user": {"role": null}}}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NA_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NA_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NA_privilege_USER_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NA_privilege_WORKER_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": null}}
}

test_scope_SEND_EXCEPTION_context_SANDBOX_ownership_NA_privilege_NONE_membership_NONE {
    allow with input as {"scope": "send:exception", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}}
}



# server_test.gen.rego.py
# # Copyright (C) 2021 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
## import csv
# import json
# import random
# import sys
# import os
## simple_rules = []
# with open(os.path.join(sys.argv[1], 'server.csv')) as f:
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
# OWNERSHIPS = ['na']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
## def eval_rule(scope, context, ownership, privilege, membership):
#     if privilege == 'admin':
#         return True
##     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: r['membership'] == 'na' or
#         ORG_ROLES.index(membership) <= ORG_ROLES.index(r['membership']), rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
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
#         }
#     }
##     return data
## def get_name(scope, context, ownership, privilege, membership):
#     return (f'test_scope_{scope.replace(":", "_").upper()}_context_{context.upper()}'
#         f'_ownership_{str(ownership).upper()}_privilege_{privilege.upper()}'
#         f'_membership_{str(membership).upper()}')
## with open('server_test.gen.rego', 'wt') as f:
#     f.write('package server\n\n')
##     for scope in SCOPES:
#         for context in CONTEXTS:
#             for privilege in GROUPS:
#                 for ownership in OWNERSHIPS:
#                     for membership in ORG_ROLES:
#                         if context == 'sandbox' and membership:
#                             continue
#                         test_name = get_name(scope, context, ownership, privilege, membership)
#                         data = get_data(scope, context, ownership, privilege, membership)
#                         result = eval_rule(scope, context, ownership, privilege, membership)
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
##     with open(os.path.join(sys.argv[1], 'server.csv')) as rego_file:
#         f.write(f'\n\n# server.csv\n')
#         for line in rego_file:
#             if line.strip():
#                 f.write(f'# {line}')
#             else:
#                 f.write(f'#')


# server.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# view,N/A,N/A,N/A,,GET,"/server/about, /server/annotation/formats, /server/plugins",None,N/A
# send:exception,N/A,N/A,N/A,,POST,/server/exception,None,N/A
# send:logs,N/A,N/A,N/A,,POST,/server/logs,None,N/A
# list:content,N/A,N/A,N/A,,GET,/server/share,Worker,N/A