package webhooks

import rego.v1

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
#     }
# }
#

is_project_owner if {
    input.resource.project.owner.id == input.auth.user.id
}

is_webhook_owner if {
    input.resource.owner.id == input.auth.user.id
}

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.USER)
    is_project_owner
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
    qobject := [ {"owner_id": user.id}, {"project__owner_id": user.id}, "|" ]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id} ]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"project__owner_id": user.id},
        "|", {"organization": input.auth.organization.id}, "&"]
}


allow if {
    input.scope == utils.VIEW
    utils.is_sandbox
    utils.is_resource_owner
}

allow if {
    input.scope == utils.VIEW
    utils.is_sandbox
    is_project_owner
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_project_owner
}

allow if {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    utils.is_resource_owner
}

allow if {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    utils.is_resource_owner
}


allow if {
    input.scope in {utils.UPDATE, utils.DELETE, utils.VIEW}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {utils.CREATE_IN_PROJECT, utils.CREATE_IN_ORGANIZATION}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}

allow if {
    input.scope in {utils.CREATE_IN_PROJECT}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}
