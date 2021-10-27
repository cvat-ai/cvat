package users
import data.utils
import data.organizations

# input: {
#     "scope": <"list"|"view"|"delete"|"update"> or null,
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
#         "id": <num>,
#         "membership": {
#             "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#         }
#     } or null,
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
    utils.is_sandbox
} else = qobject {
    utils.is_sandbox
    qobject := [ {"id": input.auth.user.id} ]
} else = qobject {
    org_id := input.auth.organization.id
    qobject := [ {"memberships__organization": org_id} ]
}

allow {
    input.scope == utils.VIEW
    input.resource.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    input.resource.membership.role != null
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    input.auth.user.id == input.resource.id
}
