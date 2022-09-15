package webhooks

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 155}, "organization": {"id": 135}, "project": {"owner": {"id": 11}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 134}, "organization": {"id": 196}, "project": {"owner": {"id": 31}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 172}, "organization": {"id": 278}, "project": {"owner": {"id": 63}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 148}, "organization": {"id": 243}, "project": {"owner": {"id": 62}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 101, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 133}, "organization": {"id": 101}, "project": {"owner": {"id": 71}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 230}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 176}, "organization": {"id": 110}, "project": {"owner": {"id": 24}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 160, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 192}, "organization": {"id": 252}, "project": {"owner": {"id": 88}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 257}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 171}, "organization": {"id": 297}, "project": {"owner": {"id": 91}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 102}, "organization": {"id": 139}, "project": {"owner": {"id": 31}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 74, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 128}, "organization": {"id": 147}, "project": {"owner": {"id": 74}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 42, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 267}, "project": {"owner": {"id": 42}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 154}, "organization": {"id": 295}, "project": {"owner": {"id": 58}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 268}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 132}, "organization": {"id": 195}, "project": {"owner": {"id": 15}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 192}, "organization": {"id": 188}, "project": {"owner": {"id": 97}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 124}, "organization": {"id": 227}, "project": {"owner": {"id": 75}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 161}, "organization": {"id": 235}, "project": {"owner": {"id": 76}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 268}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 124}, "organization": {"id": 190}, "project": {"owner": {"id": 1}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 205}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 146}, "organization": {"id": 135}, "project": {"owner": {"id": 16}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 96, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 106}, "organization": {"id": 270}, "project": {"owner": {"id": 96}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 189}, "organization": {"id": 216}, "project": {"owner": {"id": 1}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 161, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 160}, "organization": {"id": 161}, "project": {"owner": {"id": 32}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 8}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 143}, "organization": {"id": 151}, "project": {"owner": {"id": 8}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 172, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 109}, "organization": {"id": 273}, "project": {"owner": {"id": 19}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 10}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 187}, "organization": {"id": 206}, "project": {"owner": {"id": 10}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 199, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 171}, "organization": {"id": 199}, "project": {"owner": {"id": 28}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 157, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 177}, "organization": {"id": 157}, "project": {"owner": {"id": 48}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 138}, "organization": {"id": 275}, "project": {"owner": {"id": 7}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 197, "owner": {"id": 226}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 139}, "organization": {"id": 272}, "project": {"owner": {"id": 12}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 180}, "organization": {"id": 122}, "project": {"owner": {"id": 30}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 120}, "project": {"owner": {"id": 9}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 236}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 152}, "organization": {"id": 257}, "project": {"owner": {"id": 4}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 289}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 176}, "organization": {"id": 260}, "project": {"owner": {"id": 90}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 75, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 158}, "organization": {"id": 184}, "project": {"owner": {"id": 75}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 269}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 129}, "organization": {"id": 114}, "project": {"owner": {"id": 54}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 121, "owner": {"id": 239}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 128}, "organization": {"id": 282}, "project": {"owner": {"id": 7}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 134}, "organization": {"id": 218}, "project": {"owner": {"id": 76}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 151, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 136}, "organization": {"id": 151}, "project": {"owner": {"id": 89}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 64, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 159}, "organization": {"id": 169}, "project": {"owner": {"id": 64}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 156}, "organization": {"id": 210}, "project": {"owner": {"id": 41}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 105}, "organization": {"id": 255}, "project": {"owner": {"id": 3}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 186}, "organization": {"id": 173}, "project": {"owner": {"id": 34}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 97, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 102}, "organization": {"id": 196}, "project": {"owner": {"id": 97}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 160}, "organization": {"id": 266}, "project": {"owner": {"id": 74}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 156}, "organization": {"id": 235}, "project": {"owner": {"id": 62}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 20, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 252}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 144}, "organization": {"id": 142}, "project": {"owner": {"id": 20}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 88, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 141}, "organization": {"id": 163}, "project": {"owner": {"id": 88}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 251}, "project": {"owner": {"id": 11}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 204}, "project": {"owner": {"id": 41}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 151}, "organization": {"id": 106}, "project": {"owner": {"id": 52}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 146}, "project": {"owner": {"id": 66}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 196}, "organization": {"id": 263}, "project": {"owner": {"id": 26}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 156}, "organization": {"id": 297}, "project": {"owner": {"id": 16}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 30, "privilege": "user"}, "organization": {"id": 190, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 189}, "organization": {"id": 190}, "project": {"owner": {"id": 30}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 170, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 103}, "organization": {"id": 170}, "project": {"owner": {"id": 39}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 15, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 252}, "project": {"owner": {"id": 15}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 237}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 128}, "organization": {"id": 214}, "project": {"owner": {"id": 63}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 31, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 270}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 165}, "organization": {"id": 158}, "project": {"owner": {"id": 31}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 153}, "organization": {"id": 149}, "project": {"owner": {"id": 18}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 176}, "organization": {"id": 265}, "project": {"owner": {"id": 98}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 64, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 117}, "organization": {"id": 208}, "project": {"owner": {"id": 64}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 136}, "organization": {"id": 119}, "project": {"owner": {"id": 62}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 175}, "organization": {"id": 161}, "project": {"owner": {"id": 68}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 142}, "organization": {"id": 270}, "project": {"owner": {"id": 41}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 30}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 169}, "organization": {"id": 248}, "project": {"owner": {"id": 30}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 129}, "organization": {"id": 190}, "project": {"owner": {"id": 60}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 184, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 105}, "organization": {"id": 184}, "project": {"owner": {"id": 49}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 119}, "organization": {"id": 263}, "project": {"owner": {"id": 42}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 12, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 258}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 116}, "organization": {"id": 264}, "project": {"owner": {"id": 12}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 233}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 101}, "organization": {"id": 160}, "project": {"owner": {"id": 9}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 288}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 152}, "organization": {"id": 179}, "project": {"owner": {"id": 43}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 150}, "organization": {"id": 283}, "project": {"owner": {"id": 48}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 197, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 142}, "organization": {"id": 286}, "project": {"owner": {"id": 91}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 136, "owner": {"id": 229}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 169}, "organization": {"id": 136}, "project": {"owner": {"id": 87}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 95, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 108}, "organization": {"id": 111}, "project": {"owner": {"id": 95}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 112}, "organization": {"id": 297}, "project": {"owner": {"id": 21}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 3, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 190}, "organization": {"id": 212}, "project": {"owner": {"id": 3}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 107}, "organization": {"id": 167}, "project": {"owner": {"id": 31}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 187, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 187}, "project": {"owner": {"id": 72}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 87, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 121}, "organization": {"id": 222}, "project": {"owner": {"id": 87}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 74, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 229}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 178}, "organization": {"id": 248}, "project": {"owner": {"id": 74}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 159}, "organization": {"id": 159}, "project": {"owner": {"id": 1}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 158}, "organization": {"id": 169}, "project": {"owner": {"id": 86}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 109}, "organization": {"id": 256}, "project": {"owner": {"id": 54}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 138, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 175}, "organization": {"id": 238}, "project": {"owner": {"id": 58}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 149}, "organization": {"id": 173}, "project": {"owner": {"id": 45}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 137, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 130}, "organization": {"id": 137}, "project": {"owner": {"id": 89}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 206}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 250}, "project": {"owner": {"id": 99}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 101}, "organization": {"id": 272}, "project": {"owner": {"id": 77}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 136}, "organization": {"id": 124}, "project": {"owner": {"id": 81}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 296}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 177}, "organization": {"id": 186}, "project": {"owner": {"id": 32}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 12, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 282}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 192}, "organization": {"id": 298}, "project": {"owner": {"id": 12}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 187}, "organization": {"id": 217}, "project": {"owner": {"id": 5}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 104}, "organization": {"id": 141}, "project": {"owner": {"id": 37}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 193}, "organization": {"id": 122}, "project": {"owner": {"id": 53}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 21, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 116}, "organization": {"id": 269}, "project": {"owner": {"id": 21}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 264}, "project": {"owner": {"id": 37}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 114}, "organization": {"id": 192}, "project": {"owner": {"id": 86}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 171, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 118}, "organization": {"id": 171}, "project": {"owner": {"id": 50}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 286}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 111}, "organization": {"id": 250}, "project": {"owner": {"id": 58}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 133}, "organization": {"id": 268}, "project": {"owner": {"id": 95}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 84, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 84}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 179}, "organization": {"id": 154}, "project": {"owner": {"id": 386}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 110}, "organization": {"id": 156}, "project": {"owner": {"id": 356}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 134}, "organization": {"id": 227}, "project": {"owner": {"id": 396}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 165}, "organization": {"id": 214}, "project": {"owner": {"id": 344}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 176, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 162}, "organization": {"id": 176}, "project": {"owner": {"id": 385}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 0, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 139}, "organization": {"id": 126}, "project": {"owner": {"id": 328}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 127}, "organization": {"id": 298}, "project": {"owner": {"id": 317}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 255}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 197}, "organization": {"id": 232}, "project": {"owner": {"id": 337}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 64, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 122}, "organization": {"id": 171}, "project": {"owner": {"id": 348}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 109, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 168}, "organization": {"id": 109}, "project": {"owner": {"id": 329}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 194}, "organization": {"id": 205}, "project": {"owner": {"id": 355}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 102}, "organization": {"id": 258}, "project": {"owner": {"id": 309}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 41, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 181}, "organization": {"id": 121}, "project": {"owner": {"id": 337}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 114}, "organization": {"id": 188}, "project": {"owner": {"id": 302}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 167, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 111}, "organization": {"id": 255}, "project": {"owner": {"id": 313}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 131}, "organization": {"id": 255}, "project": {"owner": {"id": 375}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 214}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 143}, "organization": {"id": 181}, "project": {"owner": {"id": 342}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 199}, "organization": {"id": 165}, "project": {"owner": {"id": 309}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 30, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 199}, "organization": {"id": 244}, "project": {"owner": {"id": 344}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 125, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 193}, "organization": {"id": 282}, "project": {"owner": {"id": 318}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 177}, "organization": {"id": 198}, "project": {"owner": {"id": 397}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 197}, "organization": {"id": 159}, "project": {"owner": {"id": 309}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 82}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 172}, "organization": {"id": 297}, "project": {"owner": {"id": 374}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 157}, "organization": {"id": 287}, "project": {"owner": {"id": 372}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 135, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 119}, "organization": {"id": 135}, "project": {"owner": {"id": 308}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 145, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 160}, "organization": {"id": 145}, "project": {"owner": {"id": 380}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 47, "privilege": "business"}, "organization": {"id": 136, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 109}, "organization": {"id": 239}, "project": {"owner": {"id": 359}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 278}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 157}, "organization": {"id": 204}, "project": {"owner": {"id": 307}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 176}, "organization": {"id": 105}, "project": {"owner": {"id": 349}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 73, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 159}, "organization": {"id": 183}, "project": {"owner": {"id": 370}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 113, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 141}, "organization": {"id": 277}, "project": {"owner": {"id": 360}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 164}, "organization": {"id": 219}, "project": {"owner": {"id": 307}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 167, "owner": {"id": 266}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 182}, "organization": {"id": 167}, "project": {"owner": {"id": 305}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 131}, "organization": {"id": 120}, "project": {"owner": {"id": 356}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 86, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 236}, "project": {"owner": {"id": 349}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 80, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 152}, "organization": {"id": 299}, "project": {"owner": {"id": 343}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 108}, "organization": {"id": 132}, "project": {"owner": {"id": 312}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 177, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 171}, "organization": {"id": 177}, "project": {"owner": {"id": 349}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 39, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 142}, "organization": {"id": 210}, "project": {"owner": {"id": 374}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 218}, "project": {"owner": {"id": 344}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 82}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 176}, "organization": {"id": 142}, "project": {"owner": {"id": 310}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 85, "privilege": "user"}, "organization": {"id": 189, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 139}, "organization": {"id": 189}, "project": {"owner": {"id": 348}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 65}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 187}, "organization": {"id": 267}, "project": {"owner": {"id": 311}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 46}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 182}, "organization": {"id": 285}, "project": {"owner": {"id": 354}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 119, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 127}, "organization": {"id": 119}, "project": {"owner": {"id": 398}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 37, "privilege": "user"}, "organization": {"id": 112, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 162}, "organization": {"id": 112}, "project": {"owner": {"id": 328}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 43, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 198}, "organization": {"id": 269}, "project": {"owner": {"id": 394}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 204}, "project": {"owner": {"id": 384}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 21, "privilege": "user"}, "organization": {"id": 192, "owner": {"id": 256}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 119}, "organization": {"id": 192}, "project": {"owner": {"id": 323}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 188}, "organization": {"id": 152}, "project": {"owner": {"id": 379}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 186}, "organization": {"id": 292}, "project": {"owner": {"id": 330}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 29, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 156}, "organization": {"id": 278}, "project": {"owner": {"id": 336}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 56, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 139}, "organization": {"id": 159}, "project": {"owner": {"id": 324}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 36, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 248}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 199}, "project": {"owner": {"id": 373}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 17, "privilege": "user"}, "organization": {"id": 132, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 164}, "organization": {"id": 267}, "project": {"owner": {"id": 353}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 120}, "organization": {"id": 225}, "project": {"owner": {"id": 377}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 197}, "project": {"owner": {"id": 391}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 265}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 166}, "organization": {"id": 157}, "project": {"owner": {"id": 336}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 3, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 118}, "organization": {"id": 255}, "project": {"owner": {"id": 311}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 164, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 128}, "organization": {"id": 257}, "project": {"owner": {"id": 344}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 40, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 130}, "organization": {"id": 112}, "project": {"owner": {"id": 310}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 142}, "project": {"owner": {"id": 303}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 190, "owner": {"id": 97}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 117}, "organization": {"id": 204}, "project": {"owner": {"id": 336}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 160}, "organization": {"id": 289}, "project": {"owner": {"id": 317}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@project", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 110}, "organization": {"id": 177}, "project": {"owner": {"id": 332}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 54, "privilege": "worker"}, "organization": {"id": 114, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 127}, "organization": {"id": 114}, "project": {"owner": {"id": 370}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 279}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 136}, "organization": {"id": 230}, "project": {"owner": {"id": 338}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 214}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 115}, "organization": {"id": 206}, "project": {"owner": {"id": 330}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 163}, "organization": {"id": 130}, "project": {"owner": {"id": 368}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 102}, "organization": {"id": 137}, "project": {"owner": {"id": 365}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 100}, "organization": {"id": 278}, "project": {"owner": {"id": 345}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 10, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 130}, "organization": {"id": 273}, "project": {"owner": {"id": 353}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 108}, "organization": {"id": 149}, "project": {"owner": {"id": 369}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 164}, "organization": {"id": 181}, "project": {"owner": {"id": 370}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 44, "privilege": "worker"}, "organization": {"id": 130, "owner": {"id": 293}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 232}, "project": {"owner": {"id": 395}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 213}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 102}, "organization": {"id": 245}, "project": {"owner": {"id": 308}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 269}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 198}, "organization": {"id": 145}, "project": {"owner": {"id": 394}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 43, "privilege": "worker"}, "organization": {"id": 182, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 196}, "organization": {"id": 182}, "project": {"owner": {"id": 317}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 23, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 208}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 199}, "organization": {"id": 287}, "project": {"owner": {"id": 359}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 91, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 189}, "organization": {"id": 261}, "project": {"owner": {"id": 380}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 104}, "organization": {"id": 139}, "project": {"owner": {"id": 325}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 105}, "organization": {"id": 169}, "project": {"owner": {"id": 305}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 199, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 132}, "organization": {"id": 204}, "project": {"owner": {"id": 396}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 142, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 182}, "organization": {"id": 224}, "project": {"owner": {"id": 336}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 49, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 115}, "organization": {"id": 143}, "project": {"owner": {"id": 355}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 151}, "organization": {"id": 188}, "project": {"owner": {"id": 356}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 266}, "project": {"owner": {"id": 334}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 23, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 237}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 110}, "organization": {"id": 293}, "project": {"owner": {"id": 354}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 277}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 141}, "organization": {"id": 157}, "project": {"owner": {"id": 310}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 141}, "organization": {"id": 154}, "project": {"owner": {"id": 337}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 45, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 188}, "organization": {"id": 256}, "project": {"owner": {"id": 344}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 207}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 157}, "organization": {"id": 205}, "project": {"owner": {"id": 393}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 186, "owner": {"id": 220}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 109}, "organization": {"id": 186}, "project": {"owner": {"id": 381}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 118, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 151}, "organization": {"id": 118}, "project": {"owner": {"id": 365}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 246}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 186}, "organization": {"id": 256}, "project": {"owner": {"id": 304}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 46, "privilege": "none"}, "organization": {"id": 149, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 116}, "organization": {"id": 208}, "project": {"owner": {"id": 330}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 104}, "organization": {"id": 156}, "project": {"owner": {"id": 319}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 9, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 186}, "organization": {"id": 173}, "project": {"owner": {"id": 347}}, "num_resources": 11}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 246}, "project": {"owner": {"id": 350}}, "num_resources": 0}}
}

