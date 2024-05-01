package events

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"send:events","dump:events"> or null,
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
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.SEND_EVENTS
}

allow if {
    input.scope == utils.DUMP_EVENTS
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.DUMP_EVENTS
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
}

filter := [] if {
    utils.is_admin
    utils.is_sandbox
} else := qobject if {
    utils.is_admin
    utils.is_organization
    qobject := [ {"org_id": input.auth.organization.id} ]
} else := qobject if {
    utils.is_sandbox
    qobject := [ {"user_id": input.auth.user.id} ]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"org_id": input.auth.organization.id} ]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.WORKER)
    qobject := [ {"user_id": input.auth.user.id}, {"org_id": input.auth.organization.id} ]
}
