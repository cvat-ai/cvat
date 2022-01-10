package cloudstorages

test_scope_LIST_CONTENT_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": null}, "resource": {"id": 305, "owner": {"id": 10}, "organization": {"id": 541}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"id": 373, "owner": {"id": 39}, "organization": {"id": 550}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": null}, "resource": {"id": 350, "owner": {"id": 25}, "organization": {"id": 580}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": null}, "resource": {"id": 304, "owner": {"id": 56}, "organization": {"id": 553}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": null}, "resource": {"id": 316, "owner": {"id": 73}, "organization": {"id": 518}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": null}, "resource": {"id": 309, "owner": {"id": 445}, "organization": {"id": 545}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": null}, "resource": {"id": 394, "owner": {"id": 421}, "organization": {"id": 516}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": null}, "resource": {"id": 381, "owner": {"id": 420}, "organization": {"id": 503}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": null}, "resource": {"id": 359, "owner": {"id": 421}, "organization": {"id": 575}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": null}, "resource": {"id": 326, "owner": {"id": 494}, "organization": {"id": 516}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 333, "owner": {"id": 69}, "organization": {"id": 586}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": 388, "owner": {"id": 70}, "organization": {"id": 112}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 371, "owner": {"id": 53}, "organization": {"id": 559}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 93}, "organization": {"id": 119}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 51}, "organization": {"id": 595}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "owner": {"id": 16}, "organization": {"id": 101}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 317, "owner": {"id": 95}, "organization": {"id": 556}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"id": 372, "owner": {"id": 52}, "organization": {"id": 163}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 305, "owner": {"id": 70}, "organization": {"id": 542}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 327, "owner": {"id": 76}, "organization": {"id": 105}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 308, "owner": {"id": 71}, "organization": {"id": 528}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 61}, "organization": {"id": 146}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 382, "owner": {"id": 18}, "organization": {"id": 522}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 348, "owner": {"id": 46}, "organization": {"id": 106}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 51}, "organization": {"id": 582}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 307, "owner": {"id": 66}, "organization": {"id": 172}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"id": 384, "owner": {"id": 84}, "organization": {"id": 593}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"id": 379, "owner": {"id": 68}, "organization": {"id": 106}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 355, "owner": {"id": 6}, "organization": {"id": 596}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 41}, "organization": {"id": 114}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 35}, "organization": {"id": 556}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 349, "owner": {"id": 32}, "organization": {"id": 132}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 300, "owner": {"id": 45}, "organization": {"id": 588}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 67}, "organization": {"id": 152}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"id": 397, "owner": {"id": 10}, "organization": {"id": 586}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "owner": {"id": 22}, "organization": {"id": 168}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 351, "owner": {"id": 36}, "organization": {"id": 594}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 316, "owner": {"id": 42}, "organization": {"id": 130}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 371, "owner": {"id": 4}, "organization": {"id": 557}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"id": 325, "owner": {"id": 7}, "organization": {"id": 189}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"id": 303, "owner": {"id": 88}, "organization": {"id": 513}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"id": 348, "owner": {"id": 28}, "organization": {"id": 142}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 30}, "organization": {"id": 506}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 329, "owner": {"id": 31}, "organization": {"id": 110}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "owner": {"id": 5}, "organization": {"id": 515}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"id": 335, "owner": {"id": 23}, "organization": {"id": 107}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": 311, "owner": {"id": 27}, "organization": {"id": 578}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 12}, "organization": {"id": 109}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 335, "owner": {"id": 63}, "organization": {"id": 513}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 337, "owner": {"id": 51}, "organization": {"id": 146}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 37}, "user": {"role": "owner"}}}, "resource": {"id": 369, "owner": {"id": 37}, "organization": {"id": 548}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 385, "owner": {"id": 46}, "organization": {"id": 156}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "owner": {"id": 30}, "organization": {"id": 520}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": 370, "owner": {"id": 8}, "organization": {"id": 111}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "owner": {"id": 83}, "organization": {"id": 554}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 346, "owner": {"id": 82}, "organization": {"id": 156}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 335, "owner": {"id": 10}, "organization": {"id": 540}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 92, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": 397, "owner": {"id": 92}, "organization": {"id": 194}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 373, "owner": {"id": 34}, "organization": {"id": 538}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 322, "owner": {"id": 77}, "organization": {"id": 196}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": 301, "owner": {"id": 408}, "organization": {"id": 543}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 409}, "organization": {"id": 110}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 323, "owner": {"id": 483}, "organization": {"id": 511}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 107, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": 373, "owner": {"id": 449}, "organization": {"id": 107}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "owner": {"id": 465}, "organization": {"id": 531}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 307, "owner": {"id": 405}, "organization": {"id": 114}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 362, "owner": {"id": 424}, "organization": {"id": 585}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 338, "owner": {"id": 467}, "organization": {"id": 177}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 389, "owner": {"id": 420}, "organization": {"id": 550}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 319, "owner": {"id": 468}, "organization": {"id": 198}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 306, "owner": {"id": 498}, "organization": {"id": 517}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"id": 345, "owner": {"id": 497}, "organization": {"id": 112}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": 372, "owner": {"id": 492}, "organization": {"id": 503}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": 346, "owner": {"id": 431}, "organization": {"id": 165}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 399, "owner": {"id": 413}, "organization": {"id": 509}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 357, "owner": {"id": 467}, "organization": {"id": 151}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 317, "owner": {"id": 429}, "organization": {"id": 593}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 344, "owner": {"id": 427}, "organization": {"id": 193}, "user": {"num_resources": 9}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 489}, "organization": {"id": 556}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"id": 344, "owner": {"id": 426}, "organization": {"id": 147}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"id": 365, "owner": {"id": 487}, "organization": {"id": 515}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"id": 374, "owner": {"id": 409}, "organization": {"id": 162}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "owner": {"id": 495}, "organization": {"id": 524}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"id": 388, "owner": {"id": 448}, "organization": {"id": 163}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 448}, "organization": {"id": 501}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 356, "owner": {"id": 453}, "organization": {"id": 104}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 419}, "organization": {"id": 569}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 385, "owner": {"id": 419}, "organization": {"id": 194}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 356, "owner": {"id": 489}, "organization": {"id": 516}, "user": {"num_resources": 4}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 319, "owner": {"id": 401}, "organization": {"id": 100}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"id": 314, "owner": {"id": 432}, "organization": {"id": 571}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 420}, "organization": {"id": 130}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"id": 345, "owner": {"id": 466}, "organization": {"id": 554}, "user": {"num_resources": 0}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"id": 335, "owner": {"id": 452}, "organization": {"id": 129}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 413}, "organization": {"id": 549}, "user": {"num_resources": 6}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 361, "owner": {"id": 424}, "organization": {"id": 160}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 325, "owner": {"id": 493}, "organization": {"id": 550}, "user": {"num_resources": 1}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 393, "owner": {"id": 426}, "organization": {"id": 129}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 328, "owner": {"id": 434}, "organization": {"id": 598}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 327, "owner": {"id": 472}, "organization": {"id": 104}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 304, "owner": {"id": 486}, "organization": {"id": 593}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 335, "owner": {"id": 426}, "organization": {"id": 129}, "user": {"num_resources": 7}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 387, "owner": {"id": 477}, "organization": {"id": 571}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 360, "owner": {"id": 419}, "organization": {"id": 119}, "user": {"num_resources": 8}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 345, "owner": {"id": 410}, "organization": {"id": 579}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"id": 316, "owner": {"id": 499}, "organization": {"id": 110}, "user": {"num_resources": 2}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 392, "owner": {"id": 480}, "organization": {"id": 533}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 391, "owner": {"id": 444}, "organization": {"id": 118}, "user": {"num_resources": 5}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 312, "owner": {"id": 454}, "organization": {"id": 501}, "user": {"num_resources": 3}}}
}

