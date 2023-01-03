package webhooks
import data.utils
import data.organizations

# input : {
#     "scope": <"create@project" | "create@organization" | "update" | "delete" |
#         "list" | "view"> or null,
#     "auth": {
#         "user": {
#             "id": <num>
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         }
#         "organization": {
#             "id": <num>,
#             "owner":
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
#         "project": {
#             "owner": { "id": num },
#         } or null,
#         "num_resources": <num>
#     }
# }
#

is_project_owner {
    input.resource.project.owner.id == input.auth.user.id
}

is_webhook_owner {
    input.resource.owner.id == input.auth.user.id
}

default allow = false

allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.USER)
    is_project_owner
    input.resource.num_resources < 10
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
    utils.is_organization
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    utils.is_sandbox
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"project__owner_id": user.id}, "|" ]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"project__owner_id": user.id},
        "|", {"organization": input.auth.organization.id}, "&"]
}


allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    utils.is_resource_owner
}

allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    is_project_owner
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_project_owner
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    utils.is_resource_owner
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    utils.is_resource_owner
}


allow {
    { utils.UPDATE, utils.DELETE, utils.VIEW }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.CREATE_IN_PROJECT, utils.CREATE_IN_ORGANIZATION }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
    input.resource.num_resources < 10
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}

allow {
    { utils.CREATE_IN_PROJECT }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    input.resource.num_resources < 10
    is_project_owner
}
