package organizations

import rego.v1

import data.utils

# input: {
#     "scope": <"create"|"list"|"update"|"view"|"delete"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         },
#         "organization": null,
#     },
#     "resource": {
#         "id": <num>,
#         "owner": {
#             "id": <num>
#         },
#     }
# }

OWNER := "owner"
MAINTAINER := "maintainer"
SUPERVISOR := "supervisor"
WORKER     := "worker"

is_owner if {
    input.auth.organization.owner.id == input.auth.user.id
    input.auth.organization.user.role == OWNER
}

is_maintainer if {
    input.auth.organization.user.role == MAINTAINER
}

is_staff if {
    is_owner
}

is_staff if {
    is_maintainer
}

is_member if {
    input.auth.organization.user.role != null
}

get_priority(role) := {
    OWNER: 0,
    MAINTAINER: 50,
    SUPERVISOR: 75,
    WORKER: 100
}[role]

has_perm(role) if {
    get_priority(input.auth.organization.user.role) <= get_priority(role)
}

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
}

allow if {
    input.scope == utils.CREATE
    utils.has_perm(utils.BUSINESS)
}

filter := [] if { # Django Q object to filter list of entries
    utils.is_admin
} else := qobject if {
    user := input.auth.user
    qobject := [{"members__user_id": user.id}, {"members__is_active": true}, "&", {"owner_id": user.id}, "|" ]
}

allow if {
    input.scope == utils.LIST
}

allow if {
    input.scope == utils.VIEW
    utils.is_resource_owner
}

allow if {
    input.scope == utils.VIEW
    input.resource.user.role != null
}

allow if {
    input.scope == utils.UPDATE
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow if {
    input.scope == utils.UPDATE
    utils.has_perm(utils.WORKER)
    input.resource.user.role == MAINTAINER
}

allow if {
    input.scope == utils.DELETE
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}