test_scope_LIST_CONTENT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "list:content", "auth": {"user": {"id": 42, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"id": 324, "owner": {"id": 428}, "organization": {"id": 168}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": null}, "resource": {"id": 354, "owner": {"id": 59}, "organization": {"id": 578}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": null}, "resource": {"id": 314, "owner": {"id": 59}, "organization": {"id": 544}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": null}, "resource": {"id": 374, "owner": {"id": 88}, "organization": {"id": 571}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": null}, "resource": {"id": 380, "owner": {"id": 29}, "organization": {"id": 574}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": null}, "resource": {"id": 346, "owner": {"id": 98}, "organization": {"id": 594}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": null}, "resource": {"id": 367, "owner": {"id": 453}, "organization": {"id": 551}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": null}, "resource": {"id": 331, "owner": {"id": 434}, "organization": {"id": 512}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": null}, "resource": {"id": 369, "owner": {"id": 449}, "organization": {"id": 536}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": null}, "resource": {"id": 375, "owner": {"id": 461}, "organization": {"id": 556}, "user": {"num_resources": 2}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": null}, "resource": {"id": 303, "owner": {"id": 479}, "organization": {"id": 534}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"id": 351, "owner": {"id": 43}, "organization": {"id": 529}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 371, "owner": {"id": 36}, "organization": {"id": 152}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 372, "owner": {"id": 92}, "organization": {"id": 510}, "user": {"num_resources": 2}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 389, "owner": {"id": 40}, "organization": {"id": 193}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 6}, "organization": {"id": 527}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 324, "owner": {"id": 24}, "organization": {"id": 166}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 373, "owner": {"id": 70}, "organization": {"id": 588}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 337, "owner": {"id": 90}, "organization": {"id": 140}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"id": 377, "owner": {"id": 27}, "organization": {"id": 538}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 352, "owner": {"id": 51}, "organization": {"id": 155}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 6}, "user": {"role": "owner"}}}, "resource": {"id": 310, "owner": {"id": 6}, "organization": {"id": 525}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"id": 338, "owner": {"id": 89}, "organization": {"id": 154}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 189, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 341, "owner": {"id": 80}, "organization": {"id": 567}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 36}, "organization": {"id": 137}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"id": 351, "owner": {"id": 14}, "organization": {"id": 527}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 327, "owner": {"id": 47}, "organization": {"id": 168}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 383, "owner": {"id": 13}, "organization": {"id": 575}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"id": 312, "owner": {"id": 74}, "organization": {"id": 103}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": 313, "owner": {"id": 21}, "organization": {"id": 574}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 317, "owner": {"id": 43}, "organization": {"id": 157}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 388, "owner": {"id": 59}, "organization": {"id": 542}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 74}, "organization": {"id": 148}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 27}, "organization": {"id": 525}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "owner": {"id": 8}, "organization": {"id": 140}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"id": 306, "owner": {"id": 65}, "organization": {"id": 502}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 38}, "organization": {"id": 176}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 328, "owner": {"id": 99}, "organization": {"id": 534}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"id": 329, "owner": {"id": 80}, "organization": {"id": 104}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 310, "owner": {"id": 18}, "organization": {"id": 590}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"id": 376, "owner": {"id": 37}, "organization": {"id": 166}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"id": 325, "owner": {"id": 39}, "organization": {"id": 564}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 6}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 6}, "organization": {"id": 177}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 355, "owner": {"id": 46}, "organization": {"id": 582}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "owner": {"id": 51}, "organization": {"id": 170}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 315, "owner": {"id": 26}, "organization": {"id": 571}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 87}, "organization": {"id": 119}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 366, "owner": {"id": 0}, "organization": {"id": 559}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"id": 352, "owner": {"id": 98}, "organization": {"id": 191}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"id": 359, "owner": {"id": 98}, "organization": {"id": 599}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": 321, "owner": {"id": 18}, "organization": {"id": 159}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 102, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 385, "owner": {"id": 71}, "organization": {"id": 576}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"id": 311, "owner": {"id": 94}, "organization": {"id": 136}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 338, "owner": {"id": 13}, "organization": {"id": 574}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 94}, "organization": {"id": 183}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 357, "owner": {"id": 30}, "organization": {"id": 594}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 320, "owner": {"id": 84}, "organization": {"id": 118}, "user": {"num_resources": 2}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 388, "owner": {"id": 52}, "organization": {"id": 552}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 342, "owner": {"id": 15}, "organization": {"id": 193}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": 309, "owner": {"id": 95}, "organization": {"id": 517}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 79}, "organization": {"id": 198}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"id": 322, "owner": {"id": 460}, "organization": {"id": 549}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"id": 382, "owner": {"id": 405}, "organization": {"id": 146}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 335, "owner": {"id": 496}, "organization": {"id": 547}, "user": {"num_resources": 2}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 378, "owner": {"id": 401}, "organization": {"id": 160}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 320, "owner": {"id": 441}, "organization": {"id": 532}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 371, "owner": {"id": 464}, "organization": {"id": 199}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 345, "owner": {"id": 476}, "organization": {"id": 573}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 374, "owner": {"id": 414}, "organization": {"id": 186}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 315, "owner": {"id": 413}, "organization": {"id": 558}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"id": 369, "owner": {"id": 480}, "organization": {"id": 114}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 333, "owner": {"id": 498}, "organization": {"id": 521}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 398, "owner": {"id": 418}, "organization": {"id": 150}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "owner": {"id": 453}, "organization": {"id": 518}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 334, "owner": {"id": 409}, "organization": {"id": 180}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 303, "owner": {"id": 493}, "organization": {"id": 558}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 371, "owner": {"id": 407}, "organization": {"id": 100}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": 357, "owner": {"id": 472}, "organization": {"id": 508}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 304, "owner": {"id": 472}, "organization": {"id": 129}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 328, "owner": {"id": 439}, "organization": {"id": 519}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"id": 350, "owner": {"id": 474}, "organization": {"id": 103}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 395, "owner": {"id": 446}, "organization": {"id": 547}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"id": 389, "owner": {"id": 432}, "organization": {"id": 109}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 325, "owner": {"id": 436}, "organization": {"id": 577}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 381, "owner": {"id": 413}, "organization": {"id": 126}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 341, "owner": {"id": 493}, "organization": {"id": 549}, "user": {"num_resources": 0}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"id": 384, "owner": {"id": 466}, "organization": {"id": 133}, "user": {"num_resources": 8}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 398, "owner": {"id": 414}, "organization": {"id": 505}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 369, "owner": {"id": 477}, "organization": {"id": 100}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"id": 324, "owner": {"id": 406}, "organization": {"id": 547}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"id": 369, "owner": {"id": 487}, "organization": {"id": 199}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"id": 393, "owner": {"id": 457}, "organization": {"id": 570}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": 351, "owner": {"id": 429}, "organization": {"id": 180}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 319, "owner": {"id": 418}, "organization": {"id": 557}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "owner": {"id": 402}, "organization": {"id": 172}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"id": 321, "owner": {"id": 401}, "organization": {"id": 563}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 333, "owner": {"id": 482}, "organization": {"id": 186}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"id": 371, "owner": {"id": 404}, "organization": {"id": 518}, "user": {"num_resources": 7}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 316, "owner": {"id": 444}, "organization": {"id": 174}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 342, "owner": {"id": 413}, "organization": {"id": 524}, "user": {"num_resources": 2}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 418}, "organization": {"id": 122}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 363, "owner": {"id": 411}, "organization": {"id": 574}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"id": 318, "owner": {"id": 402}, "organization": {"id": 138}, "user": {"num_resources": 9}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 393, "owner": {"id": 411}, "organization": {"id": 559}, "user": {"num_resources": 5}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 379, "owner": {"id": 400}, "organization": {"id": 118}, "user": {"num_resources": 1}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 314, "owner": {"id": 491}, "organization": {"id": 559}, "user": {"num_resources": 2}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 342, "owner": {"id": 453}, "organization": {"id": 197}, "user": {"num_resources": 4}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 364, "owner": {"id": 489}, "organization": {"id": 549}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 305, "owner": {"id": 418}, "organization": {"id": 109}, "user": {"num_resources": 3}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"id": 324, "owner": {"id": 467}, "organization": {"id": 559}, "user": {"num_resources": 6}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"id": 393, "owner": {"id": 466}, "organization": {"id": 144}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": null}, "resource": {"id": 347, "owner": {"id": 0}, "organization": {"id": 558}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": null}, "resource": {"id": 388, "owner": {"id": 88}, "organization": {"id": 551}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"id": 316, "owner": {"id": 44}, "organization": {"id": 520}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"id": 355, "owner": {"id": 28}, "organization": {"id": 512}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": null}, "resource": {"id": 398, "owner": {"id": 8}, "organization": {"id": 596}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": null}, "resource": {"id": 304, "owner": {"id": 499}, "organization": {"id": 587}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": null}, "resource": {"id": 337, "owner": {"id": 459}, "organization": {"id": 503}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": null}, "resource": {"id": 346, "owner": {"id": 485}, "organization": {"id": 532}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": null}, "resource": {"id": 353, "owner": {"id": 418}, "organization": {"id": 513}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"id": 387, "owner": {"id": 428}, "organization": {"id": 552}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"id": 338, "owner": {"id": 48}, "organization": {"id": 507}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 53}, "organization": {"id": 180}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 361, "owner": {"id": 10}, "organization": {"id": 599}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 333, "owner": {"id": 25}, "organization": {"id": 190}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 55}, "organization": {"id": 576}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 351, "owner": {"id": 75}, "organization": {"id": 123}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 15}, "organization": {"id": 579}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"id": 386, "owner": {"id": 3}, "organization": {"id": 128}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": 381, "owner": {"id": 55}, "organization": {"id": 532}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"id": 399, "owner": {"id": 12}, "organization": {"id": 193}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 75}, "organization": {"id": 524}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 352, "owner": {"id": 36}, "organization": {"id": 125}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 313, "owner": {"id": 64}, "organization": {"id": 594}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 327, "owner": {"id": 25}, "organization": {"id": 110}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 240}, "user": {"role": "supervisor"}}}, "resource": {"id": 339, "owner": {"id": 57}, "organization": {"id": 569}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 375, "owner": {"id": 42}, "organization": {"id": 128}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": 358, "owner": {"id": 83}, "organization": {"id": 575}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 391, "owner": {"id": 27}, "organization": {"id": 166}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"id": 358, "owner": {"id": 59}, "organization": {"id": 544}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 308, "owner": {"id": 18}, "organization": {"id": 113}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 303, "owner": {"id": 14}, "organization": {"id": 570}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 42}, "user": {"role": "owner"}}}, "resource": {"id": 380, "owner": {"id": 42}, "organization": {"id": 160}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 306, "owner": {"id": 28}, "organization": {"id": 568}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 348, "owner": {"id": 21}, "organization": {"id": 171}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 384, "owner": {"id": 13}, "organization": {"id": 572}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"id": 321, "owner": {"id": 78}, "organization": {"id": 103}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 308, "owner": {"id": 75}, "organization": {"id": 568}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"id": 384, "owner": {"id": 97}, "organization": {"id": 141}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 383, "owner": {"id": 72}, "organization": {"id": 589}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 390, "owner": {"id": 51}, "organization": {"id": 176}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"id": 371, "owner": {"id": 54}, "organization": {"id": 567}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"id": 358, "owner": {"id": 65}, "organization": {"id": 101}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 392, "owner": {"id": 48}, "organization": {"id": 514}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 365, "owner": {"id": 58}, "organization": {"id": 177}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 40}, "organization": {"id": 552}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 337, "owner": {"id": 7}, "organization": {"id": 151}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 336, "owner": {"id": 21}, "organization": {"id": 585}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": 355, "owner": {"id": 32}, "organization": {"id": 156}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"id": 347, "owner": {"id": 62}, "organization": {"id": 594}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 392, "owner": {"id": 96}, "organization": {"id": 149}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 29}, "user": {"role": "owner"}}}, "resource": {"id": 315, "owner": {"id": 29}, "organization": {"id": 547}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"id": 364, "owner": {"id": 54}, "organization": {"id": 151}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": 318, "owner": {"id": 48}, "organization": {"id": 518}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 369, "owner": {"id": 88}, "organization": {"id": 177}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": 358, "owner": {"id": 86}, "organization": {"id": 591}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "owner": {"id": 21}, "organization": {"id": 169}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 344, "owner": {"id": 58}, "organization": {"id": 522}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 399, "owner": {"id": 39}, "organization": {"id": 138}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": 364, "owner": {"id": 39}, "organization": {"id": 516}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 330, "owner": {"id": 8}, "organization": {"id": 105}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 470}, "organization": {"id": 530}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"id": 306, "owner": {"id": 411}, "organization": {"id": 186}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "owner": {"id": 415}, "organization": {"id": 532}, "user": {"num_resources": 7}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": 397, "owner": {"id": 407}, "organization": {"id": 147}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 434}, "organization": {"id": 539}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 368, "owner": {"id": 492}, "organization": {"id": 121}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"id": 359, "owner": {"id": 417}, "organization": {"id": 503}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 381, "owner": {"id": 493}, "organization": {"id": 157}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"id": 347, "owner": {"id": 456}, "organization": {"id": 596}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 361, "owner": {"id": 448}, "organization": {"id": 157}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 312, "owner": {"id": 489}, "organization": {"id": 541}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"id": 396, "owner": {"id": 400}, "organization": {"id": 133}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 330, "owner": {"id": 499}, "organization": {"id": 559}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 309, "owner": {"id": 489}, "organization": {"id": 183}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": 329, "owner": {"id": 499}, "organization": {"id": 598}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 332, "owner": {"id": 433}, "organization": {"id": 107}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 302, "owner": {"id": 420}, "organization": {"id": 519}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 308, "owner": {"id": 449}, "organization": {"id": 113}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": 384, "owner": {"id": 492}, "organization": {"id": 543}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"id": 327, "owner": {"id": 494}, "organization": {"id": 140}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"id": 352, "owner": {"id": 457}, "organization": {"id": 570}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 379, "owner": {"id": 409}, "organization": {"id": 116}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 307, "owner": {"id": 482}, "organization": {"id": 526}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "create", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 311, "owner": {"id": 430}, "organization": {"id": 183}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"id": 309, "owner": {"id": 416}, "organization": {"id": 509}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": 398, "owner": {"id": 490}, "organization": {"id": 196}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 362, "owner": {"id": 402}, "organization": {"id": 555}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 386, "owner": {"id": 451}, "organization": {"id": 179}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 364, "owner": {"id": 453}, "organization": {"id": 524}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"id": 301, "owner": {"id": 405}, "organization": {"id": 180}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"id": 384, "owner": {"id": 430}, "organization": {"id": 523}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 365, "owner": {"id": 406}, "organization": {"id": 155}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 328, "owner": {"id": 472}, "organization": {"id": 599}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 100, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "owner": {"id": 489}, "organization": {"id": 100}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 460}, "organization": {"id": 503}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": 386, "owner": {"id": 495}, "organization": {"id": 120}, "user": {"num_resources": 5}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 331, "owner": {"id": 426}, "organization": {"id": 585}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"id": 311, "owner": {"id": 437}, "organization": {"id": 193}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 302, "owner": {"id": 469}, "organization": {"id": 535}, "user": {"num_resources": 0}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 244}, "user": {"role": null}}}, "resource": {"id": 351, "owner": {"id": 402}, "organization": {"id": 147}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"id": 344, "owner": {"id": 451}, "organization": {"id": 505}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"id": 361, "owner": {"id": 480}, "organization": {"id": 162}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 347, "owner": {"id": 448}, "organization": {"id": 509}, "user": {"num_resources": 8}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 396, "owner": {"id": 455}, "organization": {"id": 190}, "user": {"num_resources": 4}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"id": 343, "owner": {"id": 495}, "organization": {"id": 516}, "user": {"num_resources": 9}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"id": 359, "owner": {"id": 490}, "organization": {"id": 185}, "user": {"num_resources": 2}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 362, "owner": {"id": 465}, "organization": {"id": 566}, "user": {"num_resources": 6}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 334, "owner": {"id": 451}, "organization": {"id": 186}, "user": {"num_resources": 3}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"id": 385, "owner": {"id": 439}, "organization": {"id": 545}, "user": {"num_resources": 1}}}
}