test_scope_CREATE_IN_PROJECT_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@project", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 140}, "organization": {"id": 283}, "project": {"owner": {"id": 335}}, "num_resources": 11}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 146, "owner": {"id": 209}, "organization": {"id": 170}, "project": {"owner": {"id": 7}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 21}, "user": {"role": "owner"}}}, "resource": {"id": 125, "owner": {"id": 273}, "organization": {"id": 368}, "project": {"owner": {"id": 21}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "admin"}, "organization": {"id": 174, "owner": {"id": 262}, "user": {"role": "maintainer"}}}, "resource": {"id": 156, "owner": {"id": 214}, "organization": {"id": 174}, "project": {"owner": {"id": 91}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 265}, "user": {"role": "maintainer"}}}, "resource": {"id": 111, "owner": {"id": 265}, "organization": {"id": 357}, "project": {"owner": {"id": 58}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 159, "owner": {"id": 286}, "user": {"role": "supervisor"}}}, "resource": {"id": 153, "owner": {"id": 258}, "organization": {"id": 159}, "project": {"owner": {"id": 71}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 100, "owner": {"id": 295}, "user": {"role": "supervisor"}}}, "resource": {"id": 139, "owner": {"id": 292}, "organization": {"id": 302}, "project": {"owner": {"id": 32}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 127, "owner": {"id": 274}, "organization": {"id": 144}, "project": {"owner": {"id": 54}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 108, "owner": {"id": 269}, "organization": {"id": 307}, "project": {"owner": {"id": 60}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 293}, "user": {"role": null}}}, "resource": {"id": 152, "owner": {"id": 223}, "organization": {"id": 182}, "project": {"owner": {"id": 98}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 248}, "user": {"role": null}}}, "resource": {"id": 182, "owner": {"id": 253}, "organization": {"id": 347}, "project": {"owner": {"id": 57}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"id": 110, "owner": {"id": 287}, "organization": {"id": 183}, "project": {"owner": {"id": 17}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 116, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"id": 115, "owner": {"id": 222}, "organization": {"id": 368}, "project": {"owner": {"id": 67}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 128, "owner": {"id": 200}, "organization": {"id": 159}, "project": {"owner": {"id": 38}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 231}, "user": {"role": "maintainer"}}}, "resource": {"id": 192, "owner": {"id": 269}, "organization": {"id": 354}, "project": {"owner": {"id": 48}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 158, "owner": {"id": 244}, "organization": {"id": 192}, "project": {"owner": {"id": 24}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 114, "owner": {"id": 204}, "organization": {"id": 384}, "project": {"owner": {"id": 78}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 104, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 130, "owner": {"id": 226}, "organization": {"id": 104}, "project": {"owner": {"id": 76}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"id": 176, "owner": {"id": 286}, "organization": {"id": 390}, "project": {"owner": {"id": 31}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 196, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"id": 151, "owner": {"id": 256}, "organization": {"id": 196}, "project": {"owner": {"id": 27}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 273}, "user": {"role": null}}}, "resource": {"id": 107, "owner": {"id": 217}, "organization": {"id": 364}, "project": {"owner": {"id": 29}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 141, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 140, "owner": {"id": 273}, "organization": {"id": 141}, "project": {"owner": {"id": 86}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"id": 138, "owner": {"id": 218}, "organization": {"id": 384}, "project": {"owner": {"id": 28}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 122, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": 135, "owner": {"id": 207}, "organization": {"id": 122}, "project": {"owner": {"id": 94}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 6, "privilege": "user"}, "organization": {"id": 144, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"id": 186, "owner": {"id": 254}, "organization": {"id": 371}, "project": {"owner": {"id": 6}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 185, "owner": {"id": 248}, "organization": {"id": 153}, "project": {"owner": {"id": 89}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": 119, "owner": {"id": 238}, "organization": {"id": 348}, "project": {"owner": {"id": 96}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "user"}, "organization": {"id": 159, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 130, "owner": {"id": 228}, "organization": {"id": 159}, "project": {"owner": {"id": 18}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 67, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 171, "owner": {"id": 252}, "organization": {"id": 353}, "project": {"owner": {"id": 67}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 110, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"id": 131, "owner": {"id": 232}, "organization": {"id": 110}, "project": {"owner": {"id": 82}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "user"}, "organization": {"id": 106, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 147, "owner": {"id": 211}, "organization": {"id": 368}, "project": {"owner": {"id": 24}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"id": 148, "owner": {"id": 286}, "organization": {"id": 109}, "project": {"owner": {"id": 5}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 127, "owner": {"id": 71}, "user": {"role": "owner"}}}, "resource": {"id": 197, "owner": {"id": 275}, "organization": {"id": 392}, "project": {"owner": {"id": 71}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": 126, "owner": {"id": 242}, "organization": {"id": 124}, "project": {"owner": {"id": 27}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 189, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 115, "owner": {"id": 295}, "organization": {"id": 396}, "project": {"owner": {"id": 31}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 190, "owner": {"id": 226}, "organization": {"id": 141}, "project": {"owner": {"id": 70}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 145, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 136, "owner": {"id": 248}, "organization": {"id": 359}, "project": {"owner": {"id": 83}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 292}, "user": {"role": "worker"}}}, "resource": {"id": 133, "owner": {"id": 246}, "organization": {"id": 112}, "project": {"owner": {"id": 59}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 252}, "user": {"role": "worker"}}}, "resource": {"id": 160, "owner": {"id": 297}, "organization": {"id": 340}, "project": {"owner": {"id": 47}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"id": 105, "owner": {"id": 272}, "organization": {"id": 102}, "project": {"owner": {"id": 18}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 219}, "user": {"role": null}}}, "resource": {"id": 170, "owner": {"id": 274}, "organization": {"id": 374}, "project": {"owner": {"id": 53}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"id": 125, "owner": {"id": 242}, "organization": {"id": 131}, "project": {"owner": {"id": 72}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 170, "owner": {"id": 283}, "organization": {"id": 387}, "project": {"owner": {"id": 32}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 192, "owner": {"id": 282}, "organization": {"id": 121}, "project": {"owner": {"id": 58}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"id": 145, "owner": {"id": 221}, "organization": {"id": 317}, "project": {"owner": {"id": 69}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 169, "owner": {"id": 282}, "organization": {"id": 109}, "project": {"owner": {"id": 4}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 17, "privilege": "none"}, "organization": {"id": 180, "owner": {"id": 229}, "user": {"role": "supervisor"}}}, "resource": {"id": 106, "owner": {"id": 297}, "organization": {"id": 300}, "project": {"owner": {"id": 17}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 27, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 108, "owner": {"id": 290}, "organization": {"id": 164}, "project": {"owner": {"id": 27}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 261}, "user": {"role": "worker"}}}, "resource": {"id": 147, "owner": {"id": 207}, "organization": {"id": 379}, "project": {"owner": {"id": 85}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 252}, "user": {"role": null}}}, "resource": {"id": 184, "owner": {"id": 262}, "organization": {"id": 170}, "project": {"owner": {"id": 68}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": 101, "owner": {"id": 202}, "organization": {"id": 367}, "project": {"owner": {"id": 35}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 55}, "user": {"role": "owner"}}}, "resource": {"id": 102, "owner": {"id": 55}, "organization": {"id": 122}, "project": {"owner": {"id": 486}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 24, "privilege": "admin"}, "organization": {"id": 179, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"id": 112, "owner": {"id": 24}, "organization": {"id": 319}, "project": {"owner": {"id": 430}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 132, "owner": {"id": 10}, "organization": {"id": 147}, "project": {"owner": {"id": 450}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 287}, "user": {"role": "maintainer"}}}, "resource": {"id": 158, "owner": {"id": 28}, "organization": {"id": 331}, "project": {"owner": {"id": 489}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "admin"}, "organization": {"id": 111, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"id": 110, "owner": {"id": 4}, "organization": {"id": 111}, "project": {"owner": {"id": 497}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": {"id": 181, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 148, "owner": {"id": 7}, "organization": {"id": 370}, "project": {"owner": {"id": 460}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"id": 189, "owner": {"id": 55}, "organization": {"id": 182}, "project": {"owner": {"id": 463}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 127, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 172, "owner": {"id": 29}, "organization": {"id": 367}, "project": {"owner": {"id": 405}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 187, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"id": 172, "owner": {"id": 9}, "organization": {"id": 187}, "project": {"owner": {"id": 405}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"id": 169, "owner": {"id": 22}, "organization": {"id": 384}, "project": {"owner": {"id": 404}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 91, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 91}, "user": {"role": "owner"}}}, "resource": {"id": 126, "owner": {"id": 91}, "organization": {"id": 150}, "project": {"owner": {"id": 496}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"id": 138, "owner": {"id": 72}, "organization": {"id": 372}, "project": {"owner": {"id": 430}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"id": 169, "owner": {"id": 94}, "organization": {"id": 117}, "project": {"owner": {"id": 496}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 44, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 192, "owner": {"id": 44}, "organization": {"id": 364}, "project": {"owner": {"id": 495}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 155, "owner": {"id": 77}, "organization": {"id": 198}, "project": {"owner": {"id": 443}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": 176, "owner": {"id": 3}, "organization": {"id": 399}, "project": {"owner": {"id": 441}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"id": 157, "owner": {"id": 70}, "organization": {"id": 148}, "project": {"owner": {"id": 445}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 298}, "user": {"role": "worker"}}}, "resource": {"id": 123, "owner": {"id": 48}, "organization": {"id": 374}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"id": 179, "owner": {"id": 9}, "organization": {"id": 110}, "project": {"owner": {"id": 491}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": 119, "owner": {"id": 19}, "organization": {"id": 391}, "project": {"owner": {"id": 481}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "user"}, "organization": {"id": 139, "owner": {"id": 0}, "user": {"role": "owner"}}}, "resource": {"id": 140, "owner": {"id": 0}, "organization": {"id": 139}, "project": {"owner": {"id": 411}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"id": 146, "owner": {"id": 16}, "organization": {"id": 334}, "project": {"owner": {"id": 413}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 65, "privilege": "user"}, "organization": {"id": 152, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 155, "owner": {"id": 65}, "organization": {"id": 152}, "project": {"owner": {"id": 471}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 276}, "user": {"role": "maintainer"}}}, "resource": {"id": 103, "owner": {"id": 11}, "organization": {"id": 345}, "project": {"owner": {"id": 470}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 141, "owner": {"id": 52}, "organization": {"id": 149}, "project": {"owner": {"id": 437}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 110, "owner": {"id": 73}, "organization": {"id": 371}, "project": {"owner": {"id": 431}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 187, "owner": {"id": 34}, "organization": {"id": 138}, "project": {"owner": {"id": 417}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 135, "owner": {"id": 253}, "user": {"role": "worker"}}}, "resource": {"id": 163, "owner": {"id": 55}, "organization": {"id": 308}, "project": {"owner": {"id": 421}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 138, "owner": {"id": 32}, "organization": {"id": 131}, "project": {"owner": {"id": 446}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"id": 180, "owner": {"id": 25}, "organization": {"id": 376}, "project": {"owner": {"id": 478}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 42, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 42}, "user": {"role": "owner"}}}, "resource": {"id": 117, "owner": {"id": 42}, "organization": {"id": 179}, "project": {"owner": {"id": 450}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 83, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": 142, "owner": {"id": 83}, "organization": {"id": 342}, "project": {"owner": {"id": 455}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 161, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": 138, "owner": {"id": 25}, "organization": {"id": 161}, "project": {"owner": {"id": 488}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 188, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 122, "owner": {"id": 94}, "organization": {"id": 340}, "project": {"owner": {"id": 437}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 135, "owner": {"id": 250}, "user": {"role": "supervisor"}}}, "resource": {"id": 162, "owner": {"id": 48}, "organization": {"id": 135}, "project": {"owner": {"id": 441}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"id": 146, "owner": {"id": 75}, "organization": {"id": 372}, "project": {"owner": {"id": 425}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 159, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 187, "owner": {"id": 93}, "organization": {"id": 159}, "project": {"owner": {"id": 403}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 152, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 126, "owner": {"id": 8}, "organization": {"id": 337}, "project": {"owner": {"id": 488}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 30, "privilege": "worker"}, "organization": {"id": 132, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 163, "owner": {"id": 30}, "organization": {"id": 132}, "project": {"owner": {"id": 438}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 9, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"id": 119, "owner": {"id": 9}, "organization": {"id": 354}, "project": {"owner": {"id": 448}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 64, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 64}, "user": {"role": "owner"}}}, "resource": {"id": 161, "owner": {"id": 64}, "organization": {"id": 188}, "project": {"owner": {"id": 468}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 68}, "user": {"role": "owner"}}}, "resource": {"id": 169, "owner": {"id": 68}, "organization": {"id": 346}, "project": {"owner": {"id": 489}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": 110, "owner": {"id": 84}, "organization": {"id": 185}, "project": {"owner": {"id": 431}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 121, "owner": {"id": 72}, "organization": {"id": 378}, "project": {"owner": {"id": 405}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "none"}, "organization": {"id": 113, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 182, "owner": {"id": 55}, "organization": {"id": 113}, "project": {"owner": {"id": 442}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 166, "owner": {"id": 271}, "user": {"role": "supervisor"}}}, "resource": {"id": 112, "owner": {"id": 95}, "organization": {"id": 328}, "project": {"owner": {"id": 465}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": 174, "owner": {"id": 57}, "organization": {"id": 147}, "project": {"owner": {"id": 428}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 164, "owner": {"id": 219}, "user": {"role": "worker"}}}, "resource": {"id": 159, "owner": {"id": 88}, "organization": {"id": 386}, "project": {"owner": {"id": 475}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 37, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 144, "owner": {"id": 37}, "organization": {"id": 153}, "project": {"owner": {"id": 413}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"id": 114, "owner": {"id": 39}, "organization": {"id": 318}, "project": {"owner": {"id": 444}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 60, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 60}, "user": {"role": "owner"}}}, "resource": {"id": 126, "owner": {"id": 266}, "organization": {"id": 112}, "project": {"owner": {"id": 444}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 8, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 8}, "user": {"role": "owner"}}}, "resource": {"id": 192, "owner": {"id": 289}, "organization": {"id": 357}, "project": {"owner": {"id": 440}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 190, "owner": {"id": 214}, "organization": {"id": 113}, "project": {"owner": {"id": 443}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 170, "owner": {"id": 220}, "user": {"role": "maintainer"}}}, "resource": {"id": 121, "owner": {"id": 294}, "organization": {"id": 331}, "project": {"owner": {"id": 466}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 151, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 142, "owner": {"id": 271}, "organization": {"id": 151}, "project": {"owner": {"id": 459}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 150, "owner": {"id": 203}, "user": {"role": "supervisor"}}}, "resource": {"id": 123, "owner": {"id": 223}, "organization": {"id": 381}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 194, "owner": {"id": 278}, "organization": {"id": 154}, "project": {"owner": {"id": 457}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 35, "privilege": "admin"}, "organization": {"id": 196, "owner": {"id": 290}, "user": {"role": "worker"}}}, "resource": {"id": 100, "owner": {"id": 290}, "organization": {"id": 327}, "project": {"owner": {"id": 426}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"id": 108, "owner": {"id": 273}, "organization": {"id": 146}, "project": {"owner": {"id": 468}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 162, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"id": 125, "owner": {"id": 258}, "organization": {"id": 314}, "project": {"owner": {"id": 433}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 150, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"id": 181, "owner": {"id": 240}, "organization": {"id": 150}, "project": {"owner": {"id": 449}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": 114, "owner": {"id": 244}, "organization": {"id": 345}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 10, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"id": 190, "owner": {"id": 238}, "organization": {"id": 186}, "project": {"owner": {"id": 475}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 123, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"id": 140, "owner": {"id": 215}, "organization": {"id": 330}, "project": {"owner": {"id": 439}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 217}, "user": {"role": "supervisor"}}}, "resource": {"id": 188, "owner": {"id": 218}, "organization": {"id": 176}, "project": {"owner": {"id": 449}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 173, "owner": {"id": 249}, "organization": {"id": 354}, "project": {"owner": {"id": 423}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 21, "privilege": "business"}, "organization": {"id": 162, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 188, "owner": {"id": 282}, "organization": {"id": 162}, "project": {"owner": {"id": 471}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 79, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 117, "owner": {"id": 223}, "organization": {"id": 340}, "project": {"owner": {"id": 457}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 49, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 264}, "user": {"role": null}}}, "resource": {"id": 101, "owner": {"id": 262}, "organization": {"id": 171}, "project": {"owner": {"id": 424}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 153, "owner": {"id": 290}, "user": {"role": null}}}, "resource": {"id": 183, "owner": {"id": 263}, "organization": {"id": 352}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 103, "owner": {"id": 72}, "user": {"role": "owner"}}}, "resource": {"id": 156, "owner": {"id": 262}, "organization": {"id": 103}, "project": {"owner": {"id": 410}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 168, "owner": {"id": 28}, "user": {"role": "owner"}}}, "resource": {"id": 128, "owner": {"id": 237}, "organization": {"id": 304}, "project": {"owner": {"id": 435}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 298}, "user": {"role": "maintainer"}}}, "resource": {"id": 121, "owner": {"id": 299}, "organization": {"id": 198}, "project": {"owner": {"id": 472}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 114, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"id": 163, "owner": {"id": 270}, "organization": {"id": 365}, "project": {"owner": {"id": 414}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 297}, "user": {"role": "supervisor"}}}, "resource": {"id": 199, "owner": {"id": 269}, "organization": {"id": 105}, "project": {"owner": {"id": 469}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 192, "owner": {"id": 256}, "organization": {"id": 369}, "project": {"owner": {"id": 427}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"id": 183, "owner": {"id": 296}, "organization": {"id": 157}, "project": {"owner": {"id": 438}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"id": 144, "owner": {"id": 211}, "organization": {"id": 356}, "project": {"owner": {"id": 415}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 178, "owner": {"id": 280}, "user": {"role": null}}}, "resource": {"id": 194, "owner": {"id": 275}, "organization": {"id": 178}, "project": {"owner": {"id": 444}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 126, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"id": 154, "owner": {"id": 221}, "organization": {"id": 378}, "project": {"owner": {"id": 417}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 76, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": 172, "owner": {"id": 244}, "organization": {"id": 168}, "project": {"owner": {"id": 435}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 134, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"id": 141, "owner": {"id": 290}, "organization": {"id": 337}, "project": {"owner": {"id": 437}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "delete", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 235}, "user": {"role": "maintainer"}}}, "resource": {"id": 186, "owner": {"id": 212}, "organization": {"id": 107}, "project": {"owner": {"id": 496}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 31, "privilege": "worker"}, "organization": {"id": 118, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"id": 183, "owner": {"id": 216}, "organization": {"id": 389}, "project": {"owner": {"id": 416}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 218}, "user": {"role": "supervisor"}}}, "resource": {"id": 141, "owner": {"id": 231}, "organization": {"id": 162}, "project": {"owner": {"id": 486}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 173, "owner": {"id": 280}, "organization": {"id": 334}, "project": {"owner": {"id": 480}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 51, "privilege": "worker"}, "organization": {"id": 165, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": 109, "owner": {"id": 281}, "organization": {"id": 165}, "project": {"owner": {"id": 411}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 141, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 135, "owner": {"id": 288}, "organization": {"id": 347}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"id": 100, "owner": {"id": 299}, "organization": {"id": 158}, "project": {"owner": {"id": 411}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 227}, "user": {"role": null}}}, "resource": {"id": 185, "owner": {"id": 289}, "organization": {"id": 345}, "project": {"owner": {"id": 408}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": 154, "owner": {"id": 227}, "organization": {"id": 136}, "project": {"owner": {"id": 434}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": 170, "owner": {"id": 273}, "organization": {"id": 316}, "project": {"owner": {"id": 472}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 158, "owner": {"id": 202}, "user": {"role": "maintainer"}}}, "resource": {"id": 197, "owner": {"id": 206}, "organization": {"id": 158}, "project": {"owner": {"id": 412}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 154, "owner": {"id": 225}, "user": {"role": "maintainer"}}}, "resource": {"id": 115, "owner": {"id": 220}, "organization": {"id": 356}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 211}, "user": {"role": "supervisor"}}}, "resource": {"id": 188, "owner": {"id": 216}, "organization": {"id": 135}, "project": {"owner": {"id": 438}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 47, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 283}, "user": {"role": "supervisor"}}}, "resource": {"id": 183, "owner": {"id": 246}, "organization": {"id": 332}, "project": {"owner": {"id": 410}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 192, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"id": 121, "owner": {"id": 206}, "organization": {"id": 192}, "project": {"owner": {"id": 480}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 11, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": 196, "owner": {"id": 229}, "organization": {"id": 354}, "project": {"owner": {"id": 483}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 100, "owner": {"id": 227}, "organization": {"id": 175}, "project": {"owner": {"id": 409}}, "num_resources": 0}}
}

test_scope_DELETE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "delete", "auth": {"user": {"id": 1, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 166, "owner": {"id": 287}, "organization": {"id": 356}, "project": {"owner": {"id": 401}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 89}, "user": {"role": "owner"}}}, "resource": {"id": 116, "owner": {"id": 222}, "organization": {"id": 173}, "project": {"owner": {"id": 89}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": 198, "owner": {"id": 272}, "organization": {"id": 304}, "project": {"owner": {"id": 77}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 118, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 128, "owner": {"id": 281}, "organization": {"id": 118}, "project": {"owner": {"id": 63}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 281}, "user": {"role": "maintainer"}}}, "resource": {"id": 195, "owner": {"id": 209}, "organization": {"id": 330}, "project": {"owner": {"id": 40}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 257}, "user": {"role": "supervisor"}}}, "resource": {"id": 111, "owner": {"id": 290}, "organization": {"id": 142}, "project": {"owner": {"id": 93}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "admin"}, "organization": {"id": 108, "owner": {"id": 244}, "user": {"role": "supervisor"}}}, "resource": {"id": 101, "owner": {"id": 233}, "organization": {"id": 326}, "project": {"owner": {"id": 88}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 132, "owner": {"id": 213}, "organization": {"id": 149}, "project": {"owner": {"id": 6}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "admin"}, "organization": {"id": 148, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 193, "owner": {"id": 253}, "organization": {"id": 321}, "project": {"owner": {"id": 63}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 297}, "user": {"role": null}}}, "resource": {"id": 169, "owner": {"id": 248}, "organization": {"id": 183}, "project": {"owner": {"id": 73}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": 187, "owner": {"id": 228}, "organization": {"id": 320}, "project": {"owner": {"id": 9}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 9, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 9}, "user": {"role": "owner"}}}, "resource": {"id": 102, "owner": {"id": 240}, "organization": {"id": 143}, "project": {"owner": {"id": 9}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 111, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": 148, "owner": {"id": 220}, "organization": {"id": 393}, "project": {"owner": {"id": 70}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 176, "owner": {"id": 278}, "organization": {"id": 155}, "project": {"owner": {"id": 3}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 6, "privilege": "business"}, "organization": {"id": 112, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": 121, "owner": {"id": 277}, "organization": {"id": 355}, "project": {"owner": {"id": 6}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 192, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 126, "owner": {"id": 224}, "organization": {"id": 192}, "project": {"owner": {"id": 70}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 130, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 169, "owner": {"id": 233}, "organization": {"id": 384}, "project": {"owner": {"id": 38}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "business"}, "organization": {"id": 119, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 106, "owner": {"id": 250}, "organization": {"id": 119}, "project": {"owner": {"id": 62}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": 146, "owner": {"id": 200}, "organization": {"id": 354}, "project": {"owner": {"id": 37}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 176, "owner": {"id": 261}, "organization": {"id": 126}, "project": {"owner": {"id": 3}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 250}, "user": {"role": null}}}, "resource": {"id": 181, "owner": {"id": 237}, "organization": {"id": 310}, "project": {"owner": {"id": 14}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "user"}, "organization": {"id": 182, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"id": 160, "owner": {"id": 262}, "organization": {"id": 182}, "project": {"owner": {"id": 11}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"id": 149, "owner": {"id": 223}, "organization": {"id": 347}, "project": {"owner": {"id": 47}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"id": 105, "owner": {"id": 233}, "organization": {"id": 128}, "project": {"owner": {"id": 33}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 172, "owner": {"id": 207}, "organization": {"id": 319}, "project": {"owner": {"id": 89}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"id": 110, "owner": {"id": 285}, "organization": {"id": 196}, "project": {"owner": {"id": 52}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 129, "owner": {"id": 270}, "organization": {"id": 307}, "project": {"owner": {"id": 66}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": 187, "owner": {"id": 260}, "organization": {"id": 138}, "project": {"owner": {"id": 60}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"id": 150, "owner": {"id": 291}, "organization": {"id": 304}, "project": {"owner": {"id": 73}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 186, "owner": {"id": 279}, "organization": {"id": 157}, "project": {"owner": {"id": 96}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 121, "owner": {"id": 227}, "organization": {"id": 324}, "project": {"owner": {"id": 5}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 18}, "user": {"role": "owner"}}}, "resource": {"id": 187, "owner": {"id": 255}, "organization": {"id": 176}, "project": {"owner": {"id": 18}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 140, "owner": {"id": 293}, "organization": {"id": 308}, "project": {"owner": {"id": 49}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 170, "owner": {"id": 241}, "organization": {"id": 101}, "project": {"owner": {"id": 58}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"id": 179, "owner": {"id": 275}, "organization": {"id": 366}, "project": {"owner": {"id": 14}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 97, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 213}, "user": {"role": "supervisor"}}}, "resource": {"id": 118, "owner": {"id": 272}, "organization": {"id": 112}, "project": {"owner": {"id": 97}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 172, "owner": {"id": 299}, "organization": {"id": 312}, "project": {"owner": {"id": 68}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 177, "owner": {"id": 260}, "user": {"role": "worker"}}}, "resource": {"id": 133, "owner": {"id": 249}, "organization": {"id": 177}, "project": {"owner": {"id": 73}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 277}, "user": {"role": "worker"}}}, "resource": {"id": 104, "owner": {"id": 222}, "organization": {"id": 335}, "project": {"owner": {"id": 18}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 142, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"id": 187, "owner": {"id": 288}, "organization": {"id": 142}, "project": {"owner": {"id": 50}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 202}, "user": {"role": null}}}, "resource": {"id": 130, "owner": {"id": 206}, "organization": {"id": 395}, "project": {"owner": {"id": 34}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": 143, "owner": {"id": 238}, "organization": {"id": 189}, "project": {"owner": {"id": 62}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 156, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": 112, "owner": {"id": 229}, "organization": {"id": 317}, "project": {"owner": {"id": 95}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 211}, "user": {"role": "maintainer"}}}, "resource": {"id": 141, "owner": {"id": 234}, "organization": {"id": 182}, "project": {"owner": {"id": 77}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 297}, "user": {"role": "maintainer"}}}, "resource": {"id": 124, "owner": {"id": 256}, "organization": {"id": 327}, "project": {"owner": {"id": 94}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "none"}, "organization": {"id": 108, "owner": {"id": 239}, "user": {"role": "supervisor"}}}, "resource": {"id": 166, "owner": {"id": 247}, "organization": {"id": 108}, "project": {"owner": {"id": 20}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "none"}, "organization": {"id": 167, "owner": {"id": 272}, "user": {"role": "supervisor"}}}, "resource": {"id": 190, "owner": {"id": 264}, "organization": {"id": 351}, "project": {"owner": {"id": 99}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 103, "owner": {"id": 222}, "organization": {"id": 131}, "project": {"owner": {"id": 7}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "none"}, "organization": {"id": 135, "owner": {"id": 247}, "user": {"role": "worker"}}}, "resource": {"id": 158, "owner": {"id": 206}, "organization": {"id": 346}, "project": {"owner": {"id": 25}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 187, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 159, "owner": {"id": 264}, "organization": {"id": 187}, "project": {"owner": {"id": 15}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 57, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 260}, "user": {"role": null}}}, "resource": {"id": 130, "owner": {"id": 247}, "organization": {"id": 362}, "project": {"owner": {"id": 57}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 20}, "user": {"role": "owner"}}}, "resource": {"id": 175, "owner": {"id": 20}, "organization": {"id": 133}, "project": {"owner": {"id": 444}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 49}, "user": {"role": "owner"}}}, "resource": {"id": 188, "owner": {"id": 49}, "organization": {"id": 336}, "project": {"owner": {"id": 403}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "admin"}, "organization": {"id": 128, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 173, "owner": {"id": 82}, "organization": {"id": 128}, "project": {"owner": {"id": 428}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 299}, "user": {"role": "maintainer"}}}, "resource": {"id": 126, "owner": {"id": 65}, "organization": {"id": 383}, "project": {"owner": {"id": 452}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 182, "owner": {"id": 222}, "user": {"role": "supervisor"}}}, "resource": {"id": 198, "owner": {"id": 16}, "organization": {"id": 182}, "project": {"owner": {"id": 460}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "admin"}, "organization": {"id": 139, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"id": 176, "owner": {"id": 77}, "organization": {"id": 328}, "project": {"owner": {"id": 432}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "admin"}, "organization": {"id": 144, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": 190, "owner": {"id": 48}, "organization": {"id": 144}, "project": {"owner": {"id": 454}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 86, "privilege": "admin"}, "organization": {"id": 166, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 132, "owner": {"id": 86}, "organization": {"id": 359}, "project": {"owner": {"id": 438}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"id": 150, "owner": {"id": 65}, "organization": {"id": 184}, "project": {"owner": {"id": 400}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 138, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 171, "owner": {"id": 36}, "organization": {"id": 376}, "project": {"owner": {"id": 477}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 35}, "user": {"role": "owner"}}}, "resource": {"id": 113, "owner": {"id": 35}, "organization": {"id": 181}, "project": {"owner": {"id": 443}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 138, "owner": {"id": 83}, "user": {"role": "owner"}}}, "resource": {"id": 135, "owner": {"id": 83}, "organization": {"id": 383}, "project": {"owner": {"id": 491}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": 119, "owner": {"id": 7}, "organization": {"id": 176}, "project": {"owner": {"id": 430}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 184, "owner": {"id": 92}, "organization": {"id": 387}, "project": {"owner": {"id": 417}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 51, "privilege": "business"}, "organization": {"id": 149, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"id": 163, "owner": {"id": 51}, "organization": {"id": 149}, "project": {"owner": {"id": 453}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "business"}, "organization": {"id": 143, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 104, "owner": {"id": 24}, "organization": {"id": 390}, "project": {"owner": {"id": 473}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 191, "owner": {"id": 81}, "organization": {"id": 160}, "project": {"owner": {"id": 468}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "business"}, "organization": {"id": 171, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"id": 145, "owner": {"id": 84}, "organization": {"id": 338}, "project": {"owner": {"id": 421}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 292}, "user": {"role": null}}}, "resource": {"id": 137, "owner": {"id": 94}, "organization": {"id": 133}, "project": {"owner": {"id": 416}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 42, "privilege": "business"}, "organization": {"id": 183, "owner": {"id": 211}, "user": {"role": null}}}, "resource": {"id": 171, "owner": {"id": 42}, "organization": {"id": 323}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 39, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"id": 128, "owner": {"id": 39}, "organization": {"id": 153}, "project": {"owner": {"id": 495}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 59, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": 147, "owner": {"id": 59}, "organization": {"id": 374}, "project": {"owner": {"id": 437}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 109, "owner": {"id": 260}, "user": {"role": "maintainer"}}}, "resource": {"id": 106, "owner": {"id": 79}, "organization": {"id": 109}, "project": {"owner": {"id": 474}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 167, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 124, "owner": {"id": 48}, "organization": {"id": 315}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 252}, "user": {"role": "supervisor"}}}, "resource": {"id": 152, "owner": {"id": 25}, "organization": {"id": 143}, "project": {"owner": {"id": 417}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 123, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": 172, "owner": {"id": 91}, "organization": {"id": 318}, "project": {"owner": {"id": 440}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 22, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 110, "owner": {"id": 22}, "organization": {"id": 140}, "project": {"owner": {"id": 480}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 107, "owner": {"id": 26}, "organization": {"id": 357}, "project": {"owner": {"id": 435}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 62, "privilege": "user"}, "organization": {"id": 197, "owner": {"id": 299}, "user": {"role": null}}}, "resource": {"id": 121, "owner": {"id": 62}, "organization": {"id": 197}, "project": {"owner": {"id": 420}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 251}, "user": {"role": null}}}, "resource": {"id": 111, "owner": {"id": 81}, "organization": {"id": 378}, "project": {"owner": {"id": 455}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 168, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"id": 154, "owner": {"id": 4}, "organization": {"id": 168}, "project": {"owner": {"id": 400}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 96, "privilege": "worker"}, "organization": {"id": 167, "owner": {"id": 96}, "user": {"role": "owner"}}}, "resource": {"id": 193, "owner": {"id": 96}, "organization": {"id": 301}, "project": {"owner": {"id": 441}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": 102, "owner": {"id": 93}, "organization": {"id": 131}, "project": {"owner": {"id": 480}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 264}, "user": {"role": "maintainer"}}}, "resource": {"id": 188, "owner": {"id": 13}, "organization": {"id": 339}, "project": {"owner": {"id": 416}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 175, "owner": {"id": 5}, "organization": {"id": 138}, "project": {"owner": {"id": 408}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 67, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"id": 158, "owner": {"id": 67}, "organization": {"id": 366}, "project": {"owner": {"id": 476}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 224}, "user": {"role": "worker"}}}, "resource": {"id": 187, "owner": {"id": 45}, "organization": {"id": 196}, "project": {"owner": {"id": 462}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 121, "owner": {"id": 28}, "organization": {"id": 302}, "project": {"owner": {"id": 429}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 121, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"id": 127, "owner": {"id": 64}, "organization": {"id": 121}, "project": {"owner": {"id": 475}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 181, "owner": {"id": 232}, "user": {"role": null}}}, "resource": {"id": 146, "owner": {"id": 48}, "organization": {"id": 383}, "project": {"owner": {"id": 404}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": 198, "owner": {"id": 76}, "organization": {"id": 106}, "project": {"owner": {"id": 406}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"id": 113, "owner": {"id": 88}, "organization": {"id": 302}, "project": {"owner": {"id": 406}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 160, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": 156, "owner": {"id": 32}, "organization": {"id": 160}, "project": {"owner": {"id": 470}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 80, "privilege": "none"}, "organization": {"id": 101, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"id": 119, "owner": {"id": 80}, "organization": {"id": 388}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 134, "owner": {"id": 279}, "user": {"role": "supervisor"}}}, "resource": {"id": 153, "owner": {"id": 66}, "organization": {"id": 134}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 165, "owner": {"id": 292}, "user": {"role": "supervisor"}}}, "resource": {"id": 177, "owner": {"id": 13}, "organization": {"id": 317}, "project": {"owner": {"id": 453}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 163, "owner": {"id": 225}, "user": {"role": "worker"}}}, "resource": {"id": 179, "owner": {"id": 13}, "organization": {"id": 163}, "project": {"owner": {"id": 414}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 125, "owner": {"id": 245}, "user": {"role": "worker"}}}, "resource": {"id": 177, "owner": {"id": 66}, "organization": {"id": 399}, "project": {"owner": {"id": 433}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 170, "owner": {"id": 263}, "user": {"role": null}}}, "resource": {"id": 190, "owner": {"id": 5}, "organization": {"id": 170}, "project": {"owner": {"id": 420}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 201}, "user": {"role": null}}}, "resource": {"id": 126, "owner": {"id": 30}, "organization": {"id": 361}, "project": {"owner": {"id": 442}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 85, "privilege": "admin"}, "organization": {"id": 163, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"id": 185, "owner": {"id": 211}, "organization": {"id": 163}, "project": {"owner": {"id": 473}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 92, "privilege": "admin"}, "organization": {"id": 192, "owner": {"id": 92}, "user": {"role": "owner"}}}, "resource": {"id": 111, "owner": {"id": 299}, "organization": {"id": 365}, "project": {"owner": {"id": 409}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"id": 132, "owner": {"id": 282}, "organization": {"id": 133}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 37, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 106, "owner": {"id": 212}, "organization": {"id": 322}, "project": {"owner": {"id": 405}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 12, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 140, "owner": {"id": 254}, "organization": {"id": 197}, "project": {"owner": {"id": 414}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 142, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"id": 101, "owner": {"id": 217}, "organization": {"id": 384}, "project": {"owner": {"id": 482}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 147, "owner": {"id": 243}, "user": {"role": "worker"}}}, "resource": {"id": 156, "owner": {"id": 279}, "organization": {"id": 147}, "project": {"owner": {"id": 493}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "admin"}, "organization": {"id": 134, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 123, "owner": {"id": 214}, "organization": {"id": 351}, "project": {"owner": {"id": 451}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 216}, "user": {"role": null}}}, "resource": {"id": 188, "owner": {"id": 261}, "organization": {"id": 114}, "project": {"owner": {"id": 483}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 275}, "user": {"role": null}}}, "resource": {"id": 189, "owner": {"id": 292}, "organization": {"id": 307}, "project": {"owner": {"id": 420}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 23}, "user": {"role": "owner"}}}, "resource": {"id": 161, "owner": {"id": 272}, "organization": {"id": 178}, "project": {"owner": {"id": 456}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 193, "owner": {"id": 87}, "user": {"role": "owner"}}}, "resource": {"id": 199, "owner": {"id": 245}, "organization": {"id": 378}, "project": {"owner": {"id": 403}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 161, "owner": {"id": 262}, "organization": {"id": 105}, "project": {"owner": {"id": 452}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 186, "owner": {"id": 267}, "user": {"role": "maintainer"}}}, "resource": {"id": 133, "owner": {"id": 283}, "organization": {"id": 340}, "project": {"owner": {"id": 401}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 128, "owner": {"id": 285}, "user": {"role": "supervisor"}}}, "resource": {"id": 198, "owner": {"id": 295}, "organization": {"id": 128}, "project": {"owner": {"id": 492}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 89, "privilege": "business"}, "organization": {"id": 179, "owner": {"id": 212}, "user": {"role": "supervisor"}}}, "resource": {"id": 143, "owner": {"id": 266}, "organization": {"id": 366}, "project": {"owner": {"id": 488}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 155, "owner": {"id": 284}, "organization": {"id": 144}, "project": {"owner": {"id": 431}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 206}, "user": {"role": "worker"}}}, "resource": {"id": 186, "owner": {"id": 282}, "organization": {"id": 349}, "project": {"owner": {"id": 419}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 60, "privilege": "business"}, "organization": {"id": 163, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 101, "owner": {"id": 282}, "organization": {"id": 163}, "project": {"owner": {"id": 464}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 142, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"id": 109, "owner": {"id": 296}, "organization": {"id": 362}, "project": {"owner": {"id": 441}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 82}, "user": {"role": "owner"}}}, "resource": {"id": 106, "owner": {"id": 264}, "organization": {"id": 148}, "project": {"owner": {"id": 470}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 73, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 73}, "user": {"role": "owner"}}}, "resource": {"id": 130, "owner": {"id": 210}, "organization": {"id": 358}, "project": {"owner": {"id": 456}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 195, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 163, "owner": {"id": 257}, "organization": {"id": 195}, "project": {"owner": {"id": 415}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 4, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 270}, "user": {"role": "maintainer"}}}, "resource": {"id": 102, "owner": {"id": 213}, "organization": {"id": 351}, "project": {"owner": {"id": 452}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 138, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"id": 100, "owner": {"id": 211}, "organization": {"id": 138}, "project": {"owner": {"id": 479}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 58, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 246}, "user": {"role": "supervisor"}}}, "resource": {"id": 171, "owner": {"id": 226}, "organization": {"id": 383}, "project": {"owner": {"id": 485}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 279}, "user": {"role": "worker"}}}, "resource": {"id": 106, "owner": {"id": 228}, "organization": {"id": 198}, "project": {"owner": {"id": 442}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 46, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"id": 176, "owner": {"id": 260}, "organization": {"id": 391}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 28, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 243}, "user": {"role": null}}}, "resource": {"id": 114, "owner": {"id": 212}, "organization": {"id": 100}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 289}, "user": {"role": null}}}, "resource": {"id": 145, "owner": {"id": 281}, "organization": {"id": 337}, "project": {"owner": {"id": 470}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 17}, "user": {"role": "owner"}}}, "resource": {"id": 113, "owner": {"id": 205}, "organization": {"id": 191}, "project": {"owner": {"id": 463}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 78, "privilege": "worker"}, "organization": {"id": 125, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"id": 192, "owner": {"id": 252}, "organization": {"id": 313}, "project": {"owner": {"id": 432}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "update", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 191, "owner": {"id": 243}, "user": {"role": "maintainer"}}}, "resource": {"id": 115, "owner": {"id": 250}, "organization": {"id": 191}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"id": 113, "owner": {"id": 296}, "organization": {"id": 353}, "project": {"owner": {"id": 405}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 84, "privilege": "worker"}, "organization": {"id": 175, "owner": {"id": 264}, "user": {"role": "supervisor"}}}, "resource": {"id": 115, "owner": {"id": 298}, "organization": {"id": 175}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 94, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 270}, "user": {"role": "supervisor"}}}, "resource": {"id": 117, "owner": {"id": 263}, "organization": {"id": 300}, "project": {"owner": {"id": 467}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 99, "privilege": "worker"}, "organization": {"id": 122, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 155, "owner": {"id": 274}, "organization": {"id": 122}, "project": {"owner": {"id": 465}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 13, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 284}, "user": {"role": "worker"}}}, "resource": {"id": 174, "owner": {"id": 222}, "organization": {"id": 393}, "project": {"owner": {"id": 416}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 49, "privilege": "worker"}, "organization": {"id": 153, "owner": {"id": 277}, "user": {"role": null}}}, "resource": {"id": 176, "owner": {"id": 277}, "organization": {"id": 153}, "project": {"owner": {"id": 464}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 50, "privilege": "worker"}, "organization": {"id": 143, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": 188, "owner": {"id": 297}, "organization": {"id": 331}, "project": {"owner": {"id": 435}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 77, "privilege": "none"}, "organization": {"id": 189, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": 157, "owner": {"id": 217}, "organization": {"id": 189}, "project": {"owner": {"id": 452}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 40, "privilege": "none"}, "organization": {"id": 191, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"id": 165, "owner": {"id": 238}, "organization": {"id": 389}, "project": {"owner": {"id": 470}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 179, "owner": {"id": 291}, "user": {"role": "maintainer"}}}, "resource": {"id": 170, "owner": {"id": 280}, "organization": {"id": 179}, "project": {"owner": {"id": 425}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 16, "privilege": "none"}, "organization": {"id": 190, "owner": {"id": 283}, "user": {"role": "maintainer"}}}, "resource": {"id": 137, "owner": {"id": 287}, "organization": {"id": 344}, "project": {"owner": {"id": 486}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 81, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": 122, "owner": {"id": 264}, "organization": {"id": 141}, "project": {"owner": {"id": 488}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 61, "privilege": "none"}, "organization": {"id": 174, "owner": {"id": 273}, "user": {"role": "supervisor"}}}, "resource": {"id": 114, "owner": {"id": 297}, "organization": {"id": 345}, "project": {"owner": {"id": 471}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 168, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 185, "owner": {"id": 290}, "organization": {"id": 168}, "project": {"owner": {"id": 486}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 218}, "user": {"role": "worker"}}}, "resource": {"id": 154, "owner": {"id": 201}, "organization": {"id": 366}, "project": {"owner": {"id": 413}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 34, "privilege": "none"}, "organization": {"id": 196, "owner": {"id": 220}, "user": {"role": null}}}, "resource": {"id": 106, "owner": {"id": 285}, "organization": {"id": 196}, "project": {"owner": {"id": 425}}, "num_resources": 0}}
}

test_scope_UPDATE_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "update", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": 136, "owner": {"id": 287}, "organization": {"id": 332}, "project": {"owner": {"id": 418}}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 22}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 173}, "organization": {"id": 199}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 45, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 183}, "organization": {"id": 141}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 110, "owner": {"id": 57}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 165}, "organization": {"id": 262}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 78}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 199}, "organization": {"id": 294}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 43, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 280}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 180}, "organization": {"id": 153}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 173, "owner": {"id": 251}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 121}, "organization": {"id": 173}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 240}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 109}, "organization": {"id": 210}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 83, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 120}, "organization": {"id": 243}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 34, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 299}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 134}, "organization": {"id": 156}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 46, "privilege": "admin"}, "organization": {"id": 195, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 182}, "organization": {"id": 195}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 23, "privilege": "admin"}, "organization": {"id": 102, "owner": {"id": 216}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 166}, "organization": {"id": 257}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 152}, "organization": {"id": 221}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 126, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 132}, "organization": {"id": 126}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 189}, "organization": {"id": 113}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 3, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 108}, "organization": {"id": 260}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 197, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 206}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 10, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 249}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 113}, "organization": {"id": 183}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_num_resources_11_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 231}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 179}, "organization": {"id": 129}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 116, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 194}, "organization": {"id": 236}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_num_resources_11_same_org_FALSE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 21, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 156}, "organization": {"id": 280}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 59, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 59}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 169}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 141}, "organization": {"id": 156}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 158, "owner": {"id": 76}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 189}, "organization": {"id": 269}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 95}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 122}, "organization": {"id": 275}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 68, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 155}, "organization": {"id": 139}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 61, "privilege": "business"}, "organization": {"id": 169, "owner": {"id": 229}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 181}, "organization": {"id": 169}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 52, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 219}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 111}, "organization": {"id": 256}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 139}, "organization": {"id": 246}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 160, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 166}, "organization": {"id": 160}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 188, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 117}, "organization": {"id": 188}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 98, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 196}, "organization": {"id": 261}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 76, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 200}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 138}, "organization": {"id": 201}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 71, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 250}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 155}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 31, "privilege": "business"}, "organization": {"id": 120, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 124}, "organization": {"id": 120}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 28, "privilege": "business"}, "organization": {"id": 133, "owner": {"id": 210}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 194}, "organization": {"id": 282}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 180, "owner": {"id": 230}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 149}, "organization": {"id": 248}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 87, "privilege": "business"}, "organization": {"id": 134, "owner": {"id": 236}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 166}, "organization": {"id": 134}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 83, "privilege": "business"}, "organization": {"id": 195, "owner": {"id": 268}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 178}, "organization": {"id": 195}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 23, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 237}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 134}, "organization": {"id": 252}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 14, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 258}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 124}, "organization": {"id": 208}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 79, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 179}, "organization": {"id": 162}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 102, "owner": {"id": 41}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 134}, "organization": {"id": 102}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 13, "privilege": "user"}, "organization": {"id": 136, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 106}, "organization": {"id": 268}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 191, "owner": {"id": 16}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 102}, "organization": {"id": 223}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 101, "owner": {"id": 263}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 193}, "organization": {"id": 101}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 253}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 129}, "organization": {"id": 143}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 242}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 139}, "organization": {"id": 263}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 196, "owner": {"id": 218}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 259}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 9, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 260}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 107}, "organization": {"id": 169}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 124, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 199}, "organization": {"id": 124}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 91, "privilege": "user"}, "organization": {"id": 131, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 148}, "organization": {"id": 201}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 156, "owner": {"id": 231}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 115}, "organization": {"id": 298}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 94, "privilege": "user"}, "organization": {"id": 198, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 194}, "organization": {"id": 198}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 66, "privilege": "user"}, "organization": {"id": 185, "owner": {"id": 226}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 125}, "organization": {"id": 185}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 41, "privilege": "user"}, "organization": {"id": 120, "owner": {"id": 280}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 160}, "organization": {"id": 249}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 93, "privilege": "user"}, "organization": {"id": 105, "owner": {"id": 295}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 187}, "organization": {"id": 239}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 181, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 170}, "organization": {"id": 181}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 25, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 115}, "organization": {"id": 146}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 155, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 185}, "organization": {"id": 227}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 1, "privilege": "user"}, "organization": {"id": 121, "owner": {"id": 235}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 114}, "organization": {"id": 230}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 174}, "organization": {"id": 105}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 88}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 150}, "organization": {"id": 160}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 131, "owner": {"id": 11}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 176}, "organization": {"id": 219}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 111, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 147}, "organization": {"id": 298}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "create@organization", "auth": {"user": {"id": 7, "privilege": "worker"}, "organization": {"id": 107, "owner": {"id": 245}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 179}, "organization": {"id": 107}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 119, "owner": {"id": 289}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 197}, "organization": {"id": 119}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 140, "owner": {"id": 271}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 168}, "organization": {"id": 213}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 82, "privilege": "worker"}, "organization": {"id": 196, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 116}, "organization": {"id": 262}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 88, "privilege": "worker"}, "organization": {"id": 148, "owner": {"id": 245}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 156}, "organization": {"id": 148}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 117, "owner": {"id": 232}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 124}, "organization": {"id": 117}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 71, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 105}, "organization": {"id": 262}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 89, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 190}, "organization": {"id": 256}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 41, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 259}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 172}, "organization": {"id": 193}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 35, "privilege": "worker"}, "organization": {"id": 176, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 169}, "organization": {"id": 176}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 233}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 120}, "organization": {"id": 208}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 69, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 219}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 48, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 100}, "organization": {"id": 193}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 179, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 181}, "organization": {"id": 179}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 108, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 199}, "organization": {"id": 279}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 130}, "organization": {"id": 241}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 70, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 70}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 119}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 163}, "organization": {"id": 141}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 66}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 182}, "organization": {"id": 241}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 5, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 5}, "user": {"role": "owner"}}}, "resource": {"id": null, "owner": {"id": 114}, "organization": {"id": 212}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 104}, "organization": {"id": 112}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 182, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 113}, "organization": {"id": 182}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 175, "owner": {"id": 232}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 184}, "organization": {"id": 262}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 6, "privilege": "none"}, "organization": {"id": 146, "owner": {"id": 228}, "user": {"role": "maintainer"}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 279}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 26, "privilege": "none"}, "organization": {"id": 183, "owner": {"id": 262}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 177}, "organization": {"id": 183}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 10, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 281}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 109}, "organization": {"id": 159}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 53, "privilege": "none"}, "organization": {"id": 147, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 107}, "organization": {"id": 246}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 7, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 234}, "user": {"role": "supervisor"}}}, "resource": {"id": null, "owner": {"id": 171}, "organization": {"id": 295}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 38, "privilege": "none"}, "organization": {"id": 109, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 167}, "organization": {"id": 109}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 66, "privilege": "none"}, "organization": {"id": 112, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 193}, "organization": {"id": 112}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 24, "privilege": "none"}, "organization": {"id": 124, "owner": {"id": 267}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 192}, "organization": {"id": 229}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": null, "owner": {"id": 168}, "organization": {"id": 249}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 295}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 180}, "organization": {"id": 153}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_num_resources_11_same_org_TRUE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 198, "owner": {"id": 281}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 171}, "organization": {"id": 198}, "num_resources": 11}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 185, "owner": {"id": 254}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 173}, "organization": {"id": 245}, "num_resources": 0}}
}

test_scope_CREATE_IN_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_num_resources_11_same_org_FALSE {
    not allow with input as {"scope": "create@organization", "auth": {"user": {"id": 13, "privilege": "none"}, "organization": {"id": 121, "owner": {"id": 223}, "user": {"role": null}}}, "resource": {"id": null, "owner": {"id": 186}, "organization": {"id": 258}, "num_resources": 11}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 6, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 6}, "user": {"role": "owner"}}}, "resource": {"id": 179, "owner": {"id": 280}, "organization": {"id": 123}, "project": {"owner": {"id": 6}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "admin"}, "organization": {"id": 104, "owner": {"id": 18}, "user": {"role": "owner"}}}, "resource": {"id": 107, "owner": {"id": 283}, "organization": {"id": 344}, "project": {"owner": {"id": 18}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 106, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 173, "owner": {"id": 277}, "organization": {"id": 106}, "project": {"owner": {"id": 11}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 178, "owner": {"id": 284}, "user": {"role": "maintainer"}}}, "resource": {"id": 153, "owner": {"id": 222}, "organization": {"id": 320}, "project": {"owner": {"id": 36}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 122, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 188, "owner": {"id": 289}, "organization": {"id": 122}, "project": {"owner": {"id": 71}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 238}, "user": {"role": "supervisor"}}}, "resource": {"id": 195, "owner": {"id": 274}, "organization": {"id": 346}, "project": {"owner": {"id": 11}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "admin"}, "organization": {"id": 154, "owner": {"id": 270}, "user": {"role": "worker"}}}, "resource": {"id": 141, "owner": {"id": 247}, "organization": {"id": 154}, "project": {"owner": {"id": 97}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "admin"}, "organization": {"id": 188, "owner": {"id": 235}, "user": {"role": "worker"}}}, "resource": {"id": 108, "owner": {"id": 237}, "organization": {"id": 360}, "project": {"owner": {"id": 15}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": {"id": 189, "owner": {"id": 226}, "user": {"role": null}}}, "resource": {"id": 142, "owner": {"id": 267}, "organization": {"id": 189}, "project": {"owner": {"id": 26}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "admin"}, "organization": {"id": 180, "owner": {"id": 267}, "user": {"role": null}}}, "resource": {"id": 178, "owner": {"id": 207}, "organization": {"id": 313}, "project": {"owner": {"id": 93}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 77}, "user": {"role": "owner"}}}, "resource": {"id": 111, "owner": {"id": 261}, "organization": {"id": 190}, "project": {"owner": {"id": 77}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "business"}, "organization": {"id": 173, "owner": {"id": 67}, "user": {"role": "owner"}}}, "resource": {"id": 154, "owner": {"id": 277}, "organization": {"id": 340}, "project": {"owner": {"id": 67}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "business"}, "organization": {"id": 166, "owner": {"id": 293}, "user": {"role": "maintainer"}}}, "resource": {"id": 145, "owner": {"id": 216}, "organization": {"id": 166}, "project": {"owner": {"id": 63}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 129, "owner": {"id": 290}, "user": {"role": "maintainer"}}}, "resource": {"id": 180, "owner": {"id": 263}, "organization": {"id": 363}, "project": {"owner": {"id": 78}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 159, "owner": {"id": 280}, "user": {"role": "supervisor"}}}, "resource": {"id": 137, "owner": {"id": 224}, "organization": {"id": 159}, "project": {"owner": {"id": 3}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 205}, "user": {"role": "supervisor"}}}, "resource": {"id": 115, "owner": {"id": 294}, "organization": {"id": 326}, "project": {"owner": {"id": 53}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 281}, "user": {"role": "worker"}}}, "resource": {"id": 142, "owner": {"id": 244}, "organization": {"id": 101}, "project": {"owner": {"id": 27}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "business"}, "organization": {"id": 139, "owner": {"id": 238}, "user": {"role": "worker"}}}, "resource": {"id": 125, "owner": {"id": 288}, "organization": {"id": 336}, "project": {"owner": {"id": 8}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "business"}, "organization": {"id": 114, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 164, "owner": {"id": 270}, "organization": {"id": 114}, "project": {"owner": {"id": 0}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "business"}, "organization": {"id": 178, "owner": {"id": 203}, "user": {"role": null}}}, "resource": {"id": 142, "owner": {"id": 243}, "organization": {"id": 350}, "project": {"owner": {"id": 72}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "user"}, "organization": {"id": 161, "owner": {"id": 86}, "user": {"role": "owner"}}}, "resource": {"id": 122, "owner": {"id": 224}, "organization": {"id": 161}, "project": {"owner": {"id": 86}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 19}, "user": {"role": "owner"}}}, "resource": {"id": 104, "owner": {"id": 282}, "organization": {"id": 317}, "project": {"owner": {"id": 19}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "user"}, "organization": {"id": 107, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 168, "owner": {"id": 242}, "organization": {"id": 107}, "project": {"owner": {"id": 95}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "user"}, "organization": {"id": 171, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"id": 138, "owner": {"id": 272}, "organization": {"id": 392}, "project": {"owner": {"id": 40}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 42, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 208}, "user": {"role": "supervisor"}}}, "resource": {"id": 102, "owner": {"id": 226}, "organization": {"id": 145}, "project": {"owner": {"id": 42}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 180, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"id": 119, "owner": {"id": 235}, "organization": {"id": 303}, "project": {"owner": {"id": 48}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 176, "owner": {"id": 214}, "user": {"role": "worker"}}}, "resource": {"id": 121, "owner": {"id": 273}, "organization": {"id": 176}, "project": {"owner": {"id": 23}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "user"}, "organization": {"id": 104, "owner": {"id": 234}, "user": {"role": "worker"}}}, "resource": {"id": 196, "owner": {"id": 239}, "organization": {"id": 390}, "project": {"owner": {"id": 90}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 238}, "user": {"role": null}}}, "resource": {"id": 152, "owner": {"id": 211}, "organization": {"id": 157}, "project": {"owner": {"id": 47}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 204}, "user": {"role": null}}}, "resource": {"id": 127, "owner": {"id": 267}, "organization": {"id": 338}, "project": {"owner": {"id": 14}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 64, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 64}, "user": {"role": "owner"}}}, "resource": {"id": 199, "owner": {"id": 225}, "organization": {"id": 103}, "project": {"owner": {"id": 64}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 61}, "user": {"role": "owner"}}}, "resource": {"id": 164, "owner": {"id": 219}, "organization": {"id": 324}, "project": {"owner": {"id": 61}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 266}, "user": {"role": "maintainer"}}}, "resource": {"id": 139, "owner": {"id": 299}, "organization": {"id": 112}, "project": {"owner": {"id": 98}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 249}, "user": {"role": "maintainer"}}}, "resource": {"id": 186, "owner": {"id": 216}, "organization": {"id": 326}, "project": {"owner": {"id": 4}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 191, "owner": {"id": 266}, "organization": {"id": 105}, "project": {"owner": {"id": 39}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 113, "owner": {"id": 266}, "user": {"role": "supervisor"}}}, "resource": {"id": 176, "owner": {"id": 211}, "organization": {"id": 342}, "project": {"owner": {"id": 5}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 173, "owner": {"id": 297}, "user": {"role": "worker"}}}, "resource": {"id": 198, "owner": {"id": 284}, "organization": {"id": 173}, "project": {"owner": {"id": 2}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "worker"}, "organization": {"id": 124, "owner": {"id": 236}, "user": {"role": "worker"}}}, "resource": {"id": 139, "owner": {"id": 281}, "organization": {"id": 326}, "project": {"owner": {"id": 25}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "worker"}, "organization": {"id": 185, "owner": {"id": 215}, "user": {"role": null}}}, "resource": {"id": 135, "owner": {"id": 268}, "organization": {"id": 185}, "project": {"owner": {"id": 56}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 134, "owner": {"id": 219}, "organization": {"id": 320}, "project": {"owner": {"id": 14}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "none"}, "organization": {"id": 144, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 171, "owner": {"id": 265}, "organization": {"id": 144}, "project": {"owner": {"id": 69}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 173, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 140, "owner": {"id": 234}, "organization": {"id": 318}, "project": {"owner": {"id": 36}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 256}, "user": {"role": "maintainer"}}}, "resource": {"id": 121, "owner": {"id": 209}, "organization": {"id": 169}, "project": {"owner": {"id": 43}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 86, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 106, "owner": {"id": 216}, "organization": {"id": 303}, "project": {"owner": {"id": 86}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 290}, "user": {"role": "supervisor"}}}, "resource": {"id": 149, "owner": {"id": 206}, "organization": {"id": 122}, "project": {"owner": {"id": 50}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"id": 176, "owner": {"id": 275}, "organization": {"id": 380}, "project": {"owner": {"id": 89}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 91, "privilege": "none"}, "organization": {"id": 197, "owner": {"id": 285}, "user": {"role": "worker"}}}, "resource": {"id": 145, "owner": {"id": 239}, "organization": {"id": 197}, "project": {"owner": {"id": 91}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "none"}, "organization": {"id": 172, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"id": 168, "owner": {"id": 210}, "organization": {"id": 396}, "project": {"owner": {"id": 59}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 111, "owner": {"id": 289}, "organization": {"id": 139}, "project": {"owner": {"id": 58}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_PROJECT_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 129, "owner": {"id": 228}, "user": {"role": null}}}, "resource": {"id": 182, "owner": {"id": 290}, "organization": {"id": 398}, "project": {"owner": {"id": 60}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "admin"}, "organization": {"id": 123, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"id": 118, "owner": {"id": 50}, "organization": {"id": 123}, "project": {"owner": {"id": 446}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 103, "owner": {"id": 62}, "user": {"role": "owner"}}}, "resource": {"id": 185, "owner": {"id": 62}, "organization": {"id": 341}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "admin"}, "organization": {"id": 121, "owner": {"id": 236}, "user": {"role": "maintainer"}}}, "resource": {"id": 160, "owner": {"id": 59}, "organization": {"id": 121}, "project": {"owner": {"id": 461}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "admin"}, "organization": {"id": 165, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"id": 198, "owner": {"id": 16}, "organization": {"id": 377}, "project": {"owner": {"id": 473}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"id": 151, "owner": {"id": 71}, "organization": {"id": 183}, "project": {"owner": {"id": 441}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "admin"}, "organization": {"id": 152, "owner": {"id": 230}, "user": {"role": "supervisor"}}}, "resource": {"id": 138, "owner": {"id": 75}, "organization": {"id": 359}, "project": {"owner": {"id": 451}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 179, "owner": {"id": 61}, "organization": {"id": 149}, "project": {"owner": {"id": 420}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 155, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 143, "owner": {"id": 55}, "organization": {"id": 388}, "project": {"owner": {"id": 475}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "admin"}, "organization": {"id": 184, "owner": {"id": 285}, "user": {"role": null}}}, "resource": {"id": 143, "owner": {"id": 22}, "organization": {"id": 184}, "project": {"owner": {"id": 430}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 275}, "user": {"role": null}}}, "resource": {"id": 109, "owner": {"id": 62}, "organization": {"id": 391}, "project": {"owner": {"id": 473}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 12, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 12}, "user": {"role": "owner"}}}, "resource": {"id": 176, "owner": {"id": 12}, "organization": {"id": 156}, "project": {"owner": {"id": 471}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 13, "privilege": "business"}, "organization": {"id": 187, "owner": {"id": 13}, "user": {"role": "owner"}}}, "resource": {"id": 139, "owner": {"id": 13}, "organization": {"id": 308}, "project": {"owner": {"id": 476}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "business"}, "organization": {"id": 184, "owner": {"id": 207}, "user": {"role": "maintainer"}}}, "resource": {"id": 198, "owner": {"id": 82}, "organization": {"id": 184}, "project": {"owner": {"id": 463}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "business"}, "organization": {"id": 181, "owner": {"id": 200}, "user": {"role": "maintainer"}}}, "resource": {"id": 111, "owner": {"id": 96}, "organization": {"id": 317}, "project": {"owner": {"id": 474}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 168, "owner": {"id": 237}, "user": {"role": "supervisor"}}}, "resource": {"id": 196, "owner": {"id": 57}, "organization": {"id": 168}, "project": {"owner": {"id": 419}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "business"}, "organization": {"id": 126, "owner": {"id": 287}, "user": {"role": "supervisor"}}}, "resource": {"id": 149, "owner": {"id": 25}, "organization": {"id": 373}, "project": {"owner": {"id": 457}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "business"}, "organization": {"id": 155, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"id": 140, "owner": {"id": 38}, "organization": {"id": 155}, "project": {"owner": {"id": 486}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "business"}, "organization": {"id": 165, "owner": {"id": 251}, "user": {"role": "worker"}}}, "resource": {"id": 144, "owner": {"id": 78}, "organization": {"id": 374}, "project": {"owner": {"id": 401}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "business"}, "organization": {"id": 106, "owner": {"id": 200}, "user": {"role": null}}}, "resource": {"id": 116, "owner": {"id": 70}, "organization": {"id": 106}, "project": {"owner": {"id": 447}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "business"}, "organization": {"id": 103, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 190, "owner": {"id": 36}, "organization": {"id": 345}, "project": {"owner": {"id": 414}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 80, "privilege": "user"}, "organization": {"id": 140, "owner": {"id": 80}, "user": {"role": "owner"}}}, "resource": {"id": 155, "owner": {"id": 80}, "organization": {"id": 140}, "project": {"owner": {"id": 450}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 127, "owner": {"id": 69}, "user": {"role": "owner"}}}, "resource": {"id": 148, "owner": {"id": 69}, "organization": {"id": 348}, "project": {"owner": {"id": 455}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "user"}, "organization": {"id": 149, "owner": {"id": 246}, "user": {"role": "maintainer"}}}, "resource": {"id": 122, "owner": {"id": 71}, "organization": {"id": 149}, "project": {"owner": {"id": 424}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "user"}, "organization": {"id": 117, "owner": {"id": 201}, "user": {"role": "maintainer"}}}, "resource": {"id": 153, "owner": {"id": 16}, "organization": {"id": 336}, "project": {"owner": {"id": 485}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"id": 109, "owner": {"id": 92}, "organization": {"id": 162}, "project": {"owner": {"id": 418}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 153, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"id": 155, "owner": {"id": 82}, "organization": {"id": 310}, "project": {"owner": {"id": 417}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 23, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 265}, "user": {"role": "worker"}}}, "resource": {"id": 189, "owner": {"id": 23}, "organization": {"id": 158}, "project": {"owner": {"id": 479}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 223}, "user": {"role": "worker"}}}, "resource": {"id": 154, "owner": {"id": 45}, "organization": {"id": 357}, "project": {"owner": {"id": 449}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "user"}, "organization": {"id": 193, "owner": {"id": 230}, "user": {"role": null}}}, "resource": {"id": 154, "owner": {"id": 63}, "organization": {"id": 193}, "project": {"owner": {"id": 473}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 69, "privilege": "user"}, "organization": {"id": 173, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"id": 191, "owner": {"id": 69}, "organization": {"id": 334}, "project": {"owner": {"id": 452}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"id": 104, "owner": {"id": 90}, "organization": {"id": 147}, "project": {"owner": {"id": 461}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 18}, "user": {"role": "owner"}}}, "resource": {"id": 174, "owner": {"id": 18}, "organization": {"id": 388}, "project": {"owner": {"id": 410}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 59, "privilege": "worker"}, "organization": {"id": 166, "owner": {"id": 210}, "user": {"role": "maintainer"}}}, "resource": {"id": 167, "owner": {"id": 59}, "organization": {"id": 166}, "project": {"owner": {"id": 435}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "worker"}, "organization": {"id": 180, "owner": {"id": 294}, "user": {"role": "maintainer"}}}, "resource": {"id": 166, "owner": {"id": 60}, "organization": {"id": 311}, "project": {"owner": {"id": 431}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": {"id": 169, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 184, "owner": {"id": 81}, "organization": {"id": 169}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 199, "owner": {"id": 201}, "user": {"role": "supervisor"}}}, "resource": {"id": 139, "owner": {"id": 68}, "organization": {"id": 306}, "project": {"owner": {"id": 443}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 193, "owner": {"id": 242}, "user": {"role": "worker"}}}, "resource": {"id": 160, "owner": {"id": 73}, "organization": {"id": 193}, "project": {"owner": {"id": 460}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 288}, "user": {"role": "worker"}}}, "resource": {"id": 153, "owner": {"id": 21}, "organization": {"id": 337}, "project": {"owner": {"id": 437}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 207}, "user": {"role": null}}}, "resource": {"id": 176, "owner": {"id": 72}, "organization": {"id": 133}, "project": {"owner": {"id": 493}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 284}, "user": {"role": null}}}, "resource": {"id": 180, "owner": {"id": 73}, "organization": {"id": 374}, "project": {"owner": {"id": 421}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 162, "owner": {"id": 36}, "user": {"role": "owner"}}}, "resource": {"id": 137, "owner": {"id": 36}, "organization": {"id": 162}, "project": {"owner": {"id": 403}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "none"}, "organization": {"id": 116, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 116, "owner": {"id": 32}, "organization": {"id": 309}, "project": {"owner": {"id": 435}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "none"}, "organization": {"id": 114, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"id": 135, "owner": {"id": 94}, "organization": {"id": 114}, "project": {"owner": {"id": 401}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 157, "owner": {"id": 247}, "user": {"role": "maintainer"}}}, "resource": {"id": 122, "owner": {"id": 84}, "organization": {"id": 394}, "project": {"owner": {"id": 419}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "none"}, "organization": {"id": 123, "owner": {"id": 267}, "user": {"role": "supervisor"}}}, "resource": {"id": 122, "owner": {"id": 62}, "organization": {"id": 123}, "project": {"owner": {"id": 430}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "none"}, "organization": {"id": 119, "owner": {"id": 263}, "user": {"role": "supervisor"}}}, "resource": {"id": 104, "owner": {"id": 76}, "organization": {"id": 310}, "project": {"owner": {"id": 418}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "none"}, "organization": {"id": 184, "owner": {"id": 256}, "user": {"role": "worker"}}}, "resource": {"id": 196, "owner": {"id": 30}, "organization": {"id": 184}, "project": {"owner": {"id": 449}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 193, "owner": {"id": 244}, "user": {"role": "worker"}}}, "resource": {"id": 192, "owner": {"id": 73}, "organization": {"id": 321}, "project": {"owner": {"id": 426}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 14, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 221}, "user": {"role": null}}}, "resource": {"id": 106, "owner": {"id": 14}, "organization": {"id": 106}, "project": {"owner": {"id": 496}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_OWNER_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 60, "privilege": "none"}, "organization": {"id": 195, "owner": {"id": 296}, "user": {"role": null}}}, "resource": {"id": 159, "owner": {"id": 60}, "organization": {"id": 360}, "project": {"owner": {"id": 438}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 149, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"id": 168, "owner": {"id": 229}, "organization": {"id": 149}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 1}, "user": {"role": "owner"}}}, "resource": {"id": 133, "owner": {"id": 218}, "organization": {"id": 367}, "project": {"owner": {"id": 455}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "admin"}, "organization": {"id": 105, "owner": {"id": 212}, "user": {"role": "maintainer"}}}, "resource": {"id": 148, "owner": {"id": 286}, "organization": {"id": 105}, "project": {"owner": {"id": 467}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 234}, "user": {"role": "maintainer"}}}, "resource": {"id": 168, "owner": {"id": 281}, "organization": {"id": 345}, "project": {"owner": {"id": 455}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "admin"}, "organization": {"id": 183, "owner": {"id": 274}, "user": {"role": "supervisor"}}}, "resource": {"id": 142, "owner": {"id": 234}, "organization": {"id": 183}, "project": {"owner": {"id": 412}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "admin"}, "organization": {"id": 130, "owner": {"id": 293}, "user": {"role": "supervisor"}}}, "resource": {"id": 150, "owner": {"id": 259}, "organization": {"id": 398}, "project": {"owner": {"id": 486}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "admin"}, "organization": {"id": 143, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 186, "owner": {"id": 275}, "organization": {"id": 143}, "project": {"owner": {"id": 424}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "admin"}, "organization": {"id": 186, "owner": {"id": 201}, "user": {"role": "worker"}}}, "resource": {"id": 188, "owner": {"id": 223}, "organization": {"id": 340}, "project": {"owner": {"id": 470}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 113, "owner": {"id": 287}, "user": {"role": null}}}, "resource": {"id": 108, "owner": {"id": 201}, "organization": {"id": 113}, "project": {"owner": {"id": 412}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "admin"}, "organization": {"id": 132, "owner": {"id": 224}, "user": {"role": null}}}, "resource": {"id": 157, "owner": {"id": 244}, "organization": {"id": 328}, "project": {"owner": {"id": 492}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 176, "owner": {"id": 7}, "user": {"role": "owner"}}}, "resource": {"id": 104, "owner": {"id": 203}, "organization": {"id": 176}, "project": {"owner": {"id": 411}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 90}, "user": {"role": "owner"}}}, "resource": {"id": 127, "owner": {"id": 276}, "organization": {"id": 381}, "project": {"owner": {"id": 415}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 97, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 272}, "user": {"role": "maintainer"}}}, "resource": {"id": 177, "owner": {"id": 216}, "organization": {"id": 182}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"id": 123, "owner": {"id": 214}, "organization": {"id": 389}, "project": {"owner": {"id": 423}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 254}, "user": {"role": "supervisor"}}}, "resource": {"id": 184, "owner": {"id": 209}, "organization": {"id": 198}, "project": {"owner": {"id": 458}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 220}, "user": {"role": "supervisor"}}}, "resource": {"id": 188, "owner": {"id": 285}, "organization": {"id": 398}, "project": {"owner": {"id": 498}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "business"}, "organization": {"id": 148, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"id": 199, "owner": {"id": 209}, "organization": {"id": 148}, "project": {"owner": {"id": 499}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 156, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"id": 142, "owner": {"id": 207}, "organization": {"id": 333}, "project": {"owner": {"id": 433}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 22, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"id": 162, "owner": {"id": 225}, "organization": {"id": 182}, "project": {"owner": {"id": 450}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "business"}, "organization": {"id": 127, "owner": {"id": 278}, "user": {"role": null}}}, "resource": {"id": 113, "owner": {"id": 218}, "organization": {"id": 369}, "project": {"owner": {"id": 498}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 33, "privilege": "user"}, "organization": {"id": 113, "owner": {"id": 33}, "user": {"role": "owner"}}}, "resource": {"id": 182, "owner": {"id": 213}, "organization": {"id": 113}, "project": {"owner": {"id": 491}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 32, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 32}, "user": {"role": "owner"}}}, "resource": {"id": 109, "owner": {"id": 209}, "organization": {"id": 373}, "project": {"owner": {"id": 493}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "user"}, "organization": {"id": 100, "owner": {"id": 204}, "user": {"role": "maintainer"}}}, "resource": {"id": 102, "owner": {"id": 263}, "organization": {"id": 100}, "project": {"owner": {"id": 483}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 89, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 250}, "user": {"role": "maintainer"}}}, "resource": {"id": 185, "owner": {"id": 249}, "organization": {"id": 334}, "project": {"owner": {"id": 419}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "user"}, "organization": {"id": 162, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"id": 173, "owner": {"id": 200}, "organization": {"id": 162}, "project": {"owner": {"id": 490}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 169, "owner": {"id": 228}, "user": {"role": "supervisor"}}}, "resource": {"id": 155, "owner": {"id": 251}, "organization": {"id": 393}, "project": {"owner": {"id": 499}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 61, "privilege": "user"}, "organization": {"id": 115, "owner": {"id": 272}, "user": {"role": "worker"}}}, "resource": {"id": 100, "owner": {"id": 249}, "organization": {"id": 115}, "project": {"owner": {"id": 499}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 151, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"id": 168, "owner": {"id": 245}, "organization": {"id": 342}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "user"}, "organization": {"id": 143, "owner": {"id": 210}, "user": {"role": null}}}, "resource": {"id": 180, "owner": {"id": 282}, "organization": {"id": 143}, "project": {"owner": {"id": 446}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 125, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 158, "owner": {"id": 297}, "organization": {"id": 398}, "project": {"owner": {"id": 437}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 24, "privilege": "worker"}, "organization": {"id": 138, "owner": {"id": 24}, "user": {"role": "owner"}}}, "resource": {"id": 170, "owner": {"id": 205}, "organization": {"id": 138}, "project": {"owner": {"id": 484}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "worker"}, "organization": {"id": 162, "owner": {"id": 45}, "user": {"role": "owner"}}}, "resource": {"id": 149, "owner": {"id": 213}, "organization": {"id": 380}, "project": {"owner": {"id": 488}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "worker"}, "organization": {"id": 104, "owner": {"id": 224}, "user": {"role": "maintainer"}}}, "resource": {"id": 180, "owner": {"id": 256}, "organization": {"id": 104}, "project": {"owner": {"id": 424}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"id": 103, "owner": {"id": 292}, "organization": {"id": 375}, "project": {"owner": {"id": 430}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 68, "privilege": "worker"}, "organization": {"id": 157, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"id": 169, "owner": {"id": 282}, "organization": {"id": 157}, "project": {"owner": {"id": 463}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "worker"}, "organization": {"id": 105, "owner": {"id": 251}, "user": {"role": "supervisor"}}}, "resource": {"id": 104, "owner": {"id": 243}, "organization": {"id": 307}, "project": {"owner": {"id": 443}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "worker"}, "organization": {"id": 158, "owner": {"id": 286}, "user": {"role": "worker"}}}, "resource": {"id": 115, "owner": {"id": 227}, "organization": {"id": 158}, "project": {"owner": {"id": 485}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "worker"}, "organization": {"id": 109, "owner": {"id": 204}, "user": {"role": "worker"}}}, "resource": {"id": 168, "owner": {"id": 219}, "organization": {"id": 394}, "project": {"owner": {"id": 474}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 2, "privilege": "worker"}, "organization": {"id": 160, "owner": {"id": 279}, "user": {"role": null}}}, "resource": {"id": 194, "owner": {"id": 218}, "organization": {"id": 160}, "project": {"owner": {"id": 483}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 16, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 105, "owner": {"id": 231}, "organization": {"id": 389}, "project": {"owner": {"id": 483}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 58}, "user": {"role": "owner"}}}, "resource": {"id": 180, "owner": {"id": 206}, "organization": {"id": 178}, "project": {"owner": {"id": 412}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 63}, "user": {"role": "owner"}}}, "resource": {"id": 175, "owner": {"id": 208}, "organization": {"id": 313}, "project": {"owner": {"id": 414}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "none"}, "organization": {"id": 194, "owner": {"id": 286}, "user": {"role": "maintainer"}}}, "resource": {"id": 128, "owner": {"id": 208}, "organization": {"id": 194}, "project": {"owner": {"id": 454}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": {"id": 169, "owner": {"id": 217}, "user": {"role": "maintainer"}}}, "resource": {"id": 151, "owner": {"id": 241}, "organization": {"id": 315}, "project": {"owner": {"id": 487}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 242}, "user": {"role": "supervisor"}}}, "resource": {"id": 141, "owner": {"id": 227}, "organization": {"id": 122}, "project": {"owner": {"id": 405}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 96, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 221}, "user": {"role": "supervisor"}}}, "resource": {"id": 108, "owner": {"id": 215}, "organization": {"id": 335}, "project": {"owner": {"id": 418}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "none"}, "organization": {"id": 131, "owner": {"id": 274}, "user": {"role": "worker"}}}, "resource": {"id": 189, "owner": {"id": 247}, "organization": {"id": 131}, "project": {"owner": {"id": 421}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 78, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 299}, "user": {"role": "worker"}}}, "resource": {"id": 105, "owner": {"id": 217}, "organization": {"id": 312}, "project": {"owner": {"id": 480}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_TRUE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": {"id": 100, "owner": {"id": 222}, "user": {"role": null}}}, "resource": {"id": 120, "owner": {"id": 202}, "organization": {"id": 100}, "project": {"owner": {"id": 410}}, "num_resources": 0}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE_resource_project_num_resources_0_same_org_FALSE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 36, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 288}, "user": {"role": null}}}, "resource": {"id": 111, "owner": {"id": 290}, "organization": {"id": 383}, "project": {"owner": {"id": 475}}, "num_resources": 0}}
}

