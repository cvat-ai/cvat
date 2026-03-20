package lambda

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"list"|"view"|"call:online"|"call:offline"|"list:offline"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null
#         },
#         "organization": {
#             "id": <num>,
#             "owner": {
#                 "id": <num>
#             },
#             "user": {
#                 "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#             }
#         } or null,
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.LIST
}

allow if {
    input.scope == utils.VIEW
}

allow if {
    input.scope in {utils.CALL_ONLINE, utils.CALL_OFFLINE, utils.LIST_OFFLINE}
    utils.has_perm(utils.WORKER)
}

base_filter := {} if { # Django Q object to filter list of entries
    utils.is_admin
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := ["|",
        {"owner_id": user.id},
        {"assignee_id": user.id},
        {"project__owner_id": user.id},
        {"project__assignee_id": user.id},
    ]
} else := {} if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := ["|",
        {"owner_id": user.id},
        {"assignee_id": user.id},
        {"project__owner_id": user.id},
        {"project__assignee_id": user.id},
    ]
}

filter := utils.add_organization_filter(base_filter, [
    "organization",
    "project__organization",
])
