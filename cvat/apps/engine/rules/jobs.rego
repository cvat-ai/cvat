package jobs

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"view"|"list"|"update:state"|"update:stage"|"update:assignee""delete"|
#         "view:annotations"|"update:annotations"|"delete:annotations"|"view:data"|
#         "export:annotations" | "export:dataset" |> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null
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

is_job_assignee if {
    input.resource.assignee.id == input.auth.user.id
}

is_task_owner if {
    input.resource.task.owner.id == input.auth.user.id
}

is_task_assignee if {
    input.resource.task.assignee.id == input.auth.user.id
}

is_project_owner if {
    input.resource.project.owner.id == input.auth.user.id
}

is_project_assignee if {
    input.resource.project.assignee.id == input.auth.user.id
}

is_project_staff if {
    is_project_owner
}

is_project_staff if {
    is_project_assignee
}

is_task_staff if {
    is_project_staff
}

is_task_staff if {
    is_task_owner
}

is_task_staff if {
    is_task_assignee
}

is_job_staff if {
    is_task_staff
}

is_job_staff if {
    is_job_assignee
}

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow if {
    input.scope == utils.LIST
    organizations.is_member
}


filter := [] if { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else := qobject if {
    utils.is_admin
    utils.is_organization
    qobject := [
        {"segment__task__organization": input.auth.organization.id},
        {"segment__task__project__organization": input.auth.organization.id}, "|" ]
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := [
        {"assignee_id": user.id},
        {"segment__task__owner_id": user.id}, "|",
        {"segment__task__assignee_id": user.id}, "|",
        {"segment__task__project__owner_id": user.id}, "|",
        {"segment__task__project__assignee_id": user.id}, "|"]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [
        {"segment__task__organization": input.auth.organization.id},
        {"segment__task__project__organization": input.auth.organization.id}, "|"]
} else := qobject if {
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

allow if {
    input.scope in {utils.CREATE, utils.DELETE}
    utils.has_perm(utils.USER)
    utils.is_sandbox
    is_task_staff
}

allow if {
    input.scope in {utils.CREATE, utils.DELETE}
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.SUPERVISOR)
    utils.has_perm(utils.USER)
    is_task_staff
}

allow if {
    input.scope in {
        utils.VIEW,
        utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS,
        utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }
    utils.is_sandbox
    is_job_staff
}

allow if {
    input.scope in {
        utils.CREATE, utils.DELETE, utils.VIEW,
        utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS,
        utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {
        utils.VIEW,
        utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS,
        utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_job_staff
}

allow if {
    input.scope in {
        utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA
    }
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_job_staff
}

allow if {
    input.scope in {
        utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {
        utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_job_staff
}

allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA,
        utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA
    }
    input.auth.organization.id == input.resource.organization.id
    input.auth.user.privilege == utils.WORKER
    input.auth.organization.user.role == null
    is_job_assignee
}

allow if {
    input.scope in {utils.UPDATE_STAGE, utils.UPDATE_ASSIGNEE}
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_task_staff
}

allow if {
    input.scope in {utils.UPDATE_STAGE, utils.UPDATE_ASSIGNEE}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {utils.UPDATE_STAGE, utils.UPDATE_ASSIGNEE}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_task_staff
}

allow if {
    input.scope in {utils.VIEW_VALIDATION_LAYOUT, utils.UPDATE_VALIDATION_LAYOUT}
    utils.is_sandbox
    is_task_staff
}

allow if {
    input.scope in {utils.VIEW_VALIDATION_LAYOUT, utils.UPDATE_VALIDATION_LAYOUT}
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_task_staff
}

allow if {
    input.scope in {utils.VIEW_VALIDATION_LAYOUT, utils.UPDATE_VALIDATION_LAYOUT}
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.MAINTAINER)
    utils.has_perm(utils.USER)
}
