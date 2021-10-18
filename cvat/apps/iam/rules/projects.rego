package projects
import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"list"|"update:desc"|"update:owner"|"update:assignee"|"view"|"delete"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         },
#         "organization": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "user": {
#                 "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#             }
#         } or null,
#     },
#     "resource": {
#         "owner": { "id": <num> },
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "user": {
#             "num_resources": <num>
#         }
#     }
# }

default allow = false

allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    input.resource.user.num_resources < 3
    utils.has_perm(utils.USER)
    input.auth.organization == null
}

allow {
    input.scope == utils.CREATE
    input.resource.user.num_resources < 3
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
    input.auth.organization.id == input.resource.organization.id
}

allow {
    input.scope == utils.CREATE
    utils.has_perm(utils.BUSINESS)
    input.auth.organization == null
}

allow {
    input.scope == utils.CREATE
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.SUPERVISOR)
    input.auth.organization.id == input.resource.organization.id
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
    input.resource.owner.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    input.resource.assignee.id == input.auth.user.id
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
}

allow {
    input.scope == utils.DELETE
    input.resource.owner.id == input.auth.user.id
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.DELETE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    input.scope == utils.UPDATE_DESC
    input.resource.owner.id == input.auth.user.id
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.UPDATE_DESC
    input.resource.assignee.id == input.auth.user.id
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.UPDATE_DESC
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    input.scope == utils.UPDATE_ASSIGNEE
    input.resource.owner.id == input.auth.user.id
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.UPDATE_ASSIGNEE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    input.scope == utils.UPDATE_OWNER
    input.auth.organization.id == input.resource.organization.id
    input.resource.owner.id == input.auth.user.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    input.scope == utils.UPDATE_OWNER
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
    input.auth.organization == null
    qobject := [ {"organization": null} ]
} else = qobject {
    input.auth.organization != null
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    input.auth.organization == null
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|"]
}
