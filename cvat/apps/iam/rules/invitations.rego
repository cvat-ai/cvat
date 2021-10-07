package invitations
import data.utils
import data.organizations


# input: {
#     "scope": <"LIST"|"CREATE"|"VIEW"|"UPDATE"|"ACCEPT"|"DELETE">,
#     "user": {
#         "id": <num>,
#         "privilege": <"admin"|"business"|"user"|"worker"|null>,
#     },
#     "organization": {
#         "id": <num>,
#         "is_owner": <true|false>,
#             "owner": {
#                 "id": <num>
#             },
#         "role": <"maintainer"|"supervisor"|"worker"|null>
#     } or null,
#     "resources": {
#         "invitation": {
#             "id": <num>,
#             "is_owner": <true|false>,
#             "is_invitee": <true|false>,
#         }
#     }
# }

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    utils.has_privilege(utils.USER)
    organizations.is_maintainer
}

allow {
    input.scope == utils.LIST
}

allow {
    input.scope == utils.VIEW
    input.resources.invitation.is_owner
}

allow {
    input.scope == utils.VIEW
    input.resources.invitation.is_invitee
}

allow {
    input.scope == utils.VIEW
    utils.has_privilege(utils.USER)
    organizations.is_maintainer
}

allow {
    input.scope == utils.UPDATE
    utils.has_privilege(utils.WORKER)
    input.resources.invitation.is_owner
}

allow {
    input.scope == utils.UPDATE
    utils.has_privilege(utils.WORKER)
    organizations.is_maintainer
}

allow {
    input.scope == utils.ACCEPT
    input.resources.invitation.is_invitee
}

allow {
    input.scope == utils.DELETE
    utils.has_privilege(utils.WORKER)
    input.resources.invitation.is_owner
}

allow {
    input.scope == utils.DELETE
    utils.has_privilege(utils.WORKER)
    organizations.is_maintainer
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = [] {
    utils.has_privilege(utils.USER)
    organizations.is_maintainer
} else = qobject {
    user := input.auth.user
    qobject := [ {"owner": user.id}, {"membership__user": user.id}, "|" ]
}
