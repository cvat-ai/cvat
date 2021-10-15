package memberships

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 20}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 20}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 77}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 32}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 17}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 72}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 53}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 84}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 43}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"user": {"id": 51}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"user": {"id": 23}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 396}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 381}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 399}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 327}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 367}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 386}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 375}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 379}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"id": 316}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"id": 382}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 87}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 91}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 9}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 54}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 95}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 54}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 6}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 232}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 58}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"user": {"id": 65}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"user": {"id": 50}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 308}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 397}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 314}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 331}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 300}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 321}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 321}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 368}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"id": 377}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"user": {"id": 305}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 96}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 34}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 95}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 32}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 68}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 14}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 37}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 38}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"user": {"id": 12}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"user": {"id": 5}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 301}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 349}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 361}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 322}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 313}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 317}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 314}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 332}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"user": {"id": 308}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"user": {"id": 305}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 0}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 35}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 4}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 62}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 27}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 53}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 22}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 74}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"user": {"id": 24}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"user": {"id": 38}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 345}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 305}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 192, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 315}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 383}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 331}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 331}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 312}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 348}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"user": {"id": 394}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"user": {"id": 353}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 25}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 20}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 20}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 43}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 74}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 0}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 21}, "role": "supervisor", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 47}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 86}, "role": "worker", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"user": {"id": 21}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 103, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"user": {"id": 41}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 371}, "role": "maintainer", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 392}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 392}, "role": "supervisor", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 390}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 332}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 320}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 328}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 354}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 8, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"id": 361}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"user": {"id": 342}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 38}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 93}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 372}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "change:role", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 383}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 99}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 60}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 346}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 382}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 49}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 70}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 367}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 302}, "role": "maintainer", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 56}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 61}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 335}, "role": "owner", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 368}, "role": "owner", "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 21}, "role": null, "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 62}, "role": null, "is_active": true}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 368}, "role": "worker", "is_active": false}}
}

