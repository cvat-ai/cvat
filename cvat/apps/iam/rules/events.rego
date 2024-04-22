package events
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

default allow = false

allow {
    utils.is_admin
}

allow {
    input.scope == utils.SEND_EVENTS
}

allow {
    input.scope == utils.DUMP_EVENTS
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.DUMP_EVENTS
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
}

filter = [] {
    utils.is_admin
    utils.is_sandbox
} else = qobject {
    utils.is_admin
    utils.is_organization
    qobject := [ {"org_id": input.auth.organization.id} ]
} else = qobject {
    utils.is_sandbox
    qobject := [ {"user_id": input.auth.user.id} ]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"org_id": input.auth.organization.id} ]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.WORKER)
    qobject := [ {"user_id": input.auth.user.id}, {"org_id": input.auth.organization.id} ]
}
