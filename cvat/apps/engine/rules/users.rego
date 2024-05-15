package users

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"list"|"view"|"delete"|"update"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
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
#     },
#     "resource": {
#         "id": <num>,
#         "membership": {
#             "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#         }
#     } or null,
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

filter := [] if { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else := qobject if {
    utils.is_sandbox
    qobject := [ {"id": input.auth.user.id} ]
} else := qobject if {
    org_id := input.auth.organization.id
    qobject := [ {"memberships__organization": org_id} ]
}

allow if {
    input.scope == utils.VIEW
    input.resource.id == input.auth.user.id
}

allow if {
    input.scope == utils.VIEW
    input.resource.membership.role != null
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    input.auth.user.id == input.resource.id
}
