package projects

import rego.v1

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
    input.scope in {utils.CREATE, utils.IMPORT_BACKUP}
    utils.is_sandbox
    utils.has_perm(utils.BUSINESS)
}

allow if {
    input.scope in {utils.CREATE, utils.IMPORT_BACKUP}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.SUPERVISOR)
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
    qobject := [ {"organization": input.auth.organization.id} ]
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|" ]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id} ]
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"organization": input.auth.organization.id}, "&" ]
}

allow if {
    input.scope == utils.VIEW
    utils.is_sandbox
    is_project_staff
}

allow if {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_project_staff
}


allow if {
    input.scope in {utils.DELETE, utils.UPDATE_ORG}
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.DELETE, utils.UPDATE_ORG}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.is_member
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.DELETE, utils.UPDATE_ORG}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow if {
    input.scope in {utils.UPDATE_DESC, utils.IMPORT_DATASET}
    utils.is_sandbox
    is_project_staff
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope in {utils.UPDATE_DESC, utils.IMPORT_DATASET}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow if {
    input.scope in {utils.UPDATE_DESC, utils.IMPORT_DATASET}
    is_project_staff
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.is_member
}

allow if {
    input.scope == utils.UPDATE_ASSIGNEE
    utils.is_sandbox
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.UPDATE_ASSIGNEE
    input.auth.organization.id == input.resource.organization.id
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
    organizations.is_member
}

allow if {
    input.scope == utils.UPDATE_ASSIGNEE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow if {
    input.scope == utils.UPDATE_OWNER
    input.auth.organization.id == input.resource.organization.id
    utils.is_resource_owner
    utils.has_perm(utils.WORKER)
    organizations.is_staff
}

allow if {
    input.scope == utils.UPDATE_OWNER
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.is_staff
}

allow if {
    input.scope in {utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP}
    utils.is_sandbox
    is_project_staff
}

allow if {
    input.scope in {utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP}
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    is_project_staff
}

allow if {
    input.scope in {utils.EXPORT_ANNOTATIONS, utils.EXPORT_DATASET, utils.EXPORT_BACKUP}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}
