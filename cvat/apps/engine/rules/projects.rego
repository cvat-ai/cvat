package projects

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <
#              "create"|
#              "delete"|
#              "download:exported_file"|
#              "export:annotations"|
#              "export:backup"|
#              "export:dataset"|
#              "import:backup"|
#              "import:dataset"|
#              "list"|
#              "update:assignee"|
#              "update:associated_storage"|
#              "update:desc"|
#              "update:organization"|
#              "update:owner"|
#              "update"|
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
#         "rq_job": { "owner": { "id": <num> } } or null,
#         "destination": <"local" | "cloud_storage"> or undefined,
#     }
# }

default allow := false

is_project_staff if {
    utils.is_resource_owner
}

is_project_staff if {
    utils.is_resource_assignee
}

allow if {
    utils.is_admin
}

allow if {
    input.scope in {
        utils.DELETE, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP, utils.EXPORT_DATASET,
        utils.IMPORT_DATASET, utils.UPDATE_ASSIGNEE, utils.UPDATE_ASSOCIATED_STORAGE,
        utils.UPDATE_DESC, utils.UPDATE_OWNER, utils.VIEW
    }
    organizations.is_same_org_as_resource_with_perm(organizations.MAINTAINER)
    utils.has_perm(utils.USER)
}

allow if {
    input.scope in {utils.CREATE, utils.IMPORT_BACKUP}
    organizations.is_same_context_as_resource_with_perm(organizations.SUPERVISOR)
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
    qobject := ["|", {"owner_id": user.id}, {"assignee_id": user.id}]
} else := {} if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := ["|", {"owner_id": user.id}, {"assignee_id": user.id}]
}

filter := utils.add_organization_filter(base_filter, ["organization"])

allow if {
    input.scope == utils.VIEW
    organizations.is_same_context_as_resource
    is_project_staff
}

allow if {
    input.scope in {utils.DELETE, utils.UPDATE_ASSOCIATED_STORAGE}
    organizations.is_same_context_as_resource
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.UPDATE_DESC, utils.IMPORT_DATASET}
    organizations.is_same_context_as_resource
    is_project_staff
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.UPDATE_ASSIGNEE
    organizations.is_same_context_as_resource
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.UPDATE_OWNER
    organizations.is_same_org_as_resource_with_perm(organizations.MAINTAINER)
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope in {utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP}
    organizations.is_same_context_as_resource_with_perm(organizations.SUPERVISOR)
    is_project_staff
}

allow if {
    input.scope in {utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP}
    organizations.is_same_context_as_resource
    utils.is_resource_owner
}

allow if {
    input.scope == utils.DOWNLOAD_EXPORTED_FILE
    input.auth.user.id == input.resource.rq_job.owner.id
}
