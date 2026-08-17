package quality_requirements

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"list"> or null,
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
    utils.is_sandbox
}

allow if {
    input.scope == utils.LIST
    organizations.is_member
}

q_user_is_maintainer(user) := ["|",
    {"settings__task__owner_id": user.id},
    {"settings__task__assignee_id": user.id},
    {"settings__task__project__owner_id": user.id},
    {"settings__task__project__assignee_id": user.id},
    {"settings__project__owner_id": user.id},
    {"settings__project__assignee_id": user.id},
]

base_filter := {} if { # Django Q object to filter list of entries
    utils.is_admin
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := q_user_is_maintainer(user)
} else := {} if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := q_user_is_maintainer(user)
}

filter := utils.add_organization_filter(base_filter, [
    "settings__task__organization",
    "settings__task__project__organization",
    "settings__project__organization",
])
