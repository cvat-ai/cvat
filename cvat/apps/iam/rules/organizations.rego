package organizations
import data.utils

# input: {
#     "scope": <"CREATE"|"LIST"|"UPDATE"|"VIEW"|"DELETE">,
#     "path": ["organizations"] | ["organizations", "id"]
#     "user": {
#         "id": <num>,
#         "privilege": <"admin"|"business"|"user"|"worker"|null>,
#         "stats": {
#             "orgs_count": <num>
#         }
#     },
#     "organization": {
#         "id": <num>,
#         "is_owner": <true|false>,
#         "role": <"maintainer"|"supervisor"|"worker"|null>
#     } or null,
#     "resources": {
#         "organization": {
#             "id": <num>,
#             "is_owner": <true|false>,
#             "role": <"maintainer"|"supervisor"|"worker"|null>
#         }
#     }
# }

MAINTAINER := "maintainer"
SUPERVISOR := "supervisor"
WORKER     := "worker"

is_maintainer {
    input.organization.is_owner
}

is_maintainer {
    input.organization.role == MAINTAINER
}

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    input.user.stats.orgs_count == 0
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
    qobject := [ {"owner_id": input.user.id}, {"members__user_id": input.user.id}, "|" ]
}

allow {
    input.scope == utils.VIEW
    input.resources.organization.is_owner
}

allow {
    input.scope == utils.VIEW
    input.resources.organization.role != null
}

allow {
    input.scope == utils.UPDATE
    utils.has_privilege(utils.WORKER)
    input.resources.organization.is_owner
}

allow {
    input.scope == utils.UPDATE
    utils.has_privilege(utils.USER)
    input.resources.organization.role == MAINTAINER
}

allow {
    input.scope == utils.DELETE
    utils.has_privilege(utils.WORKER)
    input.resources.organization.is_owner
}