test_scope_CREATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "create", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": 348, "owner": {"id": 483}, "organization": {"id": 136}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": null}, "resource": {"id": 327, "owner": {"id": 17}, "organization": {"id": 518}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": null}, "resource": {"id": 341, "owner": {"id": 72}, "organization": {"id": 570}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": null}, "resource": {"id": 303, "owner": {"id": 56}, "organization": {"id": 516}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": null}, "resource": {"id": 331, "owner": {"id": 95}, "organization": {"id": 527}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"id": 352, "owner": {"id": 91}, "organization": {"id": 557}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": null}, "resource": {"id": 365, "owner": {"id": 473}, "organization": {"id": 522}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": null}, "resource": {"id": 334, "owner": {"id": 450}, "organization": {"id": 549}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": null}, "resource": {"id": 339, "owner": {"id": 452}, "organization": {"id": 555}, "user": {"num_resources": 8}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": null}, "resource": {"id": 304, "owner": {"id": 485}, "organization": {"id": 591}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": null}, "resource": {"id": 380, "owner": {"id": 439}, "organization": {"id": 591}, "user": {"num_resources": 8}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"id": 318, "owner": {"id": 89}, "organization": {"id": 545}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"id": 316, "owner": {"id": 67}, "organization": {"id": 139}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 363, "owner": {"id": 15}, "organization": {"id": 526}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"id": 332, "owner": {"id": 29}, "organization": {"id": 121}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 313, "owner": {"id": 17}, "organization": {"id": 534}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 375, "owner": {"id": 67}, "organization": {"id": 108}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": 388, "owner": {"id": 89}, "organization": {"id": 579}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"id": 388, "owner": {"id": 61}, "organization": {"id": 110}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"id": 337, "owner": {"id": 76}, "organization": {"id": 563}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 272}, "user": {"role": null}}}, "resource": {"id": 379, "owner": {"id": 45}, "organization": {"id": 157}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": 350, "owner": {"id": 83}, "organization": {"id": 519}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"id": 317, "owner": {"id": 15}, "organization": {"id": 140}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 345, "owner": {"id": 96}, "organization": {"id": 544}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"id": 398, "owner": {"id": 70}, "organization": {"id": 127}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 307, "owner": {"id": 58}, "organization": {"id": 570}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 390, "owner": {"id": 76}, "organization": {"id": 175}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 352, "owner": {"id": 42}, "organization": {"id": 557}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 396, "owner": {"id": 41}, "organization": {"id": 164}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 75}, "organization": {"id": 574}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 343, "owner": {"id": 63}, "organization": {"id": 191}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 76}, "organization": {"id": 521}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"id": 361, "owner": {"id": 5}, "organization": {"id": 129}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "owner": {"id": 19}, "organization": {"id": 527}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": 359, "owner": {"id": 46}, "organization": {"id": 192}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 348, "owner": {"id": 52}, "organization": {"id": 525}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 337, "owner": {"id": 11}, "organization": {"id": 176}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 352, "owner": {"id": 36}, "organization": {"id": 582}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 320, "owner": {"id": 69}, "organization": {"id": 135}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 294}, "user": {"role": null}}}, "resource": {"id": 309, "owner": {"id": 77}, "organization": {"id": 507}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 377, "owner": {"id": 33}, "organization": {"id": 120}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 300, "owner": {"id": 0}, "organization": {"id": 552}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"id": 340, "owner": {"id": 38}, "organization": {"id": 176}, "user": {"num_resources": 8}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 366, "owner": {"id": 70}, "organization": {"id": 594}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 345, "owner": {"id": 22}, "organization": {"id": 136}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 332, "owner": {"id": 35}, "organization": {"id": 549}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 381, "owner": {"id": 54}, "organization": {"id": 137}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"id": 318, "owner": {"id": 72}, "organization": {"id": 564}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"id": 364, "owner": {"id": 6}, "organization": {"id": 190}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"id": 301, "owner": {"id": 21}, "organization": {"id": 566}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 381, "owner": {"id": 81}, "organization": {"id": 106}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"id": 353, "owner": {"id": 72}, "organization": {"id": 506}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"id": 341, "owner": {"id": 74}, "organization": {"id": 106}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"id": 394, "owner": {"id": 68}, "organization": {"id": 535}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"id": 335, "owner": {"id": 29}, "organization": {"id": 117}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": 300, "owner": {"id": 43}, "organization": {"id": 560}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"id": 383, "owner": {"id": 58}, "organization": {"id": 121}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 394, "owner": {"id": 32}, "organization": {"id": 525}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 361, "owner": {"id": 88}, "organization": {"id": 163}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 365, "owner": {"id": 63}, "organization": {"id": 591}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 151, "owner": {"id": 231}, "user": {"role": null}}}, "resource": {"id": 336, "owner": {"id": 84}, "organization": {"id": 151}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 399, "owner": {"id": 458}, "organization": {"id": 542}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": 370, "owner": {"id": 484}, "organization": {"id": 108}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 384, "owner": {"id": 457}, "organization": {"id": 535}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 337, "owner": {"id": 408}, "organization": {"id": 199}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 117, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": 347, "owner": {"id": 470}, "organization": {"id": 503}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 304, "owner": {"id": 489}, "organization": {"id": 175}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 349, "owner": {"id": 418}, "organization": {"id": 516}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "admin"}, "organization": {"id": 164, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 333, "owner": {"id": 424}, "organization": {"id": 164}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 303, "owner": {"id": 443}, "organization": {"id": 588}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 340, "owner": {"id": 426}, "organization": {"id": 160}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"id": 379, "owner": {"id": 472}, "organization": {"id": 527}, "user": {"num_resources": 8}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 358, "owner": {"id": 427}, "organization": {"id": 103}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 305, "owner": {"id": 446}, "organization": {"id": 597}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": 359, "owner": {"id": 417}, "organization": {"id": 106}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 384, "owner": {"id": 463}, "organization": {"id": 569}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"id": 392, "owner": {"id": 477}, "organization": {"id": 121}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 450}, "organization": {"id": 538}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 164, "owner": {"id": 231}, "user": {"role": "worker"}}}, "resource": {"id": 349, "owner": {"id": 443}, "organization": {"id": 164}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 354, "owner": {"id": 419}, "organization": {"id": 561}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"id": 369, "owner": {"id": 447}, "organization": {"id": 133}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": 360, "owner": {"id": 466}, "organization": {"id": 570}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"id": 375, "owner": {"id": 448}, "organization": {"id": 109}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 269}, "user": {"role": "maintainer"}}}, "resource": {"id": 320, "owner": {"id": 451}, "organization": {"id": 508}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "owner": {"id": 430}, "organization": {"id": 121}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 365, "owner": {"id": 448}, "organization": {"id": 582}, "user": {"num_resources": 6}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 305, "owner": {"id": 496}, "organization": {"id": 129}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 174, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"id": 330, "owner": {"id": 417}, "organization": {"id": 598}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 300, "owner": {"id": 409}, "organization": {"id": 127}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 316, "owner": {"id": 468}, "organization": {"id": 598}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 384, "owner": {"id": 456}, "organization": {"id": 182}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 316, "owner": {"id": 483}, "organization": {"id": 517}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"id": 336, "owner": {"id": 489}, "organization": {"id": 117}, "user": {"num_resources": 5}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 380, "owner": {"id": 403}, "organization": {"id": 511}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 392, "owner": {"id": 434}, "organization": {"id": 146}, "user": {"num_resources": 4}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": 391, "owner": {"id": 416}, "organization": {"id": 541}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 496}, "organization": {"id": 104}, "user": {"num_resources": 8}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": 393, "owner": {"id": 497}, "organization": {"id": 531}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 327, "owner": {"id": 467}, "organization": {"id": 155}, "user": {"num_resources": 3}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"id": 353, "owner": {"id": 417}, "organization": {"id": 539}, "user": {"num_resources": 8}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 315, "owner": {"id": 429}, "organization": {"id": 162}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 361, "owner": {"id": 408}, "organization": {"id": 531}, "user": {"num_resources": 1}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"id": 329, "owner": {"id": 447}, "organization": {"id": 137}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": 368, "owner": {"id": 433}, "organization": {"id": 589}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 150, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"id": 340, "owner": {"id": 419}, "organization": {"id": 150}, "user": {"num_resources": 9}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"id": 392, "owner": {"id": 495}, "organization": {"id": 525}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 399, "owner": {"id": 421}, "organization": {"id": 143}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"id": 302, "owner": {"id": 468}, "organization": {"id": 505}, "user": {"num_resources": 2}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 376, "owner": {"id": 424}, "organization": {"id": 141}, "user": {"num_resources": 0}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 318, "owner": {"id": 456}, "organization": {"id": 588}, "user": {"num_resources": 7}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"id": 330, "owner": {"id": 485}, "organization": {"id": 141}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": null}, "resource": {"id": 311, "owner": {"id": 89}, "organization": {"id": 593}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": null}, "resource": {"id": 330, "owner": {"id": 7}, "organization": {"id": 537}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": null}, "resource": {"id": 382, "owner": {"id": 86}, "organization": {"id": 509}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": null}, "resource": {"id": 377, "owner": {"id": 59}, "organization": {"id": 512}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": null}, "resource": {"id": 354, "owner": {"id": 81}, "organization": {"id": 550}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": null}, "resource": {"id": 320, "owner": {"id": 463}, "organization": {"id": 576}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": null}, "resource": {"id": 388, "owner": {"id": 405}, "organization": {"id": 537}, "user": {"num_resources": 6}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": null}, "resource": {"id": 368, "owner": {"id": 411}, "organization": {"id": 505}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": null}, "resource": {"id": 310, "owner": {"id": 479}, "organization": {"id": 561}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": null}, "resource": {"id": 338, "owner": {"id": 414}, "organization": {"id": 582}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 52}, "user": {"role": "owner"}}}, "resource": {"id": 389, "owner": {"id": 52}, "organization": {"id": 574}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"id": 381, "owner": {"id": 45}, "organization": {"id": 182}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"id": 391, "owner": {"id": 93}, "organization": {"id": 534}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"id": 369, "owner": {"id": 40}, "organization": {"id": 155}, "user": {"num_resources": 2}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 324, "owner": {"id": 53}, "organization": {"id": 500}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": 380, "owner": {"id": 7}, "organization": {"id": 182}, "user": {"num_resources": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 32}, "organization": {"id": 597}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"id": 361, "owner": {"id": 82}, "organization": {"id": 170}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 346, "owner": {"id": 87}, "organization": {"id": 522}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 374, "owner": {"id": 16}, "organization": {"id": 139}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 64}, "user": {"role": "owner"}}}, "resource": {"id": 397, "owner": {"id": 64}, "organization": {"id": 577}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"id": 357, "owner": {"id": 34}, "organization": {"id": 195}, "user": {"num_resources": 2}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 345, "owner": {"id": 34}, "organization": {"id": 591}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 109, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 304, "owner": {"id": 71}, "organization": {"id": 109}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 383, "owner": {"id": 28}, "organization": {"id": 529}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 7}, "organization": {"id": 169}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 209}, "user": {"role": "worker"}}}, "resource": {"id": 384, "owner": {"id": 10}, "organization": {"id": 545}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 344, "owner": {"id": 30}, "organization": {"id": 115}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 332, "owner": {"id": 32}, "organization": {"id": 572}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 302, "owner": {"id": 38}, "organization": {"id": 127}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"id": 347, "owner": {"id": 93}, "organization": {"id": 502}, "user": {"num_resources": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 34}, "organization": {"id": 148}, "user": {"num_resources": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 357, "owner": {"id": 85}, "organization": {"id": 521}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": 380, "owner": {"id": 46}, "organization": {"id": 131}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 340, "owner": {"id": 72}, "organization": {"id": 510}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 43}, "organization": {"id": 176}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"id": 382, "owner": {"id": 64}, "organization": {"id": 583}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"id": 321, "owner": {"id": 10}, "organization": {"id": 161}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 303, "owner": {"id": 33}, "organization": {"id": 569}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 350, "owner": {"id": 80}, "organization": {"id": 106}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 374, "owner": {"id": 7}, "organization": {"id": 574}, "user": {"num_resources": 2}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 312, "owner": {"id": 55}, "organization": {"id": 122}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 395, "owner": {"id": 58}, "organization": {"id": 593}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 343, "owner": {"id": 7}, "organization": {"id": 119}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": 341, "owner": {"id": 1}, "organization": {"id": 525}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": 360, "owner": {"id": 23}, "organization": {"id": 116}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"id": 329, "owner": {"id": 6}, "organization": {"id": 524}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"id": 368, "owner": {"id": 47}, "organization": {"id": 117}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"id": 318, "owner": {"id": 52}, "organization": {"id": 587}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"id": 329, "owner": {"id": 7}, "organization": {"id": 175}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"id": 343, "owner": {"id": 27}, "organization": {"id": 561}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 26}, "user": {"role": "owner"}}}, "resource": {"id": 317, "owner": {"id": 26}, "organization": {"id": 137}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 323, "owner": {"id": 83}, "organization": {"id": 541}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 309, "owner": {"id": 54}, "organization": {"id": 131}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 379, "owner": {"id": 47}, "organization": {"id": 592}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 338, "owner": {"id": 39}, "organization": {"id": 104}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 324, "owner": {"id": 44}, "organization": {"id": 515}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 337, "owner": {"id": 91}, "organization": {"id": 126}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 325, "owner": {"id": 89}, "organization": {"id": 520}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"id": 301, "owner": {"id": 29}, "organization": {"id": 135}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"id": 376, "owner": {"id": 435}, "organization": {"id": 571}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 378, "owner": {"id": 409}, "organization": {"id": 142}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 392, "owner": {"id": 431}, "organization": {"id": 551}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"id": 342, "owner": {"id": 441}, "organization": {"id": 197}, "user": {"num_resources": 2}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"id": 395, "owner": {"id": 476}, "organization": {"id": 583}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 169, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 332, "owner": {"id": 476}, "organization": {"id": 169}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"id": 395, "owner": {"id": 479}, "organization": {"id": 527}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 449}, "organization": {"id": 157}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": 326, "owner": {"id": 462}, "organization": {"id": 508}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 253}, "user": {"role": null}}}, "resource": {"id": 337, "owner": {"id": 450}, "organization": {"id": 142}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"id": 392, "owner": {"id": 490}, "organization": {"id": 568}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"id": 376, "owner": {"id": 436}, "organization": {"id": 193}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": 374, "owner": {"id": 414}, "organization": {"id": 573}, "user": {"num_resources": 2}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 363, "owner": {"id": 453}, "organization": {"id": 180}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 383, "owner": {"id": 450}, "organization": {"id": 584}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 387, "owner": {"id": 426}, "organization": {"id": 111}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 308, "owner": {"id": 431}, "organization": {"id": 544}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": 359, "owner": {"id": 447}, "organization": {"id": 199}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 140, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"id": 316, "owner": {"id": 439}, "organization": {"id": 544}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"id": 342, "owner": {"id": 444}, "organization": {"id": 174}, "user": {"num_resources": 2}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": 394, "owner": {"id": 484}, "organization": {"id": 596}, "user": {"num_resources": 8}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 383, "owner": {"id": 461}, "organization": {"id": 173}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"id": 330, "owner": {"id": 406}, "organization": {"id": 529}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"id": 300, "owner": {"id": 420}, "organization": {"id": 173}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": 394, "owner": {"id": 479}, "organization": {"id": 599}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 308, "owner": {"id": 407}, "organization": {"id": 135}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 303, "owner": {"id": 409}, "organization": {"id": 589}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": 303, "owner": {"id": 443}, "organization": {"id": 103}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 194, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 318, "owner": {"id": 484}, "organization": {"id": 581}, "user": {"num_resources": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 349, "owner": {"id": 408}, "organization": {"id": 196}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"id": 393, "owner": {"id": 452}, "organization": {"id": 566}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": 390, "owner": {"id": 430}, "organization": {"id": 193}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"id": 354, "owner": {"id": 481}, "organization": {"id": 556}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 375, "owner": {"id": 400}, "organization": {"id": 182}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"id": 305, "owner": {"id": 452}, "organization": {"id": 505}, "user": {"num_resources": 0}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 322, "owner": {"id": 472}, "organization": {"id": 188}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 351, "owner": {"id": 443}, "organization": {"id": 597}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 308, "owner": {"id": 407}, "organization": {"id": 122}, "user": {"num_resources": 5}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"id": 370, "owner": {"id": 496}, "organization": {"id": 515}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 306, "owner": {"id": 437}, "organization": {"id": 190}, "user": {"num_resources": 6}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": 327, "owner": {"id": 492}, "organization": {"id": 504}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 391, "owner": {"id": 433}, "organization": {"id": 198}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"id": 362, "owner": {"id": 423}, "organization": {"id": 514}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 350, "owner": {"id": 490}, "organization": {"id": 118}, "user": {"num_resources": 9}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 349, "owner": {"id": 408}, "organization": {"id": 511}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 389, "owner": {"id": 464}, "organization": {"id": 184}, "user": {"num_resources": 1}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 399, "owner": {"id": 431}, "organization": {"id": 579}, "user": {"num_resources": 4}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 360, "owner": {"id": 417}, "organization": {"id": 175}, "user": {"num_resources": 3}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 351, "owner": {"id": 495}, "organization": {"id": 536}, "user": {"num_resources": 7}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"id": 304, "owner": {"id": 462}, "organization": {"id": 171}, "user": {"num_resources": 7}}}
}