test_scope_CHANGE_ROLE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "change:role", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 318}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 86}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 99}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 2}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 24}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 96}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 72}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 37}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 11}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"id": 65}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"user": {"id": 46}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 357}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 333}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 395}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 363}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 360}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 322}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 175, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 354}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 383}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"id": 392}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"user": {"id": 321}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 99}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 99}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 61}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 27}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 35}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 83}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 55}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 71}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 46}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"user": {"id": 14}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"user": {"id": 15}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 344}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 329}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 334}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 383}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 346}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 350}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 393}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 386}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"user": {"id": 371}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"user": {"id": 394}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 96}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 39}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 65}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 108, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 62}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 33}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 77}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 79}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 36}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"id": 25}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"user": {"id": 60}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 322}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 324}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 369}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 360}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 393}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 385}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 254}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 356}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 312}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"user": {"id": 301}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"user": {"id": 381}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 97}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 37}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 37}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 96}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 84}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 60}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 17}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 37}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 3}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"user": {"id": 79}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"user": {"id": 97}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 350}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 304}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 377}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 328}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 301}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 139, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 393}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 394}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 156, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 318}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"user": {"id": 354}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"user": {"id": 359}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 76}, "role": "owner", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 87}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 67}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 93}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 55}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 74}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 50}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 62}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"user": {"id": 81}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"user": {"id": 10}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 340}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 364}, "role": "supervisor", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 381}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 309}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 315}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 311}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 344}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 104, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 309}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"user": {"id": 315}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"user": {"id": 358}, "role": "maintainer", "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 98}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 64}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 353}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 341}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 81}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 69}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 321}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 305}, "role": "owner", "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 21}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 47}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 379}, "role": "maintainer", "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 384}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 18}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 15}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 338}, "role": "worker", "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 373}, "role": "worker", "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 85}, "role": null, "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 76}, "role": null, "is_active": true}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 344}, "role": "supervisor", "is_active": false}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 353}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 51}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 62}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 3}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 46}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 84}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 97}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 3}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 27}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"user": {"id": 60}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"user": {"id": 30}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 315}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 6}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 326}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 316}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 382}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 330}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 248}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 349}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 346}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 353}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"id": 317}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"user": {"id": 302}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 89}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 35}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 51}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 146, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 68}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 56}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 6}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 294}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 83}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 11}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"id": 37}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"user": {"id": 6}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 365}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 392}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 399}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 389}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 352}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 369}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 352}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 336}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"user": {"id": 320}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 245}, "user": {"role": null}}}, "resource": {"user": {"id": 370}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 30}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 74}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 53}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 94}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 69}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 95}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 80}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 32}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 116, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"user": {"id": 46}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"user": {"id": 49}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 331}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 353}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 316}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 376}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 381}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 298}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 342}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 367}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 348}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"user": {"id": 359}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"user": {"id": 322}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 43}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 33}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "worker"}, "organization": {"id": 174, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 46}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 86}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 11}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 93}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 97}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 83}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"user": {"id": 73}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"user": {"id": 56}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 328}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 382}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 358}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 116, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 334}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 399}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 336}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 340}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 129, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 330}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"user": {"id": 396}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"id": 363}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 27}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 51}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 51}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 233}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 67}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 69}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 68}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 11}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 52}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 73}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"user": {"id": 94}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 294}, "user": {"role": null}}}, "resource": {"user": {"id": 40}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 356}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 347}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 342}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 315}, "role": "supervisor", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 320}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 312}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 346}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 331}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"id": 376}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"user": {"id": 377}, "role": "worker", "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 58}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 84}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 382}, "role": "worker", "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 393}, "role": "owner", "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 37}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 93}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 316}, "role": "owner", "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 317}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 98}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 10}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 320}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 322}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 78}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 84}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 335}, "role": "maintainer", "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 320}, "role": "maintainer", "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 62}, "role": null, "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 95}, "role": null, "is_active": true}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 397}, "role": "supervisor", "is_active": false}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 344}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 97}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 63}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 42}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 16}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 7}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 49}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 11}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 52}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"user": {"id": 53}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"user": {"id": 54}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 324}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 321}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 302}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 273}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 337}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 214}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 334}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 341}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 392}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 332}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"user": {"id": 325}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"user": {"id": 378}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 35}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 59}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 100, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 25}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 42}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 19}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 93}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 97}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 56}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 212}, "user": {"role": null}}}, "resource": {"user": {"id": 23}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 225}, "user": {"role": null}}}, "resource": {"user": {"id": 64}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 369}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 304}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 342}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 221}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 301}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 380}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 352}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 398}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 58, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 313}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"user": {"id": 327}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"user": {"id": 375}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 35}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 41}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 96}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 75, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 75}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 65}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 33}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 33}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 36}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"user": {"id": 10}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 87, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"user": {"id": 87}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 306}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 184, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 390}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 315}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 345}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 314}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 150, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 384}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 394}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 341}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 253}, "user": {"role": null}}}, "resource": {"user": {"id": 384}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 294}, "user": {"role": null}}}, "resource": {"user": {"id": 301}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 84}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 83}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 97}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 85}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 1}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 83}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 10}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 38}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"user": {"id": 90}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"user": {"id": 89}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 370}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 385}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 340}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 331}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 210}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 309}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 33, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 313}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 343}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 359}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"user": {"id": 374}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"id": 344}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 23}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 105, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 47}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 38}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 91}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 62}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 78}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 90}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 88}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"user": {"id": 73}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"user": {"id": 40}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 377}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"user": {"id": 302}, "role": null, "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 398}, "role": "owner", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"user": {"id": 359}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 300}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"user": {"id": 382}, "role": "supervisor", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 353}, "role": null, "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"user": {"id": 339}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 272}, "user": {"role": null}}}, "resource": {"user": {"id": 323}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    not allow with input as {"scope": "list", "auth": {"user": {"id": 28, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"user": {"id": 347}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 48}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 59}, "role": null, "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 338}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 19, "privilege": "admin"}, "organization": null}, "resource": {"user": {"id": 379}, "role": null, "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 32}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 85}, "role": null, "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 325}, "role": "maintainer", "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": null}, "resource": {"user": {"id": 340}, "role": "worker", "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 52}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_USER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 35}, "role": null, "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 373}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": null}, "resource": {"user": {"id": 364}, "role": "maintainer", "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 47}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_WORKER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 5}, "role": null, "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 32, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 379}, "role": "worker", "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": null}, "resource": {"user": {"id": 307}, "role": "owner", "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 16}, "role": null, "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_USER_SELF_privilege_NONE_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 55}, "role": null, "is_active": true}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_FALSE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 336}, "role": "supervisor", "is_active": false}}
}

