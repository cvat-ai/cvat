package cloudstorages

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"list"|"list:content"|"update"|"view"|"delete"> or null,
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
#         "organization": { "id": <num> } or null,
#     }
# }

default allow := false

# Admin has no restrictions
allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
    utils.is_sandbox
}

allow if {
    input.scope == utils.CREATE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
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
} else := {} if {
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
} else := qobject if {
    utils.is_sandbox
    qobject := {"owner": input.auth.user.id}
} else := qobject if {
    utils.is_organization
    qobject := {"owner": input.auth.user.id}
}

filter := utils.add_organization_filter(base_filter, ["organization"])

allow if {
    input.scope in {utils.VIEW, utils.LIST_CONTENT}
    utils.is_sandbox
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.VIEW, utils.LIST_CONTENT}
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.VIEW, utils.LIST_CONTENT}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}


allow if {
    input.scope in {utils.UPDATE, utils.DELETE}
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}
