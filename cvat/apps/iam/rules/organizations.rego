package organizations
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
#         "user": {
#             "num_resources": <num>,
#             "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#         }
#     }
# }

OWNER := "owner"
MAINTAINER := "maintainer"
SUPERVISOR := "supervisor"
WORKER     := "worker"

is_owner {
    input.auth.organization.owner.id == input.auth.user.id
    input.auth.organization.user.role == OWNER
}

is_maintainer {
    input.auth.organization.user.role == MAINTAINER
}

is_staff {
    is_owner
}

is_staff {
    is_maintainer
}

is_member {
    input.auth.organization.user.role != null
}

get_priority(role) = priority {
    priority := {
        OWNER: 0,
        MAINTAINER: 50,
        SUPERVISOR: 75,
        WORKER: 100
    }[role]
}

has_perm(role) {
    get_priority(input.auth.organization.user.role) <= get_priority(role)
}

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    input.resource.user.num_resources == 0
    utils.has_perm(utils.USER)
}

allow {
    input.scope == utils.CREATE
    utils.has_perm(utils.BUSINESS)
}

allow {
    input.scope == utils.LIST
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = qobject {
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"members__user_id": user.id}, "|" ]
}

allow {
    input.scope == utils.VIEW
    utils.is_resource_owner
}

allow {
    input.scope == utils.VIEW
    input.resource.user.role != null
}

allow {
    input.scope == utils.UPDATE
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow {
    input.scope == utils.UPDATE
    utils.has_perm(utils.WORKER)
    input.resource.user.role == MAINTAINER
}

allow {
    input.scope == utils.DELETE
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}
