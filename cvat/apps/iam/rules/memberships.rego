package memberships
import data.utils
import data.organizations

# input: {
#     "scope": <"LIST"|"UPDATE"|"VIEW"|"DELETE"> or null,
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
#         "role": <"maintainer"|"supervisor"|"worker">,
#         "user": {
#             "id": <num>
#         }
#     }
# }

default allow = false
allow {
    utils.is_admin
}

allow {
    { utils.LIST, utils.VIEW }[input.scope]
    input.auth.organization.is_owner
}

allow {
    { utils.LIST, utils.VIEW }[input.scope]
    input.auth.organization.role != null
}

allow {
    { utils.CHANGE_ROLE, utils.DELETE }[input.scope]
    input.auth.organization.is_owner
}

allow {
    { utils.CHANGE_ROLE, utils.DELETE }[input.scope]
    input.resource.role != organizations.MAINTAINER
    input.auth.organization.role == organizations.MAINTAINER
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = qobject {
    user = input.auth.user
    qobject := [ {"user_id": user.id} ]
}
