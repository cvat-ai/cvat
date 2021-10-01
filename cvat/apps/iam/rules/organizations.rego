package organizations
import data.utils

# input: {
#     "method": <"GET"|"POST"|"PATCH"|"DELETE">,
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

default allow = false
allow { # ADMIN has no restrictions
    utils.is_admin
}

allow { # CREATE one organization
    input.method == utils.POST
    input.path == ["organizations"]
    input.user.stats.orgs_count == 0
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
    org_id := format_int(input.resources.organization.id, 10)
    input.path == ["organizations", org_id]
    input.resources.organization.is_owner
}

allow { # VIEW an organization (member)
    input.method == utils.GET
    org_id := format_int(input.resources.organization.id, 10)
    input.path == ["organizations", org_id]
    input.resources.organization.role != null
}

allow { # UPDATE an organization (owner)
    input.method == utils.PATCH
    org_id := format_int(input.resources.organization.id, 10)
    input.path == ["organizations", org_id]
    input.resources.organization.is_owner
}

allow { # UPDATE an organization (maintainer)
    input.method == utils.PATCH
    org_id := format_int(input.resources.organization.id, 10)
    input.path == ["organizations", org_id]
    utils.has_privilege(utils.USER)
    input.resources.organization.role == MAINTAINER
}

allow { # DELETE an organization (owner)
    input.method == utils.DELETE
    org_id := format_int(input.resources.organization.id, 10)
    input.path == ["organizations", org_id]
    utils.has_privilege(utils.WORKER)
    input.resources.organization.is_owner
}
