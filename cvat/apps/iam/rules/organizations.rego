package organizations
import data.utils

# input: {
#     "scope": <"CREATE"|"LIST"|"UPDATE"|"VIEW"|"DELETE"> or null,
#     "user": {
#         "num_resources": <num>
#     },
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         },
#         "organization": {
#             "id": <num>,
#             "is_owner": <true|false>,
#             "owner": {
#                 "id": <num>
#             },
#             "role": <"maintainer"|"supervisor"|"worker"> or null
#         } or null,
#     },
#     "resource": {
#         "id": <num>,
#         "is_owner": <true|false>,
#         "role": <"maintainer"|"supervisor"|"worker"> or null
#     }
# }

MAINTAINER := "maintainer"
SUPERVISOR := "supervisor"
WORKER     := "worker"

is_maintainer {
    input.auth.organization.is_owner
}

is_maintainer {
    input.auth.organization.role == MAINTAINER
}

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    input.user.num_resources == 0
    utils.has_privilege(utils.USER)
}

allow {
    input.scope == utils.CREATE
    utils.has_privilege(utils.BUSINESS)
}

allow {
    input.scope == utils.LIST
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = qobject {
    user = input.auth.user
    qobject := [ {"owner_id": user.id}, {"members__user_id": user.id}, "|" ]
}

allow {
    input.scope == utils.VIEW
    input.resource.is_owner
}

allow {
    input.scope == utils.VIEW
    input.resource.role != null
}

allow {
    input.scope == utils.UPDATE
    utils.has_privilege(utils.WORKER)
    input.resource.is_owner
}

allow {
    input.scope == utils.UPDATE
    utils.has_privilege(utils.USER)
    input.resource.role == MAINTAINER
}

allow {
    input.scope == utils.DELETE
    utils.has_privilege(utils.WORKER)
    input.resource.is_owner
}
