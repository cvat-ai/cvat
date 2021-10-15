package memberships
import data.utils
import data.organizations

# input: {
#     "scope": <"list"|"change:role"|"view"|"delete"> or null,
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
#     },
#     "resource": {
#         "role": <"owner"|"maintainer"|"supervisor"|"worker">,
#         "is_active": <true|false>,
#         "user": {
#             "id": <num>
#         }
#     } or null
# }

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.LIST
    input.auth.organization == null
}

allow {
    input.scope == utils.LIST
    organizations.is_member
}

allow {
    input.scope == utils.VIEW
    organizations.is_member
}

allow {
    input.scope == utils.VIEW
    input.auth.organization == null
    input.resource.user.id == input.auth.user.id
}

allow {
    { utils.CHANGE_ROLE, utils.DELETE }[input.scope]
    organizations.is_owner
    utils.has_privilege(utils.USER)
    input.resource.role != organizations.OWNER
}

allow {
    { utils.CHANGE_ROLE, utils.DELETE }[input.scope]
    input.resource.role != organizations.OWNER
    input.resource.role != organizations.MAINTAINER
    utils.has_privilege(utils.USER)
    organizations.is_maintainer
}

filter = [] { # Django Q object to filter list of entries
    input.auth.organization == null
    utils.is_admin
} else = qobject {
    input.auth.organization == null
    qobject := [ {"user": input.auth.user.id} ]
} else = qobject {
    input.auth.organization != null
    utils.is_admin
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    organizations.is_member
    qobject := [ {"organization": input.auth.organization.id} ]
}
