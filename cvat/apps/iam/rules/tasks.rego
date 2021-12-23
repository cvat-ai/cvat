package tasks
import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"create@project"|"view"|"list"|"update:desc"|
#         "update:owner"|"update:assignee"|"update:project"|"delete"|
#         "view:annotations"|"update:annotations"|"delete:annotations"|
#         "export:dataset"|"view:data"|"upload:data"|"export:annotations"> or null,
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
#         "project": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#         "user": {
#             "num_resources": <num>
#         }
#     }
# }

is_task_owner {
    input.resource.owner.id == input.auth.user.id
}

is_task_assignee {
    input.resource.assignee.id == input.auth.user.id
}

is_project_owner {
    input.resource.project.owner.id == input.auth.user.id
}

is_project_assignee {
    input.resource.project.assignee.id == input.auth.user.id
}

is_project_staff {
    is_project_owner
}

is_project_staff {
    is_project_assignee
}

is_task_staff {
    is_project_staff
}

is_task_staff {
    is_task_owner
}

is_task_staff {
    is_task_assignee
}

default allow = false

allow {
    utils.is_admin
}

allow {
    { utils.CREATE, utils.IMPORT_BACKUP }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.USER)
    input.resource.user.num_resources < 10
}

allow {
    { utils.CREATE, utils.IMPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
    input.resource.user.num_resources < 10
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
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.USER)
    input.resource.user.num_resources < 10
    is_project_staff
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
    input.resource.user.num_resources < 10
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
    input.resource.user.num_resources < 10
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.BUSINESS)
    is_project_staff
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.SUPERVISOR)
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
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

allow {
    { utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET,
      utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP }[input.scope]
    utils.is_sandbox
    is_task_staff
}

allow {
    { utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET,
      utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET,
      utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_task_staff
}

allow {
    { utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.UPLOAD_DATA, utils.IMPORT_ANNOTATIONS }[input.scope]
    utils.is_sandbox
    is_task_staff
    utils.has_perm(utils.WORKER)
}

allow {
    { utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.UPLOAD_DATA, utils.IMPORT_ANNOTATIONS }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.UPLOAD_DATA, utils.IMPORT_ANNOTATIONS }[input.scope]
    is_task_staff
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
}

allow {
    { utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
      utils.DELETE }[input.scope]
    utils.is_sandbox
    is_project_staff
    utils.has_perm(utils.WORKER)
}

allow {
    { utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
      utils.DELETE }[input.scope]
    utils.is_sandbox
    is_task_owner
    utils.has_perm(utils.WORKER)
}

allow {
    { utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
      utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
      utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_task_owner
}

allow {
    { utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
      utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
}

