package lambda

import data.utils
import data.organizations

# input: {
#     "scope": <"list"|"view"|"call:online"|"call:offline"|"list:offline"> or null,
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
    input.scope == utils.LIST
}

allow {
    input.scope == utils.VIEW
}

allow {
    { utils.CALL_ONLINE, utils.CALL_OFFLINE, utils.LIST_OFFLINE }[input.scope]
    utils.has_perm(utils.WORKER)
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else = qobject {
    utils.is_admin
    utils.is_organization
    qobject := [ {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|"]
} else = qobject {
    utils.is_sandbox
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"project__owner_id": user.id}, "|", {"project__assignee_id": user.id}, "|"]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|"]
} else = qobject {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"project__owner_id": user.id}, "|", {"project__assignee_id": user.id}, "|",
        {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|", "&"]
}