# cloudstorages_test.gen.rego.py
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
# NAME = 'cloudstorages'
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
# OWNERSHIPS = ['owner', 'none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
# SAME_ORG = [False, True]
#
# def RESOURCES(scope):
#     if scope == 'list':
#         return [None]
#     else:
#         return [{
#             "id": random.randrange(300, 400),
#             "owner": { "id": random.randrange(400, 500) },
#             "organization": {
#                 "id": random.randrange(500,600)
#             },
#             "user": {
#                 "num_resources": random.randrange(10)
#             }
#         }]
#
# def is_same_org(org1, org2):
#     if org1 != None and org2 != None:
#         return org1['id'] == org2['id']
#     elif org1 == None and org2 == None:
#         return True
#     else:
#         return False
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
#     if not is_same_org(data['auth']['organization'], data['resource']['organization']) and context != 'sandbox':
#         return False
#
#     return bool(rules)
#
# def get_data(scope, context, ownership, privilege, membership, resource, same_org):
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
#         org_id = data['auth']['organization']['id']
#         if data['auth']['organization']['user']['role'] == 'owner':
#             data['auth']['organization']['owner']['id'] = user_id
#
#         if same_org:
#             data['resource']['organization']['id'] = org_id
#
#     if ownership == 'owner':
#         data['resource']['owner']['id'] = user_id
#
#     return data
#
# def _get_name(prefix, **kwargs):
#     name = prefix
#     for k,v in kwargs.items():
#         prefix = '_' + str(k)
#         if isinstance(v, dict):
#             if 'id' not in v:
#                 name += _get_name(prefix, **v)
#         else:
#             name += f'{prefix}_{str(v).upper().replace(":", "_")}'
#
#     return name
#
# def get_name(scope, context, ownership, privilege, membership, resource, same_org):
#     return _get_name('test', **locals())
#
# def is_valid(scope, context, ownership, privilege, membership, resource, same_org):
#     if context == "sandbox" and membership:
#         return False
#     if scope == 'list' and ownership != 'None':
#         return False
#     if context == 'sandbox' and same_org == False:
#         return False
#
#     return True
#
# def gen_test_rego(name):
#     with open(f'{name}_test.gen.rego', 'wt') as f:
#         f.write(f'package {name}\n\n')
#         for scope, context, ownership, privilege, membership, same_org in product(
#             SCOPES, CONTEXTS, OWNERSHIPS, GROUPS, ORG_ROLES, SAME_ORG):
#             for resource in RESOURCES(scope):
#                 if not is_valid(scope, context, ownership, privilege, membership, resource, same_org):
#                     continue
#
#                 data = get_data(scope, context, ownership, privilege, membership, resource, same_org)
#                 test_name = get_name(scope, context, ownership, privilege, membership, resource, same_org)
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

