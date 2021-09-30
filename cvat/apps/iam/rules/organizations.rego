package organizations
import data.utils

# input: {
#     "method": <"GET"|"POST"|...>,
#     "path": [...],
#     "user": {
#         "id": <num>
#     },
#     "context": {
#         "privilege": <"admin"|"business"|"user"|"worker"|null>,
#         "org": {
#             "id": <id>,
#             "is_owner": <true|false>,
#             "role": <"maintainer"|"supervisor"|"worker"|null>
#         }
#     },
#     "resource": {
#         "id": <id>,
#         "count": <num>,
#         "is_owner": <true|false>,
#         "role": <"maintainer"|"supervisor"|"worker"|null>
#     }
# }


MAINTAINER := "maintainer"
SUPERVISOR := "supervisor"
WORKER     := "worker"

default allow = false
allow { # ADMIN has no restrictions
    utils.is_admin
}

allow { # CREATE one organization
    input.method == utils.POST
    input.path == ["organizations"]
    input.organization.count == 0
    utils.has_privilege(utils.USER)
}

allow { # CREATE many organizations
    input.method == utils.POST
    input.path == ["organizations"]
    utils.has_privilege(utils.BUSINESS)
}

allow { # LIST organizations is always allowed, run filter to get Q object
    input.method == utils.GET
    input.path == ["organizations"]
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = qobject {
    qobject := [ {"owner_id": input.user.id}, {"members__user_id": input.user.id}, "|" ]
}

allow { # VIEW an organization (owner)
    input.method == utils.GET
    input.path == ["organizations", input.resource.id]
    input.resource.is_owner
}

allow { # VIEW an organization (member)
    input.method == utils.GET
    input.path == ["organizations", input.resource.id]
    input.resource.role != null
}

allow { # UPDATE an organization (owner)
    input.method == utils.PATCH
    input.path == ["organizations", input.resource.id]
    input.resource.is_owner
}

allow { # UPDATE an organization (maintainer)
    input.method == utils.PATCH
    input.path == ["organizations", input.resource.id]
    utils.has_privilege(utils.USER)
    input.resource.role == MAINTAINER
}

allow { # DELETE an organization (owner)
    input.method == utils.DELETE
    input.path == ["organizations", input.resource.id]
    utils.has_privilege(utils.WORKER)
    input.resource.is_owner
}