test_scope_LIST_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_is_active_TRUE {
    allow with input as {"scope": "list", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": null}, "resource": {"user": {"id": 300}, "role": "maintainer", "is_active": true}}
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
## def get_data(scope, context, ownership, privilege, membership, is_active):
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
#             "role": random.choice(ORG_ROLES),
#             "is_active": is_active
#         }
#     }
##     user_id = data['auth']['user']['id']
#     if ownership == 'user_self':
#         data['resource']['user']['id'] = user_id
#         data['resource']['role'] = membership
#     if membership == 'owner':
#         data['auth']['organization']['owner']['id'] = user_id
##     return data
## def get_name(scope, context, ownership, privilege, membership, is_active):
#     return (f'test_scope_{scope.replace(":", "_").upper()}_context_{context.upper()}'
#         f'_ownership_{str(ownership).upper()}_privilege_{privilege.upper()}'
#         f'_membership_{str(membership).upper()}_is_active_{str(is_active).upper()}')
## with open('memberships_test.gen.rego', 'wt') as f:
#     f.write('package memberships\n\n')
##     for scope in SCOPES:
#         for context in CONTEXTS:
#             for privilege in GROUPS:
#                 for ownership in OWNERSHIPS:
#                     for membership in ORG_ROLES:
#                         for is_active in [False, True]:
#                             if context == 'sandbox' and membership:
#                                 continue
#                             test_name = get_name(scope, context, ownership, privilege, membership, is_active)
#                             data = get_data(scope, context, ownership, privilege, membership, is_active)
#                             result = eval_rule(scope, context, ownership, privilege, membership, data)
##                             f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                                 test_name=test_name, allow='allow' if result else 'not allow',
#                                 data=json.dumps(data)))
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
# list,Membership,Sandbox,N/A,filter(organization=None),GET,/memberships,Admin,N/A
# list,Membership,Sandbox,N/A,"filter(organization=None, is_active=True)",GET,/memberships,None,N/A
# list,Membership,Organization,N/A,"filter(organization, is_active=True)",GET,/memberships,None,Worker
# view,Membership,Sandbox,None,,GET,/membership/{id},Admin,N/A
# view,Membership,Sandbox,User_Self,"resource[""is_active""]==True",GET,/membership/{id},None,N/A
# view,Membership,Organization,"None, User_Self","resource[""is_active""]==True",GET,/membership/{id},None,Worker
# change:role,Membership,Organization,"None, User_Self","resource[""role""] not in [""maintainer"", ""owner""] and resource[""is_active""]==True",PATCH,/membership/{id},User,Maintainer
# change:role,Membership,Organization,"None, User_Self","resource[""role""] != ""owner"" and resource[""is_active""]==True",PATCH,/membership/{id},User,Owner
# delete,Membership,Organization,"None, User_Self","resource[""role""] not in [""maintainer"", ""owner""] and resource[""is_active""]==True",DELETE,/membership/{id},User,Maintainer
# delete,Membership,Organization,None,"resource[""role""] != ""owner"" and resource[""is_active""]==True",DELETE,/membership/{id},User,Owner
# delete,Membership,Organization,User_Self,"resource[""role""] != ""owner"" and resource[""is_active""]==True",DELETE,/membership/{id},Worker,Worker
# delete,Membership,Sandbox,User_Self,"resource[""role""] != ""owner"" and resource[""is_active""]==True",DELETE,/membership/{id},Worker,N/A