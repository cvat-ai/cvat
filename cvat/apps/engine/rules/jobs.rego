package jobs
import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"view"|"list"|"update:state"|"update:stage"|"update:assignee""delete"|
#         "view:annotations"|"update:annotations"|"delete:annotations"|"view:data"|
#         "export:annotations" | "export:dataset" |> or null,
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
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "project": {
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> }
#         } or null,
#         "task": {
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> }
#         } or null
#     }
# }

is_job_assignee {
    input.resource.assignee.id == input.auth.user.id
}

is_task_owner {
    input.resource.task.owner.id == input.auth.user.id
}

is_task_assignee {
    input.resource.task.assignee.id == input.auth.user.id
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

is_job_staff {
    is_task_staff
}

is_job_staff {
    is_job_assignee
}

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
    utils.is_admin
    utils.is_organization
    qobject := [
        {"segment__task__organization": input.auth.organization.id},
        {"segment__task__project__organization": input.auth.organization.id}, "|" ]
} else := qobject {
    utils.is_sandbox
    user := input.auth.user
    qobject := [
        {"assignee_id": user.id},
        {"segment__task__owner_id": user.id}, "|",
        {"segment__task__assignee_id": user.id}, "|",
        {"segment__task__project__owner_id": user.id}, "|",
        {"segment__task__project__assignee_id": user.id}, "|"]
} else := qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [
        {"segment__task__organization": input.auth.organization.id},
        {"segment__task__project__organization": input.auth.organization.id}, "|"]
} else := qobject {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [
        {"assignee_id": user.id},
        {"segment__task__owner_id": user.id}, "|",
        {"segment__task__assignee_id": user.id}, "|",
        {"segment__task__project__owner_id": user.id}, "|",
        {"segment__task__project__assignee_id": user.id}, "|",
        {"segment__task__organization": input.auth.organization.id},
        {"segment__task__project__organization": input.auth.organization.id}, "|", "&"]
}

allow {
    { utils.CREATE, utils.DELETE }[input.scope]
    utils.has_perm(utils.USER)
    utils.is_sandbox
    is_task_staff
}

allow {
    { utils.CREATE, utils.DELETE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.SUPERVISOR)
    utils.has_perm(utils.USER)
    is_task_staff
}

allow {
    { utils.VIEW,
      utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS,
      utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }[input.scope]
    utils.is_sandbox
    is_job_staff
}

allow {
    { utils.CREATE, utils.DELETE, utils.VIEW,
      utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS,
      utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.VIEW,
      utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS,
      utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_job_staff
}

allow {
    { utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_job_staff
}

allow {
    { utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_job_staff
}

allow {
    { utils.VIEW, utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA,
      utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
      utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA
    }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    input.auth.user.privilege == utils.WORKER
    input.auth.organization.user.role == null
    is_job_assignee
}

allow {
    { utils.UPDATE_STAGE, utils.UPDATE_ASSIGNEE }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_task_staff
}

allow {
    { utils.UPDATE_STAGE, utils.UPDATE_ASSIGNEE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.UPDATE_STAGE, utils.UPDATE_ASSIGNEE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_task_staff
}
