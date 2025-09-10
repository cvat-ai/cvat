package tasks

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <
#              "create"|
#              "create@project"|
#              "delete:annotations"|
#              "delete"|
#              "download:exported_file"|
#              "export:annotations"|
#              "export:backup"|
#              "export:dataset"|
#              "import:annotations"|
#              "import:backup"|
#              "list"|
#              "update:annotations"|
#              "update:assignee"|
#              "update:associated_storage"|
#              "update:desc"|
#              "update:metadata"|
#              "update:organization"|
#              "update:owner"|
#              "update:project"|
#              "update:validation_layout"|
#              "update"|
#              "upload:data"|
#              "view:annotations"|
#              "view:data"|
#              "view:metadata"|
#              "view:validation_layout"|
#              "view"|
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
#         "owner": { "id": <num> },
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "project": {
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#         "rq_job": { "owner": { "id": <num> } } or null,
#         "destination": <"local" | "cloud_storage"> or undefined,
#     }
# }

is_task_owner if {
    input.resource.owner.id == input.auth.user.id
}

is_task_assignee if {
    input.resource.assignee.id == input.auth.user.id
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

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope in {utils.CREATE, utils.IMPORT_BACKUP}
    utils.is_sandbox
    utils.has_perm(utils.USER)
}

allow if {
    input.scope in {utils.CREATE, utils.IMPORT_BACKUP}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

allow if {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.USER)
    is_project_staff
}

allow if {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

allow if {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
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
    qobject := [ {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|"]
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"project__owner_id": user.id}, "|", {"project__assignee_id": user.id}, "|"]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|"]
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"project__owner_id": user.id}, "|", {"project__assignee_id": user.id}, "|",
        {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|", "&"]
}

allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET, utils.VIEW_METADATA,
        utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP,
        utils.VIEW_VALIDATION_LAYOUT
    }
    utils.is_sandbox
    is_task_staff
}

allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET, utils.VIEW_METADATA,
        utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP,
        utils.VIEW_VALIDATION_LAYOUT
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET, utils.VIEW_METADATA,
        utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP,
        utils.VIEW_VALIDATION_LAYOUT
    }
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_task_staff
}

allow if {
    input.scope in {
        utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.UPLOAD_DATA, utils.UPDATE_METADATA, utils.IMPORT_ANNOTATIONS,
        utils.UPDATE_VALIDATION_LAYOUT
    }
    utils.is_sandbox
    is_task_staff
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope in {
        utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.UPLOAD_DATA, utils.UPDATE_METADATA, utils.IMPORT_ANNOTATIONS,
        utils.UPDATE_VALIDATION_LAYOUT
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {
        utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.UPLOAD_DATA, utils.UPDATE_METADATA, utils.IMPORT_ANNOTATIONS,
        utils.UPDATE_VALIDATION_LAYOUT
    }
    is_task_staff
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
}

allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE
    }
    utils.is_sandbox
    is_project_staff
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.UPDATE_ASSOCIATED_STORAGE
    utils.is_sandbox
    is_project_owner
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ASSOCIATED_STORAGE
    }
    utils.is_sandbox
    is_task_owner
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ASSOCIATED_STORAGE
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ASSOCIATED_STORAGE
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_task_owner
}
allow if {
    input.scope == utils.UPDATE_ASSOCIATED_STORAGE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}

allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
}

allow if {
    input.scope == utils.DOWNLOAD_EXPORTED_FILE
    input.auth.user.id == input.resource.rq_job.owner.id
}
