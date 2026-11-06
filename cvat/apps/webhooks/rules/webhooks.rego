package webhooks

import rego.v1

import data.utils
import data.organizations

# input : {
#     "scope": <"create@project" | "create@organization" | "create@server" |
#         "update" | "delete" | "list" | "view"> or null,
#     "auth": {
#         "user": {
#             "id": <num>
#             "privilege": <"admin"|"user"|"worker"> or null
#         }
#         "organization": {
#             "id": <num>,
#             "owner":
#                 "id": <num>
#             },
#             "user": {
#                 "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#             }
#         } or null,
#     },
#     "resource": {
#         "id": <num>,
#         "type": <"project"|"organization"|"server">,
#         "owner": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "project": {
#             "owner": { "id": num },
#         } or null,
#     }
# }
#

SERVER := "server"

is_project_owner if {
    input.resource.project.owner.id == input.auth.user.id
}

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope in {
        utils.CREATE_IN_PROJECT, utils.CREATE_IN_ORGANIZATION, utils.DELETE, utils.UPDATE,
        utils.VIEW
    }
    organizations.is_same_org_as_resource_with_perm(organizations.MAINTAINER)
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.CREATE_IN_PROJECT
    organizations.is_same_context_as_resource
    utils.has_perm(utils.USER)
    is_project_owner
}

allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow if {
    input.scope == utils.LIST
    organizations.is_member
}

base_filter := {} if { # Django Q object to filter list of entries
    utils.is_admin
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := ["&",
        ["~", {"type": SERVER}],
        ["|",
            {"owner_id": user.id},
            {"project__owner_id": user.id},
        ],
    ]
} else := {} if {
    utils.is_organization
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := ["|",
        {"owner_id": user.id},
        {"project__owner_id": user.id},
    ]
}

filter := utils.add_organization_filter(base_filter, ["organization"])


allow if {
    input.scope == utils.VIEW
    organizations.is_same_context_as_resource
    input.resource.type != SERVER
    utils.is_resource_owner
}

allow if {
    input.scope == utils.VIEW
    organizations.is_same_context_as_resource
    is_project_owner
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    organizations.is_same_context_as_resource
    utils.has_perm(utils.WORKER)
    input.resource.type != SERVER
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    organizations.is_same_context_as_resource
    utils.has_perm(utils.WORKER)
    is_project_owner
}
