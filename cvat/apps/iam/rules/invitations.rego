package invitations
import data.utils
import data.organizations



# input: {
#     "scope": <"LIST"|"CREATE"|"VIEW"|"RESEND"|"ACCEPT"|"DELETE"> or null,
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
#                 "role": <"maintainer"|"supervisor"|"worker"> or null
#             }
#         } or null,
#     },
#     "resource": {
#         "owner": {
#             "id": <num>
#         },
#         "invitee": {
#             "id": <num>
#         },
#         "accepted": <true|false>,
#         "role": <"maintainer"|"supervisor"|"worker">,
#         "organization": {
#             "id": <num>
#         }
#     }
# }

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.LIST
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = [] {
    utils.has_privilege(utils.USER)
    organizations.is_staff
} else = qobject {
    user := input.auth.user
    qobject := [ {"owner": user.id}, {"membership__user": user.id}, "|" ]
}

allow {
    input.scope == utils.CREATE
    utils.has_privilege(utils.USER)
    input.auth.organization.role == organizations.MAINTAINER
    input.resource.role != organizations.MAINTAINER
}

allow {
    input.scope == utils.CREATE
    utils.has_privilege(utils.USER)
    input.auth.organization.owner.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    input.resource.owner.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    input.resource.invitee.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    utils.has_privilege(utils.USER)
    organizations.is_staff
}

allow {
    input.scope == utils.RESEND
    utils.has_privilege(utils.WORKER)
    input.resource.owner.id == input.auth.user.id
}

allow {
    input.scope == utils.RESEND
    utils.has_privilege(utils.WORKER)
    organizations.is_staff
}

allow {
    input.scope == utils.DELETE
    utils.has_privilege(utils.WORKER)
    input.resource.owner.id == input.auth.user.id
}

allow {
    input.scope == utils.DELETE
    utils.has_privilege(utils.USER)
    organizations.is_staff
}

allow {
    input.scope == utils.ACCEPT
    input.resource.invitee.id == input.auth.user.id
}