# cloudstorages.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# create,Storage,Sandbox,N/A,,POST,/cloudstorages,User,N/A
# create,Storage,Organization,N/A,,POST,/cloudstorages,User,Maintainer
# list,Storage,Sandbox,N/A,,GET,/cloudstorages,None,N/A
# list,Storage,Organization,N/A,,GET,/cloudstorages,None,Worker
# view,Storage,Sandbox,None,,GET,"/cloudstorages/{id}, /cloudstorages/{id}/preview, /cloudstorages/{id}/status",Admin,N/A
# view,Storage,Sandbox,Owner,,GET,"/cloudstorages/{id}, /cloudstorages/{id}/preview, /cloudstorages/{id}/status",None,N/A
# view,Storage,Organization,Owner,,GET,"/cloudstorages/{id}, /cloudstorages/{id}/preview, /cloudstorages/{id}/status",None,Worker
# view,Storage,Organization,None,,GET,/cloudstorages/{id},User,Supervisor
# update,Storage,Sandbox,None,,PATCH,/cloudstorages/{id},Admin,N/A
# update,Storage,Sandbox,Owner,,PATCH,/cloudstorages/{id},Worker,N/A
# update,Storage,Organization,Owner,,PATCH,/cloudstorages/{id},Worker,Worker
# update,Storage,Organization,None,,PATCH,/cloudstorages/{id},User,Maintainer
# delete,Storage,Sandbox,None,,DELETE,/cloudstorages/{id},Admin,N/A
# delete,Storage,Sandbox,Owner,,DELETE,/cloudstorages/{id},Worker,N/A
# delete,Storage,Organization,Owner,,DELETE,/cloudstorages/{id},Worker,Worker
# delete,Storage,Organization,None,,DELETE,/cloudstorages/{id},User,Maintainer
# list:content,Storage,Sandbox,None,,GET,/cloudstorages/{id}/content,Admin,N/A
# list:content,Storage,Sandbox,Owner,,GET,/cloudstorages/{id}/content,None,N/A
# list:content,Storage,Organization,Owner,,GET,/cloudstorages/{id}/content,None,Worker
# list:content,Storage,Organization,None,,GET,/cloudstorages/{id}/content,User,Supervisor