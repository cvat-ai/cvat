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
#         "user": { "id": <num> },
#         "organization": { "id": <num> }
#     } or null
# }

default allow := false

allow {
    utils.is_admin
}

allow {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow {
    input.scope == utils.LIST
    organizations.is_member
}

filter := [] { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else := qobject {
    utils.is_sandbox
    qobject := [ {"user": input.auth.user.id}, {"is_active": true}, "&" ]
} else := qobject {
    utils.is_admin
    org_id := input.auth.organization.id
    qobject := [ {"organization": org_id} ]
} else := qobject {
    organizations.is_staff
    org_id := input.auth.organization.id
    qobject := [ {"organization": org_id} ]
} else := qobject {
    org_id := input.auth.organization.id
    qobject := [ {"organization": org_id}, {"is_active": true}, "&" ]
}

allow {
    input.scope == utils.VIEW
    input.resource.is_active
    utils.is_sandbox
    input.resource.user.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    organizations.is_staff
    input.resource.organization.id == input.auth.organization.id
}

allow {
    input.scope == utils.VIEW
    input.resource.is_active
    organizations.is_member
    input.resource.organization.id == input.auth.organization.id
}

# maintainer of the organization can change the role of any member and remove any member except
# himself/another maintainer/owner
allow {
    { utils.CHANGE_ROLE, utils.DELETE }[input.scope]
    input.resource.organization.id == input.auth.organization.id
    utils.has_perm(utils.USER)
    organizations.is_maintainer
    not {
        organizations.OWNER,
        organizations.MAINTAINER
    }[input.resource.role]
    input.resource.user.id != input.auth.user.id
}


# owner of the organization can change the role of any member and remove any member except himself
allow {
    { utils.CHANGE_ROLE, utils.DELETE }[input.scope]
    input.resource.organization.id == input.auth.organization.id
    utils.has_perm(utils.USER)
    organizations.is_owner
    input.resource.user.id != input.auth.user.id
    input.resource.role != organizations.OWNER
}

# member can leave the organization except case when member is the owner
allow {
    input.scope == utils.DELETE
    input.resource.is_active
    organizations.is_member
    input.resource.organization.id == input.auth.organization.id
    input.resource.user.id == input.auth.user.id
    input.resource.role != organizations.OWNER
    utils.has_perm(utils.WORKER)
}
