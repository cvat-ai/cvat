package webhooks

test_scope_VIEW_context_SANDBOX_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": null}, "resource": {"id": 157, "owner": {"id": 275}, "organization": {"id": 335}, "project": {"owner": {"id": 97}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": null}, "resource": {"id": 198, "owner": {"id": 237}, "organization": {"id": 310}, "project": {"owner": {"id": 12}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": null}, "resource": {"id": 140, "owner": {"id": 251}, "organization": {"id": 334}, "project": {"owner": {"id": 27}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": null}, "resource": {"id": 176, "owner": {"id": 208}, "organization": {"id": 349}, "project": {"owner": {"id": 76}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": null}, "resource": {"id": 147, "owner": {"id": 297}, "organization": {"id": 320}, "project": {"owner": {"id": 99}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": null}, "resource": {"id": 125, "owner": {"id": 85}, "organization": {"id": 339}, "project": {"owner": {"id": 451}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": null}, "resource": {"id": 173, "owner": {"id": 52}, "organization": {"id": 331}, "project": {"owner": {"id": 460}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": null}, "resource": {"id": 183, "owner": {"id": 96}, "organization": {"id": 301}, "project": {"owner": {"id": 411}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": null}, "resource": {"id": 161, "owner": {"id": 7}, "organization": {"id": 367}, "project": {"owner": {"id": 420}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": null}, "resource": {"id": 140, "owner": {"id": 58}, "organization": {"id": 309}, "project": {"owner": {"id": 401}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": null}, "resource": {"id": 136, "owner": {"id": 277}, "organization": {"id": 326}, "project": {"owner": {"id": 491}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": null}, "resource": {"id": 118, "owner": {"id": 255}, "organization": {"id": 316}, "project": {"owner": {"id": 405}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": null}, "resource": {"id": 158, "owner": {"id": 244}, "organization": {"id": 339}, "project": {"owner": {"id": 429}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": null}, "resource": {"id": 132, "owner": {"id": 205}, "organization": {"id": 390}, "project": {"owner": {"id": 455}}}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": null}, "resource": {"id": 178, "owner": {"id": 272}, "organization": {"id": 338}, "project": {"owner": {"id": 451}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 155, "owner": {"id": 274}, "organization": {"id": 159}, "project": {"owner": {"id": 41}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 194, "owner": {"id": 60}, "user": {"role": "owner"}}}, "resource": {"id": 156, "owner": {"id": 286}, "organization": {"id": 327}, "project": {"owner": {"id": 60}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 184, "owner": {"id": 210}, "organization": {"id": 181}, "project": {"owner": {"id": 84}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 142, "owner": {"id": 211}, "organization": {"id": 396}, "project": {"owner": {"id": 86}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 125, "owner": {"id": 218}, "organization": {"id": 160}, "project": {"owner": {"id": 31}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 198, "owner": {"id": 209}, "organization": {"id": 358}, "project": {"owner": {"id": 80}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 191, "owner": {"id": 289}, "organization": {"id": 131}, "project": {"owner": {"id": 51}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 183, "owner": {"id": 288}, "organization": {"id": 300}, "project": {"owner": {"id": 98}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": 154, "owner": {"id": 228}, "organization": {"id": 159}, "project": {"owner": {"id": 66}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 171, "owner": {"id": 231}, "organization": {"id": 315}, "project": {"owner": {"id": 17}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 167, "owner": {"id": 271}, "organization": {"id": 156}, "project": {"owner": {"id": 96}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"id": 192, "owner": {"id": 264}, "organization": {"id": 354}, "project": {"owner": {"id": 57}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 160, "owner": {"id": 257}, "organization": {"id": 181}, "project": {"owner": {"id": 31}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 198, "owner": {"id": 299}, "organization": {"id": 366}, "project": {"owner": {"id": 80}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 156, "owner": {"id": 209}, "organization": {"id": 134}, "project": {"owner": {"id": 30}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": 140, "owner": {"id": 269}, "organization": {"id": 310}, "project": {"owner": {"id": 19}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 188, "owner": {"id": 219}, "organization": {"id": 153}, "project": {"owner": {"id": 8}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 142, "owner": {"id": 269}, "organization": {"id": 359}, "project": {"owner": {"id": 7}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 273}, "user": {"role": null}}}, "resource": {"id": 149, "owner": {"id": 298}, "organization": {"id": 197}, "project": {"owner": {"id": 2}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 148, "owner": {"id": 261}, "organization": {"id": 300}, "project": {"owner": {"id": 38}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 153, "owner": {"id": 268}, "organization": {"id": 177}, "project": {"owner": {"id": 69}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": 162, "owner": {"id": 228}, "organization": {"id": 334}, "project": {"owner": {"id": 62}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"id": 143, "owner": {"id": 285}, "organization": {"id": 121}, "project": {"owner": {"id": 92}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 175, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 116, "owner": {"id": 279}, "organization": {"id": 368}, "project": {"owner": {"id": 50}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 259}, "user": {"role": "supervisor"}}}, "resource": {"id": 184, "owner": {"id": 203}, "organization": {"id": 117}, "project": {"owner": {"id": 54}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 123, "owner": {"id": 206}, "organization": {"id": 333}, "project": {"owner": {"id": 41}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 141, "owner": {"id": 243}, "organization": {"id": 196}, "project": {"owner": {"id": 35}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 132, "owner": {"id": 210}, "organization": {"id": 360}, "project": {"owner": {"id": 95}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": 144, "owner": {"id": 228}, "organization": {"id": 183}, "project": {"owner": {"id": 99}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 196, "owner": {"id": 203}, "organization": {"id": 331}, "project": {"owner": {"id": 2}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 130, "owner": {"id": 216}, "organization": {"id": 172}, "project": {"owner": {"id": 14}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"id": 159, "owner": {"id": 289}, "organization": {"id": 332}, "project": {"owner": {"id": 47}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 120, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 177, "owner": {"id": 295}, "organization": {"id": 120}, "project": {"owner": {"id": 99}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": 113, "owner": {"id": 274}, "organization": {"id": 303}, "project": {"owner": {"id": 73}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 150, "owner": {"id": 291}, "organization": {"id": 188}, "project": {"owner": {"id": 75}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 276}, "user": {"role": "supervisor"}}}, "resource": {"id": 131, "owner": {"id": 213}, "organization": {"id": 389}, "project": {"owner": {"id": 38}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 154, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 115, "owner": {"id": 272}, "organization": {"id": 154}, "project": {"owner": {"id": 68}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 147, "owner": {"id": 208}, "organization": {"id": 364}, "project": {"owner": {"id": 43}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 162, "owner": {"id": 213}, "organization": {"id": 158}, "project": {"owner": {"id": 81}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 183, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 119, "owner": {"id": 255}, "organization": {"id": 322}, "project": {"owner": {"id": 66}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 178, "owner": {"id": 268}, "organization": {"id": 155}, "project": {"owner": {"id": 59}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"id": 175, "owner": {"id": 234}, "organization": {"id": 341}, "project": {"owner": {"id": 11}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": 131, "owner": {"id": 296}, "organization": {"id": 185}, "project": {"owner": {"id": 78}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 143, "owner": {"id": 203}, "organization": {"id": 363}, "project": {"owner": {"id": 23}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 145, "owner": {"id": 233}, "organization": {"id": 189}, "project": {"owner": {"id": 76}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 130, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 171, "owner": {"id": 201}, "organization": {"id": 366}, "project": {"owner": {"id": 10}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"id": 152, "owner": {"id": 262}, "organization": {"id": 188}, "project": {"owner": {"id": 30}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 182, "owner": {"id": 291}, "organization": {"id": 362}, "project": {"owner": {"id": 2}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 128, "owner": {"id": 251}, "organization": {"id": 184}, "project": {"owner": {"id": 39}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"id": 147, "owner": {"id": 260}, "organization": {"id": 370}, "project": {"owner": {"id": 44}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": 170, "owner": {"id": 58}, "organization": {"id": 134}, "project": {"owner": {"id": 489}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"id": 132, "owner": {"id": 24}, "organization": {"id": 315}, "project": {"owner": {"id": 492}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 195, "owner": {"id": 23}, "organization": {"id": 124}, "project": {"owner": {"id": 488}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 194, "owner": {"id": 75}, "organization": {"id": 335}, "project": {"owner": {"id": 492}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 176, "owner": {"id": 37}, "organization": {"id": 129}, "project": {"owner": {"id": 424}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 122, "owner": {"id": 68}, "organization": {"id": 301}, "project": {"owner": {"id": 490}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 105, "owner": {"id": 89}, "organization": {"id": 116}, "project": {"owner": {"id": 437}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"id": 196, "owner": {"id": 73}, "organization": {"id": 313}, "project": {"owner": {"id": 401}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 261}, "user": {"role": null}}}, "resource": {"id": 161, "owner": {"id": 6}, "organization": {"id": 132}, "project": {"owner": {"id": 423}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 114, "owner": {"id": 9}, "organization": {"id": 351}, "project": {"owner": {"id": 462}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"id": 187, "owner": {"id": 72}, "organization": {"id": 138}, "project": {"owner": {"id": 419}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"id": 131, "owner": {"id": 53}, "organization": {"id": 371}, "project": {"owner": {"id": 497}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 179, "owner": {"id": 48}, "organization": {"id": 157}, "project": {"owner": {"id": 466}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 138, "owner": {"id": 72}, "organization": {"id": 354}, "project": {"owner": {"id": 439}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 227}, "user": {"role": "supervisor"}}}, "resource": {"id": 178, "owner": {"id": 26}, "organization": {"id": 180}, "project": {"owner": {"id": 497}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 133, "owner": {"id": 30}, "organization": {"id": 310}, "project": {"owner": {"id": 420}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"id": 109, "owner": {"id": 57}, "organization": {"id": 188}, "project": {"owner": {"id": 452}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 160, "owner": {"id": 36}, "organization": {"id": 304}, "project": {"owner": {"id": 429}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 189, "owner": {"id": 29}, "organization": {"id": 133}, "project": {"owner": {"id": 487}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 175, "owner": {"id": 14}, "organization": {"id": 325}, "project": {"owner": {"id": 454}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"id": 182, "owner": {"id": 9}, "organization": {"id": 107}, "project": {"owner": {"id": 418}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 139, "owner": {"id": 36}, "organization": {"id": 395}, "project": {"owner": {"id": 472}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": 159, "owner": {"id": 51}, "organization": {"id": 134}, "project": {"owner": {"id": 489}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 169, "owner": {"id": 76}, "organization": {"id": 356}, "project": {"owner": {"id": 410}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"id": 194, "owner": {"id": 3}, "organization": {"id": 111}, "project": {"owner": {"id": 432}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 186, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 186, "owner": {"id": 97}, "organization": {"id": 375}, "project": {"owner": {"id": 402}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": 173, "owner": {"id": 22}, "organization": {"id": 160}, "project": {"owner": {"id": 496}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 183, "owner": {"id": 74}, "organization": {"id": 335}, "project": {"owner": {"id": 423}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"id": 162, "owner": {"id": 52}, "organization": {"id": 142}, "project": {"owner": {"id": 444}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 188, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 185, "owner": {"id": 52}, "organization": {"id": 320}, "project": {"owner": {"id": 442}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": 136, "owner": {"id": 70}, "organization": {"id": 104}, "project": {"owner": {"id": 497}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 198, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 111, "owner": {"id": 14}, "organization": {"id": 332}, "project": {"owner": {"id": 441}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 165, "owner": {"id": 59}, "organization": {"id": 152}, "project": {"owner": {"id": 469}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 163, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 124, "owner": {"id": 96}, "organization": {"id": 346}, "project": {"owner": {"id": 479}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 216}, "user": {"role": "supervisor"}}}, "resource": {"id": 156, "owner": {"id": 34}, "organization": {"id": 170}, "project": {"owner": {"id": 426}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 136, "owner": {"id": 15}, "organization": {"id": 389}, "project": {"owner": {"id": 462}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 177, "owner": {"id": 39}, "organization": {"id": 170}, "project": {"owner": {"id": 420}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 170, "owner": {"id": 14}, "organization": {"id": 311}, "project": {"owner": {"id": 428}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 182, "owner": {"id": 37}, "organization": {"id": 165}, "project": {"owner": {"id": 491}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 270}, "user": {"role": null}}}, "resource": {"id": 134, "owner": {"id": 31}, "organization": {"id": 361}, "project": {"owner": {"id": 460}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"id": 118, "owner": {"id": 65}, "organization": {"id": 195}, "project": {"owner": {"id": 476}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 43}, "user": {"role": "owner"}}}, "resource": {"id": 108, "owner": {"id": 43}, "organization": {"id": 398}, "project": {"owner": {"id": 453}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 100, "owner": {"id": 75}, "organization": {"id": 174}, "project": {"owner": {"id": 438}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 162, "owner": {"id": 61}, "organization": {"id": 357}, "project": {"owner": {"id": 468}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 170, "owner": {"id": 58}, "organization": {"id": 141}, "project": {"owner": {"id": 448}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 189, "owner": {"id": 29}, "organization": {"id": 373}, "project": {"owner": {"id": 449}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 105, "owner": {"id": 90}, "organization": {"id": 148}, "project": {"owner": {"id": 460}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 184, "owner": {"id": 4}, "organization": {"id": 319}, "project": {"owner": {"id": 463}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"id": 175, "owner": {"id": 12}, "organization": {"id": 167}, "project": {"owner": {"id": 456}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 209}, "user": {"role": null}}}, "resource": {"id": 101, "owner": {"id": 83}, "organization": {"id": 318}, "project": {"owner": {"id": 452}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"id": 160, "owner": {"id": 233}, "organization": {"id": 150}, "project": {"owner": {"id": 479}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"id": 110, "owner": {"id": 242}, "organization": {"id": 386}, "project": {"owner": {"id": 468}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 191, "owner": {"id": 297}, "organization": {"id": 179}, "project": {"owner": {"id": 469}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"id": 130, "owner": {"id": 280}, "organization": {"id": 387}, "project": {"owner": {"id": 436}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 155, "owner": {"id": 212}, "organization": {"id": 112}, "project": {"owner": {"id": 481}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"id": 121, "owner": {"id": 288}, "organization": {"id": 338}, "project": {"owner": {"id": 403}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 131, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": 137, "owner": {"id": 245}, "organization": {"id": 131}, "project": {"owner": {"id": 455}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 152, "owner": {"id": 272}, "organization": {"id": 387}, "project": {"owner": {"id": 423}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 178, "owner": {"id": 248}, "organization": {"id": 163}, "project": {"owner": {"id": 487}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 118, "owner": {"id": 229}, "organization": {"id": 359}, "project": {"owner": {"id": 481}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 185, "owner": {"id": 201}, "organization": {"id": 169}, "project": {"owner": {"id": 436}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"id": 109, "owner": {"id": 256}, "organization": {"id": 344}, "project": {"owner": {"id": 475}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"id": 188, "owner": {"id": 232}, "organization": {"id": 149}, "project": {"owner": {"id": 438}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": 113, "owner": {"id": 230}, "organization": {"id": 348}, "project": {"owner": {"id": 473}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 189, "owner": {"id": 237}, "organization": {"id": 135}, "project": {"owner": {"id": 484}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 172, "owner": {"id": 287}, "organization": {"id": 399}, "project": {"owner": {"id": 495}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 228}, "user": {"role": "worker"}}}, "resource": {"id": 163, "owner": {"id": 236}, "organization": {"id": 145}, "project": {"owner": {"id": 429}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"id": 181, "owner": {"id": 224}, "organization": {"id": 379}, "project": {"owner": {"id": 432}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 198, "owner": {"id": 284}, "organization": {"id": 112}, "project": {"owner": {"id": 417}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 174, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": 182, "owner": {"id": 205}, "organization": {"id": 339}, "project": {"owner": {"id": 456}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 193, "owner": {"id": 216}, "organization": {"id": 195}, "project": {"owner": {"id": 437}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": 122, "owner": {"id": 225}, "organization": {"id": 316}, "project": {"owner": {"id": 469}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 134, "owner": {"id": 221}, "organization": {"id": 195}, "project": {"owner": {"id": 461}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 114, "owner": {"id": 259}, "organization": {"id": 309}, "project": {"owner": {"id": 418}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": 192, "owner": {"id": 286}, "organization": {"id": 111}, "project": {"owner": {"id": 471}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 101, "owner": {"id": 233}, "organization": {"id": 368}, "project": {"owner": {"id": 415}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"id": 195, "owner": {"id": 286}, "organization": {"id": 181}, "project": {"owner": {"id": 474}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 113, "owner": {"id": 286}, "organization": {"id": 329}, "project": {"owner": {"id": 460}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 141, "owner": {"id": 278}, "organization": {"id": 181}, "project": {"owner": {"id": 482}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": 189, "owner": {"id": 238}, "organization": {"id": 383}, "project": {"owner": {"id": 452}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"id": 104, "owner": {"id": 238}, "organization": {"id": 130}, "project": {"owner": {"id": 414}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 117, "owner": {"id": 249}, "organization": {"id": 358}, "project": {"owner": {"id": 447}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 169, "owner": {"id": 253}, "organization": {"id": 119}, "project": {"owner": {"id": 495}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 183, "owner": {"id": 212}, "organization": {"id": 362}, "project": {"owner": {"id": 478}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 188, "owner": {"id": 247}, "organization": {"id": 130}, "project": {"owner": {"id": 456}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"id": 112, "owner": {"id": 287}, "organization": {"id": 347}, "project": {"owner": {"id": 469}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 150, "owner": {"id": 235}, "organization": {"id": 111}, "project": {"owner": {"id": 415}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"id": 127, "owner": {"id": 282}, "organization": {"id": 381}, "project": {"owner": {"id": 476}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 270}, "user": {"role": null}}}, "resource": {"id": 131, "owner": {"id": 216}, "organization": {"id": 197}, "project": {"owner": {"id": 426}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"id": 126, "owner": {"id": 275}, "organization": {"id": 327}, "project": {"owner": {"id": 429}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"id": 176, "owner": {"id": 200}, "organization": {"id": 169}, "project": {"owner": {"id": 418}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"id": 122, "owner": {"id": 214}, "organization": {"id": 384}, "project": {"owner": {"id": 403}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "none"}, "organization": {"id": 133, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 130, "owner": {"id": 275}, "organization": {"id": 133}, "project": {"owner": {"id": 402}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 116, "owner": {"id": 294}, "organization": {"id": 353}, "project": {"owner": {"id": 467}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 160, "owner": {"id": 257}, "organization": {"id": 175}, "project": {"owner": {"id": 446}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 157, "owner": {"id": 264}, "organization": {"id": 328}, "project": {"owner": {"id": 478}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 107, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 166, "owner": {"id": 238}, "organization": {"id": 107}, "project": {"owner": {"id": 482}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 151, "owner": {"id": 254}, "organization": {"id": 387}, "project": {"owner": {"id": 413}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"id": 109, "owner": {"id": 210}, "organization": {"id": 108}, "project": {"owner": {"id": 477}}}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"id": 135, "owner": {"id": 279}, "organization": {"id": 381}, "project": {"owner": {"id": 474}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": null}, "resource": {"id": 109, "owner": {"id": 225}, "organization": {"id": 317}, "project": {"owner": {"id": 98}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": null}, "resource": {"id": 106, "owner": {"id": 286}, "organization": {"id": 338}, "project": {"owner": {"id": 22}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": null}, "resource": {"id": 115, "owner": {"id": 205}, "organization": {"id": 359}, "project": {"owner": {"id": 21}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": null}, "resource": {"id": 167, "owner": {"id": 231}, "organization": {"id": 380}, "project": {"owner": {"id": 2}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": null}, "resource": {"id": 197, "owner": {"id": 228}, "organization": {"id": 373}, "project": {"owner": {"id": 45}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"id": 116, "owner": {"id": 41}, "organization": {"id": 391}, "project": {"owner": {"id": 422}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": null}, "resource": {"id": 175, "owner": {"id": 93}, "organization": {"id": 348}, "project": {"owner": {"id": 439}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": null}, "resource": {"id": 157, "owner": {"id": 31}, "organization": {"id": 333}, "project": {"owner": {"id": 426}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": null}, "resource": {"id": 143, "owner": {"id": 93}, "organization": {"id": 348}, "project": {"owner": {"id": 420}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"id": 162, "owner": {"id": 0}, "organization": {"id": 306}, "project": {"owner": {"id": 446}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": null}, "resource": {"id": 159, "owner": {"id": 233}, "organization": {"id": 328}, "project": {"owner": {"id": 434}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": null}, "resource": {"id": 118, "owner": {"id": 215}, "organization": {"id": 396}, "project": {"owner": {"id": 457}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": null}, "resource": {"id": 172, "owner": {"id": 275}, "organization": {"id": 374}, "project": {"owner": {"id": 497}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": null}, "resource": {"id": 143, "owner": {"id": 238}, "organization": {"id": 339}, "project": {"owner": {"id": 435}}}}
}

test_scope_DELETE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": null}, "resource": {"id": 172, "owner": {"id": 203}, "organization": {"id": 322}, "project": {"owner": {"id": 424}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"id": 106, "owner": {"id": 246}, "organization": {"id": 147}, "project": {"owner": {"id": 35}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 164, "owner": {"id": 250}, "organization": {"id": 381}, "project": {"owner": {"id": 87}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 147, "owner": {"id": 262}, "organization": {"id": 160}, "project": {"owner": {"id": 22}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 170, "owner": {"id": 244}, "organization": {"id": 344}, "project": {"owner": {"id": 33}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 111, "owner": {"id": 236}, "organization": {"id": 120}, "project": {"owner": {"id": 6}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 226}, "user": {"role": "supervisor"}}}, "resource": {"id": 199, "owner": {"id": 227}, "organization": {"id": 328}, "project": {"owner": {"id": 28}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 2, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 134, "owner": {"id": 283}, "organization": {"id": 199}, "project": {"owner": {"id": 2}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 276}, "user": {"role": "worker"}}}, "resource": {"id": 187, "owner": {"id": 201}, "organization": {"id": 360}, "project": {"owner": {"id": 82}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 101, "owner": {"id": 228}, "organization": {"id": 191}, "project": {"owner": {"id": 39}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 182, "owner": {"id": 235}, "organization": {"id": 354}, "project": {"owner": {"id": 44}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"id": 127, "owner": {"id": 259}, "organization": {"id": 179}, "project": {"owner": {"id": 66}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 147, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"id": 174, "owner": {"id": 213}, "organization": {"id": 300}, "project": {"owner": {"id": 84}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 182, "owner": {"id": 276}, "organization": {"id": 187}, "project": {"owner": {"id": 38}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 161, "owner": {"id": 208}, "organization": {"id": 343}, "project": {"owner": {"id": 81}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 124, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"id": 133, "owner": {"id": 283}, "organization": {"id": 124}, "project": {"owner": {"id": 38}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 166, "owner": {"id": 297}, "organization": {"id": 330}, "project": {"owner": {"id": 76}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 263}, "user": {"role": "worker"}}}, "resource": {"id": 140, "owner": {"id": 287}, "organization": {"id": 183}, "project": {"owner": {"id": 3}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 137, "owner": {"id": 233}, "organization": {"id": 353}, "project": {"owner": {"id": 49}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"id": 174, "owner": {"id": 290}, "organization": {"id": 192}, "project": {"owner": {"id": 43}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 245}, "user": {"role": null}}}, "resource": {"id": 128, "owner": {"id": 287}, "organization": {"id": 368}, "project": {"owner": {"id": 60}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 164, "owner": {"id": 238}, "organization": {"id": 123}, "project": {"owner": {"id": 71}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 112, "owner": {"id": 260}, "organization": {"id": 316}, "project": {"owner": {"id": 33}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 197, "owner": {"id": 223}, "organization": {"id": 111}, "project": {"owner": {"id": 83}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"id": 145, "owner": {"id": 228}, "organization": {"id": 395}, "project": {"owner": {"id": 53}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 133, "owner": {"id": 274}, "organization": {"id": 160}, "project": {"owner": {"id": 15}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 160, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": 181, "owner": {"id": 274}, "organization": {"id": 374}, "project": {"owner": {"id": 9}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 164, "owner": {"id": 215}, "organization": {"id": 138}, "project": {"owner": {"id": 67}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 106, "owner": {"id": 219}, "organization": {"id": 317}, "project": {"owner": {"id": 43}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 158, "owner": {"id": 218}, "organization": {"id": 199}, "project": {"owner": {"id": 23}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"id": 162, "owner": {"id": 242}, "organization": {"id": 380}, "project": {"owner": {"id": 40}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"id": 100, "owner": {"id": 257}, "organization": {"id": 199}, "project": {"owner": {"id": 97}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"id": 173, "owner": {"id": 297}, "organization": {"id": 320}, "project": {"owner": {"id": 97}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 151, "owner": {"id": 254}, "user": {"role": "maintainer"}}}, "resource": {"id": 116, "owner": {"id": 278}, "organization": {"id": 151}, "project": {"owner": {"id": 54}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 161, "owner": {"id": 249}, "organization": {"id": 300}, "project": {"owner": {"id": 68}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 147, "owner": {"id": 201}, "organization": {"id": 124}, "project": {"owner": {"id": 67}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 128, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": 186, "owner": {"id": 200}, "organization": {"id": 380}, "project": {"owner": {"id": 31}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 144, "owner": {"id": 239}, "organization": {"id": 164}, "project": {"owner": {"id": 49}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 139, "owner": {"id": 221}, "organization": {"id": 308}, "project": {"owner": {"id": 38}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 155, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 193, "owner": {"id": 266}, "organization": {"id": 155}, "project": {"owner": {"id": 43}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 117, "owner": {"id": 243}, "organization": {"id": 362}, "project": {"owner": {"id": 96}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"id": 151, "owner": {"id": 202}, "organization": {"id": 116}, "project": {"owner": {"id": 93}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 115, "owner": {"id": 21}, "user": {"role": "owner"}}}, "resource": {"id": 193, "owner": {"id": 202}, "organization": {"id": 375}, "project": {"owner": {"id": 21}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 191, "owner": {"id": 283}, "organization": {"id": 132}, "project": {"owner": {"id": 81}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 168, "owner": {"id": 279}, "organization": {"id": 306}, "project": {"owner": {"id": 6}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": 183, "owner": {"id": 202}, "organization": {"id": 153}, "project": {"owner": {"id": 14}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"id": 148, "owner": {"id": 215}, "organization": {"id": 370}, "project": {"owner": {"id": 60}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 126, "owner": {"id": 288}, "organization": {"id": 138}, "project": {"owner": {"id": 1}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 184, "owner": {"id": 212}, "organization": {"id": 384}, "project": {"owner": {"id": 34}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 189, "owner": {"id": 217}, "organization": {"id": 192}, "project": {"owner": {"id": 65}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"id": 115, "owner": {"id": 236}, "organization": {"id": 314}, "project": {"owner": {"id": 63}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 25}, "user": {"role": "owner"}}}, "resource": {"id": 125, "owner": {"id": 25}, "organization": {"id": 145}, "project": {"owner": {"id": 466}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": 152, "owner": {"id": 70}, "organization": {"id": 320}, "project": {"owner": {"id": 405}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"id": 188, "owner": {"id": 0}, "organization": {"id": 101}, "project": {"owner": {"id": 430}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 119, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"id": 111, "owner": {"id": 63}, "organization": {"id": 373}, "project": {"owner": {"id": 485}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": 199, "owner": {"id": 92}, "organization": {"id": 112}, "project": {"owner": {"id": 492}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 33, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 206}, "user": {"role": "supervisor"}}}, "resource": {"id": 182, "owner": {"id": 33}, "organization": {"id": 358}, "project": {"owner": {"id": 437}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"id": 112, "owner": {"id": 46}, "organization": {"id": 186}, "project": {"owner": {"id": 437}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 154, "owner": {"id": 97}, "organization": {"id": 314}, "project": {"owner": {"id": 412}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 256}, "user": {"role": null}}}, "resource": {"id": 117, "owner": {"id": 42}, "organization": {"id": 145}, "project": {"owner": {"id": 421}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": 179, "owner": {"id": 47}, "organization": {"id": 393}, "project": {"owner": {"id": 411}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"id": 114, "owner": {"id": 34}, "organization": {"id": 149}, "project": {"owner": {"id": 458}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 161, "owner": {"id": 14}, "organization": {"id": 383}, "project": {"owner": {"id": 421}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"id": 192, "owner": {"id": 53}, "organization": {"id": 175}, "project": {"owner": {"id": 413}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 172, "owner": {"id": 78}, "organization": {"id": 356}, "project": {"owner": {"id": 423}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 145, "owner": {"id": 93}, "organization": {"id": 116}, "project": {"owner": {"id": 487}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": 162, "owner": {"id": 5}, "organization": {"id": 352}, "project": {"owner": {"id": 456}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 183, "owner": {"id": 86}, "organization": {"id": 167}, "project": {"owner": {"id": 490}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 185, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 195, "owner": {"id": 28}, "organization": {"id": 392}, "project": {"owner": {"id": 472}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 166, "owner": {"id": 79}, "organization": {"id": 112}, "project": {"owner": {"id": 489}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"id": 184, "owner": {"id": 44}, "organization": {"id": 331}, "project": {"owner": {"id": 461}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"id": 182, "owner": {"id": 78}, "organization": {"id": 106}, "project": {"owner": {"id": 471}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": 182, "owner": {"id": 63}, "organization": {"id": 364}, "project": {"owner": {"id": 460}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 196, "owner": {"id": 42}, "organization": {"id": 135}, "project": {"owner": {"id": 430}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"id": 164, "owner": {"id": 48}, "organization": {"id": 370}, "project": {"owner": {"id": 482}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 110, "owner": {"id": 57}, "organization": {"id": 111}, "project": {"owner": {"id": 473}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 183, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 157, "owner": {"id": 95}, "organization": {"id": 315}, "project": {"owner": {"id": 463}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 200}, "user": {"role": "worker"}}}, "resource": {"id": 113, "owner": {"id": 71}, "organization": {"id": 170}, "project": {"owner": {"id": 404}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"id": 111, "owner": {"id": 38}, "organization": {"id": 379}, "project": {"owner": {"id": 481}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": 126, "owner": {"id": 43}, "organization": {"id": 146}, "project": {"owner": {"id": 458}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 179, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 128, "owner": {"id": 98}, "organization": {"id": 342}, "project": {"owner": {"id": 471}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"id": 160, "owner": {"id": 91}, "organization": {"id": 157}, "project": {"owner": {"id": 446}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 112, "owner": {"id": 0}, "organization": {"id": 384}, "project": {"owner": {"id": 428}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 181, "owner": {"id": 47}, "organization": {"id": 189}, "project": {"owner": {"id": 466}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 195, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"id": 105, "owner": {"id": 91}, "organization": {"id": 363}, "project": {"owner": {"id": 417}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 152, "owner": {"id": 25}, "organization": {"id": 124}, "project": {"owner": {"id": 478}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 150, "owner": {"id": 91}, "organization": {"id": 358}, "project": {"owner": {"id": 424}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 215}, "user": {"role": "worker"}}}, "resource": {"id": 196, "owner": {"id": 86}, "organization": {"id": 175}, "project": {"owner": {"id": 481}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"id": 198, "owner": {"id": 75}, "organization": {"id": 358}, "project": {"owner": {"id": 484}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 163, "owner": {"id": 6}, "organization": {"id": 170}, "project": {"owner": {"id": 494}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 174, "owner": {"id": 22}, "organization": {"id": 365}, "project": {"owner": {"id": 499}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 122, "owner": {"id": 49}, "organization": {"id": 184}, "project": {"owner": {"id": 413}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 177, "owner": {"id": 53}, "user": {"role": "owner"}}}, "resource": {"id": 177, "owner": {"id": 53}, "organization": {"id": 364}, "project": {"owner": {"id": 449}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"id": 197, "owner": {"id": 43}, "organization": {"id": 137}, "project": {"owner": {"id": 450}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 117, "owner": {"id": 89}, "organization": {"id": 352}, "project": {"owner": {"id": 477}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 138, "owner": {"id": 91}, "organization": {"id": 194}, "project": {"owner": {"id": 440}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 180, "owner": {"id": 79}, "organization": {"id": 325}, "project": {"owner": {"id": 426}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 187, "owner": {"id": 90}, "organization": {"id": 183}, "project": {"owner": {"id": 416}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 164, "owner": {"id": 41}, "organization": {"id": 388}, "project": {"owner": {"id": 481}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 74, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 197, "owner": {"id": 74}, "organization": {"id": 173}, "project": {"owner": {"id": 461}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"id": 190, "owner": {"id": 68}, "organization": {"id": 386}, "project": {"owner": {"id": 495}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 48}, "user": {"role": "owner"}}}, "resource": {"id": 101, "owner": {"id": 266}, "organization": {"id": 118}, "project": {"owner": {"id": 403}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 120, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 185, "owner": {"id": 207}, "organization": {"id": 325}, "project": {"owner": {"id": 434}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": 187, "owner": {"id": 232}, "organization": {"id": 137}, "project": {"owner": {"id": 407}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": 196, "owner": {"id": 269}, "organization": {"id": 304}, "project": {"owner": {"id": 445}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 186, "owner": {"id": 294}, "organization": {"id": 182}, "project": {"owner": {"id": 428}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 149, "owner": {"id": 230}, "organization": {"id": 365}, "project": {"owner": {"id": 489}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 106, "owner": {"id": 248}, "organization": {"id": 140}, "project": {"owner": {"id": 453}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 106, "owner": {"id": 201}, "organization": {"id": 395}, "project": {"owner": {"id": 432}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"id": 156, "owner": {"id": 228}, "organization": {"id": 182}, "project": {"owner": {"id": 490}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"id": 196, "owner": {"id": 275}, "organization": {"id": 369}, "project": {"owner": {"id": 494}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": 192, "owner": {"id": 224}, "organization": {"id": 187}, "project": {"owner": {"id": 457}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"id": 123, "owner": {"id": 222}, "organization": {"id": 394}, "project": {"owner": {"id": 465}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 274}, "user": {"role": "maintainer"}}}, "resource": {"id": 154, "owner": {"id": 235}, "organization": {"id": 120}, "project": {"owner": {"id": 433}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"id": 132, "owner": {"id": 200}, "organization": {"id": 342}, "project": {"owner": {"id": 459}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 119, "owner": {"id": 241}, "organization": {"id": 180}, "project": {"owner": {"id": 406}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 184, "owner": {"id": 238}, "organization": {"id": 362}, "project": {"owner": {"id": 473}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 190, "owner": {"id": 240}, "organization": {"id": 166}, "project": {"owner": {"id": 428}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 211}, "user": {"role": "worker"}}}, "resource": {"id": 164, "owner": {"id": 220}, "organization": {"id": 353}, "project": {"owner": {"id": 469}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": 144, "owner": {"id": 228}, "organization": {"id": 142}, "project": {"owner": {"id": 484}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 271}, "user": {"role": null}}}, "resource": {"id": 137, "owner": {"id": 227}, "organization": {"id": 396}, "project": {"owner": {"id": 479}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 196, "owner": {"id": 283}, "organization": {"id": 144}, "project": {"owner": {"id": 414}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": 130, "owner": {"id": 282}, "organization": {"id": 378}, "project": {"owner": {"id": 479}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"id": 141, "owner": {"id": 248}, "organization": {"id": 169}, "project": {"owner": {"id": 449}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 165, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 136, "owner": {"id": 203}, "organization": {"id": 366}, "project": {"owner": {"id": 498}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 241}, "user": {"role": "supervisor"}}}, "resource": {"id": 157, "owner": {"id": 262}, "organization": {"id": 124}, "project": {"owner": {"id": 437}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 165, "owner": {"id": 210}, "organization": {"id": 312}, "project": {"owner": {"id": 421}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 100, "owner": {"id": 280}, "organization": {"id": 180}, "project": {"owner": {"id": 426}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 127, "owner": {"id": 287}, "organization": {"id": 354}, "project": {"owner": {"id": 413}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 194, "owner": {"id": 299}, "organization": {"id": 195}, "project": {"owner": {"id": 482}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 119, "owner": {"id": 203}, "organization": {"id": 358}, "project": {"owner": {"id": 491}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 109, "owner": {"id": 206}, "organization": {"id": 109}, "project": {"owner": {"id": 432}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"id": 129, "owner": {"id": 233}, "organization": {"id": 352}, "project": {"owner": {"id": 449}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 155, "owner": {"id": 240}, "organization": {"id": 115}, "project": {"owner": {"id": 449}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 100, "owner": {"id": 282}, "organization": {"id": 392}, "project": {"owner": {"id": 479}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 164, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 174, "owner": {"id": 205}, "organization": {"id": 164}, "project": {"owner": {"id": 409}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 137, "owner": {"id": 287}, "organization": {"id": 338}, "project": {"owner": {"id": 477}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": 156, "owner": {"id": 248}, "organization": {"id": 160}, "project": {"owner": {"id": 484}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": 168, "owner": {"id": 228}, "organization": {"id": 317}, "project": {"owner": {"id": 495}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"id": 181, "owner": {"id": 218}, "organization": {"id": 182}, "project": {"owner": {"id": 486}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": 101, "owner": {"id": 270}, "organization": {"id": 371}, "project": {"owner": {"id": 418}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": 173, "owner": {"id": 276}, "organization": {"id": 110}, "project": {"owner": {"id": 468}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 127, "owner": {"id": 44}, "user": {"role": "owner"}}}, "resource": {"id": 126, "owner": {"id": 295}, "organization": {"id": 394}, "project": {"owner": {"id": 492}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 128, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": 182, "owner": {"id": 265}, "organization": {"id": 128}, "project": {"owner": {"id": 420}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 132, "owner": {"id": 224}, "organization": {"id": 314}, "project": {"owner": {"id": 423}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 196, "owner": {"id": 270}, "organization": {"id": 109}, "project": {"owner": {"id": 482}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 185, "owner": {"id": 208}, "organization": {"id": 332}, "project": {"owner": {"id": 412}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"id": 162, "owner": {"id": 242}, "organization": {"id": 183}, "project": {"owner": {"id": 416}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 140, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 112, "owner": {"id": 236}, "organization": {"id": 379}, "project": {"owner": {"id": 408}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 274}, "user": {"role": null}}}, "resource": {"id": 157, "owner": {"id": 242}, "organization": {"id": 188}, "project": {"owner": {"id": 484}}}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 119, "owner": {"id": 272}, "organization": {"id": 372}, "project": {"owner": {"id": 446}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": null}, "resource": {"id": 171, "owner": {"id": 292}, "organization": {"id": 305}, "project": {"owner": {"id": 41}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": null}, "resource": {"id": 188, "owner": {"id": 275}, "organization": {"id": 313}, "project": {"owner": {"id": 21}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": null}, "resource": {"id": 162, "owner": {"id": 263}, "organization": {"id": 329}, "project": {"owner": {"id": 17}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": null}, "resource": {"id": 169, "owner": {"id": 202}, "organization": {"id": 397}, "project": {"owner": {"id": 55}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": null}, "resource": {"id": 120, "owner": {"id": 264}, "organization": {"id": 307}, "project": {"owner": {"id": 33}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": null}, "resource": {"id": 175, "owner": {"id": 39}, "organization": {"id": 388}, "project": {"owner": {"id": 408}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "business"}, "organization": null}, "resource": {"id": 143, "owner": {"id": 46}, "organization": {"id": 378}, "project": {"owner": {"id": 438}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": null}, "resource": {"id": 184, "owner": {"id": 53}, "organization": {"id": 340}, "project": {"owner": {"id": 425}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": null}, "resource": {"id": 119, "owner": {"id": 38}, "organization": {"id": 387}, "project": {"owner": {"id": 497}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": null}, "resource": {"id": 135, "owner": {"id": 82}, "organization": {"id": 370}, "project": {"owner": {"id": 422}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": null}, "resource": {"id": 140, "owner": {"id": 242}, "organization": {"id": 374}, "project": {"owner": {"id": 494}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "business"}, "organization": null}, "resource": {"id": 104, "owner": {"id": 294}, "organization": {"id": 384}, "project": {"owner": {"id": 406}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": null}, "resource": {"id": 160, "owner": {"id": 294}, "organization": {"id": 352}, "project": {"owner": {"id": 442}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": null}, "resource": {"id": 131, "owner": {"id": 266}, "organization": {"id": 391}, "project": {"owner": {"id": 498}}}}
}

test_scope_UPDATE_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "none"}, "organization": null}, "resource": {"id": 189, "owner": {"id": 221}, "organization": {"id": 306}, "project": {"owner": {"id": 451}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 15}, "user": {"role": "owner"}}}, "resource": {"id": 111, "owner": {"id": 247}, "organization": {"id": 101}, "project": {"owner": {"id": 15}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 167, "owner": {"id": 255}, "organization": {"id": 398}, "project": {"owner": {"id": 86}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 128, "owner": {"id": 291}, "organization": {"id": 136}, "project": {"owner": {"id": 34}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 227}, "user": {"role": "maintainer"}}}, "resource": {"id": 163, "owner": {"id": 248}, "organization": {"id": 316}, "project": {"owner": {"id": 26}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 53, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 136, "owner": {"id": 293}, "organization": {"id": 123}, "project": {"owner": {"id": 53}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 118, "owner": {"id": 203}, "organization": {"id": 337}, "project": {"owner": {"id": 30}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 158, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 131, "owner": {"id": 247}, "organization": {"id": 158}, "project": {"owner": {"id": 82}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 287}, "user": {"role": "worker"}}}, "resource": {"id": 101, "owner": {"id": 260}, "organization": {"id": 317}, "project": {"owner": {"id": 88}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 194, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 127, "owner": {"id": 291}, "organization": {"id": 194}, "project": {"owner": {"id": 54}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 242}, "user": {"role": null}}}, "resource": {"id": 132, "owner": {"id": 209}, "organization": {"id": 312}, "project": {"owner": {"id": 7}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 130, "owner": {"id": 260}, "organization": {"id": 176}, "project": {"owner": {"id": 85}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 64}, "user": {"role": "owner"}}}, "resource": {"id": 195, "owner": {"id": 205}, "organization": {"id": 300}, "project": {"owner": {"id": 64}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 205}, "user": {"role": "maintainer"}}}, "resource": {"id": 138, "owner": {"id": 250}, "organization": {"id": 171}, "project": {"owner": {"id": 16}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 174, "owner": {"id": 222}, "organization": {"id": 333}, "project": {"owner": {"id": 64}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": 159, "owner": {"id": 216}, "organization": {"id": 167}, "project": {"owner": {"id": 90}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 118, "owner": {"id": 233}, "organization": {"id": 314}, "project": {"owner": {"id": 5}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 135, "owner": {"id": 295}, "organization": {"id": 133}, "project": {"owner": {"id": 36}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 240}, "user": {"role": "worker"}}}, "resource": {"id": 197, "owner": {"id": 233}, "organization": {"id": 366}, "project": {"owner": {"id": 55}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"id": 194, "owner": {"id": 262}, "organization": {"id": 184}, "project": {"owner": {"id": 71}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": 156, "owner": {"id": 206}, "organization": {"id": 324}, "project": {"owner": {"id": 6}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"id": 104, "owner": {"id": 260}, "organization": {"id": 159}, "project": {"owner": {"id": 90}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"id": 114, "owner": {"id": 263}, "organization": {"id": 305}, "project": {"owner": {"id": 45}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"id": 162, "owner": {"id": 258}, "organization": {"id": 118}, "project": {"owner": {"id": 92}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"id": 144, "owner": {"id": 211}, "organization": {"id": 326}, "project": {"owner": {"id": 23}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 165, "owner": {"id": 234}, "organization": {"id": 127}, "project": {"owner": {"id": 74}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 100, "owner": {"id": 267}, "organization": {"id": 398}, "project": {"owner": {"id": 23}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 131, "owner": {"id": 298}, "organization": {"id": 142}, "project": {"owner": {"id": 12}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 275}, "user": {"role": "worker"}}}, "resource": {"id": 136, "owner": {"id": 287}, "organization": {"id": 387}, "project": {"owner": {"id": 50}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 113, "owner": {"id": 241}, "organization": {"id": 158}, "project": {"owner": {"id": 10}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 184, "owner": {"id": 261}, "organization": {"id": 358}, "project": {"owner": {"id": 34}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": 100, "owner": {"id": 242}, "organization": {"id": 157}, "project": {"owner": {"id": 79}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 27}, "user": {"role": "owner"}}}, "resource": {"id": 193, "owner": {"id": 293}, "organization": {"id": 372}, "project": {"owner": {"id": 27}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 170, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 136, "owner": {"id": 241}, "organization": {"id": 170}, "project": {"owner": {"id": 9}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 148, "owner": {"id": 211}, "organization": {"id": 351}, "project": {"owner": {"id": 22}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 151, "owner": {"id": 211}, "organization": {"id": 149}, "project": {"owner": {"id": 20}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 215}, "user": {"role": "supervisor"}}}, "resource": {"id": 151, "owner": {"id": 236}, "organization": {"id": 382}, "project": {"owner": {"id": 83}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 138, "owner": {"id": 262}, "organization": {"id": 187}, "project": {"owner": {"id": 39}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 116, "owner": {"id": 245}, "organization": {"id": 385}, "project": {"owner": {"id": 47}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 162, "owner": {"id": 257}, "organization": {"id": 172}, "project": {"owner": {"id": 34}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": 154, "owner": {"id": 211}, "organization": {"id": 396}, "project": {"owner": {"id": 47}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"id": 155, "owner": {"id": 280}, "organization": {"id": 165}, "project": {"owner": {"id": 5}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 159, "owner": {"id": 286}, "organization": {"id": 328}, "project": {"owner": {"id": 87}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": 163, "owner": {"id": 267}, "organization": {"id": 110}, "project": {"owner": {"id": 67}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 159, "owner": {"id": 255}, "organization": {"id": 310}, "project": {"owner": {"id": 38}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 187, "owner": {"id": 238}, "organization": {"id": 137}, "project": {"owner": {"id": 54}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 106, "owner": {"id": 270}, "organization": {"id": 309}, "project": {"owner": {"id": 65}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 154, "owner": {"id": 252}, "organization": {"id": 192}, "project": {"owner": {"id": 84}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 264}, "user": {"role": "worker"}}}, "resource": {"id": 132, "owner": {"id": 245}, "organization": {"id": 332}, "project": {"owner": {"id": 10}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": 102, "owner": {"id": 214}, "organization": {"id": 122}, "project": {"owner": {"id": 59}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"id": 150, "owner": {"id": 205}, "organization": {"id": 310}, "project": {"owner": {"id": 90}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 157, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 175, "owner": {"id": 85}, "organization": {"id": 157}, "project": {"owner": {"id": 496}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"id": 133, "owner": {"id": 23}, "organization": {"id": 323}, "project": {"owner": {"id": 427}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 168, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": 177, "owner": {"id": 55}, "organization": {"id": 168}, "project": {"owner": {"id": 413}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 261}, "user": {"role": "maintainer"}}}, "resource": {"id": 100, "owner": {"id": 21}, "organization": {"id": 314}, "project": {"owner": {"id": 401}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 177, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 158, "owner": {"id": 95}, "organization": {"id": 177}, "project": {"owner": {"id": 484}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 162, "owner": {"id": 46}, "organization": {"id": 379}, "project": {"owner": {"id": 478}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 217}, "user": {"role": "worker"}}}, "resource": {"id": 188, "owner": {"id": 11}, "organization": {"id": 116}, "project": {"owner": {"id": 438}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 124, "owner": {"id": 203}, "user": {"role": "worker"}}}, "resource": {"id": 101, "owner": {"id": 89}, "organization": {"id": 314}, "project": {"owner": {"id": 402}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 255}, "user": {"role": null}}}, "resource": {"id": 126, "owner": {"id": 83}, "organization": {"id": 130}, "project": {"owner": {"id": 418}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 259}, "user": {"role": null}}}, "resource": {"id": 180, "owner": {"id": 38}, "organization": {"id": 324}, "project": {"owner": {"id": 411}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 14}, "user": {"role": "owner"}}}, "resource": {"id": 118, "owner": {"id": 14}, "organization": {"id": 121}, "project": {"owner": {"id": 402}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 60}, "user": {"role": "owner"}}}, "resource": {"id": 194, "owner": {"id": 60}, "organization": {"id": 356}, "project": {"owner": {"id": 462}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": 174, "owner": {"id": 72}, "organization": {"id": 150}, "project": {"owner": {"id": 437}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 142, "owner": {"id": 91}, "organization": {"id": 313}, "project": {"owner": {"id": 480}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "business"}, "organization": {"id": 170, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 163, "owner": {"id": 93}, "organization": {"id": 170}, "project": {"owner": {"id": 476}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 175, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 104, "owner": {"id": 65}, "organization": {"id": 351}, "project": {"owner": {"id": 462}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 107, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": 178, "owner": {"id": 91}, "organization": {"id": 107}, "project": {"owner": {"id": 429}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 108, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 102, "owner": {"id": 70}, "organization": {"id": 373}, "project": {"owner": {"id": 440}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 282}, "user": {"role": null}}}, "resource": {"id": 182, "owner": {"id": 63}, "organization": {"id": 179}, "project": {"owner": {"id": 414}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 144, "owner": {"id": 2}, "organization": {"id": 389}, "project": {"owner": {"id": 455}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"id": 192, "owner": {"id": 56}, "organization": {"id": 129}, "project": {"owner": {"id": 444}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": 128, "owner": {"id": 77}, "organization": {"id": 387}, "project": {"owner": {"id": 443}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": 159, "owner": {"id": 91}, "organization": {"id": 149}, "project": {"owner": {"id": 492}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": 186, "owner": {"id": 60}, "organization": {"id": 394}, "project": {"owner": {"id": 446}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 126, "owner": {"id": 11}, "organization": {"id": 185}, "project": {"owner": {"id": 495}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 116, "owner": {"id": 77}, "organization": {"id": 325}, "project": {"owner": {"id": 420}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 153, "owner": {"id": 26}, "organization": {"id": 171}, "project": {"owner": {"id": 430}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 222}, "user": {"role": "worker"}}}, "resource": {"id": 102, "owner": {"id": 86}, "organization": {"id": 333}, "project": {"owner": {"id": 445}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 164, "owner": {"id": 55}, "organization": {"id": 114}, "project": {"owner": {"id": 443}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 133, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 129, "owner": {"id": 62}, "organization": {"id": 371}, "project": {"owner": {"id": 428}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 145, "owner": {"id": 71}, "organization": {"id": 134}, "project": {"owner": {"id": 498}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"id": 188, "owner": {"id": 13}, "organization": {"id": 377}, "project": {"owner": {"id": 485}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": 156, "owner": {"id": 13}, "organization": {"id": 178}, "project": {"owner": {"id": 414}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 113, "owner": {"id": 13}, "organization": {"id": 305}, "project": {"owner": {"id": 464}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": 115, "owner": {"id": 93}, "organization": {"id": 137}, "project": {"owner": {"id": 420}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"id": 156, "owner": {"id": 93}, "organization": {"id": 364}, "project": {"owner": {"id": 463}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 182, "owner": {"id": 15}, "organization": {"id": 125}, "project": {"owner": {"id": 417}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 153, "owner": {"id": 31}, "organization": {"id": 398}, "project": {"owner": {"id": 400}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 291}, "user": {"role": null}}}, "resource": {"id": 136, "owner": {"id": 34}, "organization": {"id": 147}, "project": {"owner": {"id": 410}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 196, "owner": {"id": 85}, "organization": {"id": 346}, "project": {"owner": {"id": 480}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 29, "privilege": "none"}, "organization": {"id": 117, "owner": {"id": 29}, "user": {"role": "owner"}}}, "resource": {"id": 196, "owner": {"id": 29}, "organization": {"id": 117}, "project": {"owner": {"id": 453}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 152, "owner": {"id": 87}, "organization": {"id": 358}, "project": {"owner": {"id": 466}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 156, "owner": {"id": 91}, "organization": {"id": 166}, "project": {"owner": {"id": 401}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": 110, "owner": {"id": 98}, "organization": {"id": 340}, "project": {"owner": {"id": 451}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 219}, "user": {"role": "supervisor"}}}, "resource": {"id": 107, "owner": {"id": 84}, "organization": {"id": 182}, "project": {"owner": {"id": 404}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 173, "owner": {"id": 84}, "organization": {"id": 380}, "project": {"owner": {"id": 491}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"id": 153, "owner": {"id": 70}, "organization": {"id": 138}, "project": {"owner": {"id": 489}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 278}, "user": {"role": "worker"}}}, "resource": {"id": 195, "owner": {"id": 35}, "organization": {"id": 344}, "project": {"owner": {"id": 401}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "none"}, "organization": {"id": 126, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": 118, "owner": {"id": 82}, "organization": {"id": 126}, "project": {"owner": {"id": 457}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"id": 179, "owner": {"id": 89}, "organization": {"id": 383}, "project": {"owner": {"id": 456}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"id": 151, "owner": {"id": 299}, "organization": {"id": 104}, "project": {"owner": {"id": 438}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 94}, "user": {"role": "owner"}}}, "resource": {"id": 142, "owner": {"id": 249}, "organization": {"id": 392}, "project": {"owner": {"id": 492}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 239}, "user": {"role": "maintainer"}}}, "resource": {"id": 169, "owner": {"id": 236}, "organization": {"id": 170}, "project": {"owner": {"id": 411}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"id": 166, "owner": {"id": 243}, "organization": {"id": 396}, "project": {"owner": {"id": 481}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 169, "owner": {"id": 275}, "organization": {"id": 138}, "project": {"owner": {"id": 430}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": 154, "owner": {"id": 264}, "organization": {"id": 314}, "project": {"owner": {"id": 493}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 283}, "user": {"role": "worker"}}}, "resource": {"id": 180, "owner": {"id": 264}, "organization": {"id": 196}, "project": {"owner": {"id": 415}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 115, "owner": {"id": 257}, "organization": {"id": 338}, "project": {"owner": {"id": 473}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "admin"}, "organization": {"id": 191, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 143, "owner": {"id": 230}, "organization": {"id": 191}, "project": {"owner": {"id": 474}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 44, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 185, "owner": {"id": 268}, "organization": {"id": 376}, "project": {"owner": {"id": 429}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 191, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"id": 185, "owner": {"id": 291}, "organization": {"id": 191}, "project": {"owner": {"id": 486}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 166, "owner": {"id": 294}, "organization": {"id": 331}, "project": {"owner": {"id": 413}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"id": 124, "owner": {"id": 299}, "organization": {"id": 118}, "project": {"owner": {"id": 458}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 154, "owner": {"id": 216}, "user": {"role": "maintainer"}}}, "resource": {"id": 154, "owner": {"id": 252}, "organization": {"id": 310}, "project": {"owner": {"id": 411}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"id": 160, "owner": {"id": 227}, "organization": {"id": 186}, "project": {"owner": {"id": 409}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": 151, "owner": {"id": 275}, "organization": {"id": 371}, "project": {"owner": {"id": 466}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 174, "owner": {"id": 263}, "organization": {"id": 188}, "project": {"owner": {"id": 454}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 262}, "user": {"role": "worker"}}}, "resource": {"id": 193, "owner": {"id": 253}, "organization": {"id": 320}, "project": {"owner": {"id": 418}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"id": 191, "owner": {"id": 258}, "organization": {"id": 167}, "project": {"owner": {"id": 490}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 188, "owner": {"id": 227}, "organization": {"id": 358}, "project": {"owner": {"id": 460}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 52}, "user": {"role": "owner"}}}, "resource": {"id": 171, "owner": {"id": 247}, "organization": {"id": 114}, "project": {"owner": {"id": 477}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"id": 147, "owner": {"id": 273}, "organization": {"id": 337}, "project": {"owner": {"id": 405}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 203}, "user": {"role": "maintainer"}}}, "resource": {"id": 147, "owner": {"id": 239}, "organization": {"id": 162}, "project": {"owner": {"id": 438}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"id": 118, "owner": {"id": 218}, "organization": {"id": 375}, "project": {"owner": {"id": 453}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 127, "owner": {"id": 223}, "organization": {"id": 115}, "project": {"owner": {"id": 462}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 144, "owner": {"id": 208}, "organization": {"id": 305}, "project": {"owner": {"id": 453}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 172, "owner": {"id": 257}, "organization": {"id": 192}, "project": {"owner": {"id": 448}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"id": 116, "owner": {"id": 297}, "organization": {"id": 317}, "project": {"owner": {"id": 464}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 157, "owner": {"id": 285}, "organization": {"id": 141}, "project": {"owner": {"id": 419}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "user"}, "organization": {"id": 129, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"id": 179, "owner": {"id": 285}, "organization": {"id": 379}, "project": {"owner": {"id": 452}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 194, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"id": 143, "owner": {"id": 269}, "organization": {"id": 194}, "project": {"owner": {"id": 485}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 3}, "user": {"role": "owner"}}}, "resource": {"id": 182, "owner": {"id": 211}, "organization": {"id": 321}, "project": {"owner": {"id": 490}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 115, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"id": 198, "owner": {"id": 290}, "organization": {"id": 115}, "project": {"owner": {"id": 471}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"id": 171, "owner": {"id": 210}, "organization": {"id": 324}, "project": {"owner": {"id": 479}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"id": 106, "owner": {"id": 272}, "organization": {"id": 160}, "project": {"owner": {"id": 424}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 235}, "user": {"role": "supervisor"}}}, "resource": {"id": 102, "owner": {"id": 215}, "organization": {"id": 384}, "project": {"owner": {"id": 468}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 110, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": 126, "owner": {"id": 231}, "organization": {"id": 110}, "project": {"owner": {"id": 474}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 202}, "user": {"role": "worker"}}}, "resource": {"id": 177, "owner": {"id": 241}, "organization": {"id": 351}, "project": {"owner": {"id": 475}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 240}, "user": {"role": null}}}, "resource": {"id": 143, "owner": {"id": 255}, "organization": {"id": 167}, "project": {"owner": {"id": 453}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 148, "owner": {"id": 232}, "organization": {"id": 311}, "project": {"owner": {"id": 414}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": {"id": 111, "owner": {"id": 98}, "user": {"role": "owner"}}}, "resource": {"id": 136, "owner": {"id": 218}, "organization": {"id": 111}, "project": {"owner": {"id": 432}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 139, "owner": {"id": 252}, "organization": {"id": 386}, "project": {"owner": {"id": 421}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 123, "owner": {"id": 203}, "organization": {"id": 149}, "project": {"owner": {"id": 407}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 215}, "user": {"role": "maintainer"}}}, "resource": {"id": 140, "owner": {"id": 218}, "organization": {"id": 352}, "project": {"owner": {"id": 441}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 106, "owner": {"id": 225}, "organization": {"id": 175}, "project": {"owner": {"id": 496}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 163, "owner": {"id": 265}, "organization": {"id": 396}, "project": {"owner": {"id": 464}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 107, "owner": {"id": 240}, "organization": {"id": 108}, "project": {"owner": {"id": 470}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 2, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 103, "owner": {"id": 252}, "organization": {"id": 381}, "project": {"owner": {"id": 429}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"id": 175, "owner": {"id": 286}, "organization": {"id": 171}, "project": {"owner": {"id": 431}}}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 110, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"id": 116, "owner": {"id": 238}, "organization": {"id": 372}, "project": {"owner": {"id": 452}}}}
}


# import csv
# import json
# import random
# from itertools import product
#
# NAME = "webhooks"
#
#
# def read_rules(name):
#     rules = []
#     with open(f"{name}.csv") as f:
#         reader = csv.DictReader(f)
#         for row in reader:
#             row = {k.lower(): v.lower().replace("n/a", "na") for k, v in row.items()}
#             row["limit"] = row["limit"].replace("none", "None")
#             found = False
#             for col, val in row.items():
#                 if col in ["limit", "method", "url", "resource"]:
#                     continue
#                 complex_val = [v.strip() for v in val.split(",")]
#                 if len(complex_val) > 1:
#                     found = True
#                     for item in complex_val:
#                         new_row = row.copy()
#                         new_row[col] = item
#                         rules.append(new_row)
#             if not found:
#                 rules.append(row)
#     return rules
#
#
# random.seed(42)
# simple_rules = read_rules(NAME)
# SCOPES = list({rule["scope"] for rule in simple_rules})
# CONTEXTS = ["sandbox", "organization"]
# OWNERSHIPS = ["project:owner", "owner", "none"]
# GROUPS = ["admin", "business", "user", "worker", "none"]
# ORG_ROLES = ["owner", "maintainer", "supervisor", "worker", None]
# SAME_ORG = [True, False]
#
#
# def RESOURCES(scope):
#     if scope == "list":
#         return [None]
#     elif scope == "create@project":
#         return [
#             {
#                 "owner": {"id": random.randrange(100, 200)},
#                 "assignee": {"id": random.randrange(200, 300)},
#                 "organization": {"id": random.randrange(300, 400)},
#                 "project": {"owner": {"id": random.randrange(400, 500)}},
#                 "num_resources": count,
#             }
#             for count in (0, 3, 10)
#         ]
#     elif scope == "create@organization":
#         return [
#             {
#                 "owner": {"id": random.randrange(100, 200)},
#                 "assignee": {"id": random.randrange(200, 300)},
#                 "organization": {"id": random.randrange(300, 400)},
#                 "project": None,
#                 "num_resources": count,
#             }
#             for count in (0, 3, 10)
#         ]
#     else:
#         return [
#             {
#                 "id": random.randrange(100, 200),
#                 "owner": {"id": random.randrange(200, 300)},
#                 "organization": {"id": random.randrange(300, 400)},
#                 "project": {"owner": {"id": random.randrange(400, 500)}},
#             }
#         ]
#
#
# def is_same_org(org1, org2):
#     if org1 is not None and org2 is not None:
#         return org1["id"] == org2["id"]
#     elif org1 is None and org2 is None:
#         return True
#     return False
#
#
# def eval_rule(scope, context, ownership, privilege, membership, data):
#     if privilege == "admin":
#         return True
#
#     rules = list(
#         filter(
#             lambda r: scope == r["scope"]
#             and (r["context"] == "na" or context == r["context"])
#             and (r["ownership"] == "na" or ownership == r["ownership"])
#             and (
#                 r["membership"] == "na"
#                 or ORG_ROLES.index(membership) <= ORG_ROLES.index(r["membership"])
#             )
#             and GROUPS.index(privilege) <= GROUPS.index(r["privilege"]),
#             simple_rules,
#         )
#     )
#
#     resource = data["resource"]
#
#     rules = list(
#         filter(
#             lambda r: not r["limit"] or eval(r["limit"], {"resource": resource}), rules
#         )
#     )
#     if (
#         not is_same_org(data["auth"]["organization"], data["resource"]["organization"])
#         and context != "sandbox"
#     ):
#         return False
#     return bool(rules)
#
#
# def get_data(scope, context, ownership, privilege, membership, resource, same_org):
#     data = {
#         "scope": scope,
#         "auth": {
#             "user": {"id": random.randrange(0, 100), "privilege": privilege},
#             "organization": {
#                 "id": random.randrange(100, 200),
#                 "owner": {"id": random.randrange(200, 300)},
#                 "user": {"role": membership},
#             }
#             if context == "organization"
#             else None,
#         },
#         "resource": resource,
#     }
#
#     user_id = data["auth"]["user"]["id"]
#
#     if context == "organization":
#         org_id = data["auth"]["organization"]["id"]
#         if data["auth"]["organization"]["user"]["role"] == "owner":
#             data["auth"]["organization"]["owner"]["id"] = user_id
#         if same_org:
#             data["resource"]["organization"]["id"] = org_id
#
#     if ownership == "owner":
#         data["resource"]["owner"]["id"] = user_id
#
#     if ownership == "project:owner":
#         data["resource"]["project"]["owner"]["id"] = user_id
#
#     return data
#
#
# def _get_name(prefix, **kwargs):
#     name = prefix
#     for k, v in kwargs.items():
#         prefix = "_" + str(k)
#         if isinstance(v, dict):
#             if "id" in v:
#                 v = v.copy()
#                 v.pop("id")
#             if v:
#                 name += _get_name(prefix, **v)
#         else:
#             name += "".join(
#                 map(
#                     lambda c: c if c.isalnum() else {"@": "_IN_"}.get(c, "_"),
#                     f"{prefix}_{str(v).upper()}",
#                 )
#             )
#     return name
#
#
# def get_name(scope, context, ownership, privilege, membership, resource, same_org):
#     return _get_name("test", **locals())
#
#
# def is_valid(scope, context, ownership, privilege, membership, resource, same_org):
#     if context == "sandbox" and membership:
#         return False
#     if scope == "list" and ownership != "None":
#         return False
#     if context == "sandbox" and not same_org:
#         return False
#     if scope.startswith("create") and ownership != "None":
#         return False
#
#     return True
#
#
# def gen_test_rego(name):
#     with open(f"{name}_test.gen.rego", "wt") as f:
#         f.write(f"package {name}\n\n")
#         for scope, context, ownership, privilege, membership, same_org in product(
#             SCOPES, CONTEXTS, OWNERSHIPS, GROUPS, ORG_ROLES, SAME_ORG
#         ):
#             for resource in RESOURCES(scope):
#
#                 if not is_valid(
#                     scope, context, ownership, privilege, membership, resource, same_org
#                 ):
#                     continue
#
#                 data = get_data(
#                     scope, context, ownership, privilege, membership, resource, same_org
#                 )
#                 test_name = get_name(
#                     scope, context, ownership, privilege, membership, resource, same_org
#                 )
#                 result = eval_rule(
#                     scope, context, ownership, privilege, membership, data
#                 )
#
#                 f.write(
#                     "{test_name} {{\n    {allow} with input as {data}\n}}\n\n".format(
#                         test_name=test_name,
#                         allow="allow" if result else "not allow",
#                         data=json.dumps(data),
#                     )
#                 )
#
#
# gen_test_rego(NAME)
#