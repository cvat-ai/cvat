package cloudstorages
import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"list"|"list:content"|"update"|"view"|"delete"> or null,
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
#         "owner": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "user": {
#             "num_resources": <num>
#         }
#     }
# }

default allow = false

# Admin has no restrictions
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
    utils.is_sandbox
}

allow {
    input.scope == utils.CREATE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow {
    input.scope == utils.LIST
    organizations.is_member
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else = qobject {
    utils.is_admin
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    utils.is_sandbox
    qobject := [ {"owner": input.auth.user.id} ]
} else = qobject {
    utils.is_organization
    qobject := [ {"owner": input.auth.user.id}, {"organization": input.auth.organization.id}, "&" ]
}

allow {
    { utils.VIEW, utils.LIST_CONTENT }[input.scope]
    utils.is_sandbox
    utils.is_resource_owner
}

allow {
    { utils.VIEW, utils.LIST_CONTENT }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.is_resource_owner
}

allow {
    { utils.VIEW, utils.LIST_CONTENT }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}


allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}
