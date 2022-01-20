package projects
import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"list"|"update:desc"|"update:owner"|"update:assignee"|
#               "view"|"delete"|"export:dataset"|"export:annotations"|
#               "import:dataset"> or null,
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
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "user": {
#             "num_resources": <num>
#         }
#     }
# }

default allow = false

is_project_staff {
    utils.is_resource_owner
}

is_project_staff {
    utils.is_resource_assignee
}

allow {
    utils.is_admin
}

allow {
    { utils.CREATE, utils.IMPORT_BACKUP }[input.scope]
    utils.is_sandbox
    input.resource.user.num_resources < 3
    utils.has_perm(utils.USER)
}

allow {
    { utils.CREATE, utils.IMPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    input.resource.user.num_resources < 3
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

allow {
    { utils.CREATE, utils.IMPORT_BACKUP }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.BUSINESS)
}

allow {
    { utils.CREATE, utils.IMPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.SUPERVISOR)
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
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|" ]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"organization": input.auth.organization.id}, "&" ]
}

allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    is_project_staff
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_project_staff
}


allow {
    input.scope == utils.DELETE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow {
    input.scope == utils.DELETE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.is_member
    utils.is_resource_owner
}

allow {
    input.scope == utils.DELETE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow {
    { utils.UPDATE_DESC, utils.IMPORT_DATASET }[input.scope]
    utils.is_sandbox
    is_project_staff
    utils.has_perm(utils.WORKER)
}

allow {
    { utils.UPDATE_DESC, utils.IMPORT_DATASET }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow {
    { utils.UPDATE_DESC, utils.IMPORT_DATASET }[input.scope]
    is_project_staff
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.is_member
}

allow {
    input.scope == utils.UPDATE_ASSIGNEE
    utils.is_sandbox
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.UPDATE_ASSIGNEE
    input.auth.organization.id == input.resource.organization.id
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
    organizations.is_member
}

allow {
    input.scope == utils.UPDATE_ASSIGNEE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow {
    input.scope == utils.UPDATE_OWNER
    input.auth.organization.id == input.resource.organization.id
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
    organizations.is_staff
}

allow {
    input.scope == utils.UPDATE_OWNER
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow {
    { utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP }[input.scope]
    utils.is_sandbox
    is_project_staff
}

allow {
    { utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    is_project_staff
}

allow {
    { utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}
