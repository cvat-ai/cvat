package jobs

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <
#              "create"|
#              "delete"|
#              "delete:annotations"|
#              "download:exported_file"|
#              "export:annotations"|
#              "export:dataset"|
#              "import:annotations"|
#              "list"|
#              "update"|
#              "update:annotations"|
#              "update:assignee"|
#              "update:metadata"|
#              "update:stage"|
#              "update:state"|
#              "update:validation_layout"|
#              "view"|
#              "view:annotations"|
#              "view:data"|
#              "view:metadata"|
#              "view:validation_layout"
#          > or null,
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
#         } or null,
#         "rq_job": { "owner": { "id": <num> } } or null,
#         "destination": <"local" | "cloud_storage"> or undefined,
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

is_task_or_project_owner if {
    is_task_owner
}

is_task_or_project_owner if {
    is_project_owner
}

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope in {
        utils.CREATE, utils.DELETE, utils.DELETE_ANNOTATIONS, utils.EXPORT_ANNOTATIONS,
        utils.EXPORT_DATASET, utils.IMPORT_ANNOTATIONS, utils.UPDATE_ANNOTATIONS,
        utils.UPDATE_ASSIGNEE, utils.UPDATE_METADATA, utils.UPDATE_STAGE, utils.UPDATE_STATE,
        utils.UPDATE_VALIDATION_LAYOUT, utils.VIEW, utils.VIEW_ANNOTATIONS, utils.VIEW_DATA,
        utils.VIEW_METADATA, utils.VIEW_VALIDATION_LAYOUT
    }
    organizations.user_and_resource_in_org_with_role(organizations.MAINTAINER)
    utils.has_perm(utils.USER)
}

allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow if {
    input.scope == utils.LIST
    organizations.is_member
}


base_filter := {} if { # Django Q object to filter list of entries
    utils.is_admin
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := ["|",
        {"assignee_id": user.id},
        {"segment__task__owner_id": user.id},
        {"segment__task__assignee_id": user.id},
        {"segment__task__project__owner_id": user.id},
        {"segment__task__project__assignee_id": user.id},
    ]
} else := {} if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := ["|",
        {"assignee_id": user.id},
        {"segment__task__owner_id": user.id},
        {"segment__task__assignee_id": user.id},
        {"segment__task__project__owner_id": user.id},
        {"segment__task__project__assignee_id": user.id},
    ]
}

filter := utils.add_organization_filter(base_filter, ["segment__task__organization"])

allow if {
    input.scope in {utils.CREATE, utils.DELETE}
    utils.has_perm(utils.USER)
    organizations.matching_context_with_org_role(organizations.SUPERVISOR)
    is_task_staff
}

allow if {
    input.scope in {
        utils.VIEW,
        utils.VIEW_ANNOTATIONS, utils.VIEW_DATA, utils.VIEW_METADATA
    }
    organizations.matching_context
    is_job_staff
}

allow if {
    input.scope in {utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS}
    organizations.matching_context
    is_task_or_project_owner
}

allow if {
    input.scope in {utils.EXPORT_DATASET, utils.EXPORT_ANNOTATIONS}
    organizations.matching_context_with_org_role(organizations.SUPERVISOR)
    is_job_staff
}

allow if {
    input.scope in {
        utils.UPDATE_STATE, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.IMPORT_ANNOTATIONS, utils.UPDATE_METADATA
    }
    organizations.matching_context
    utils.has_perm(utils.WORKER)
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
    organizations.matching_context
    utils.has_perm(utils.WORKER)
    is_task_staff
}

allow if {
    input.scope in {utils.VIEW_VALIDATION_LAYOUT, utils.UPDATE_VALIDATION_LAYOUT}
    organizations.matching_context
    is_task_staff
}

allow if {
    input.scope == utils.DOWNLOAD_EXPORTED_FILE
    input.auth.user.id == input.resource.rq_job.owner.id
}
