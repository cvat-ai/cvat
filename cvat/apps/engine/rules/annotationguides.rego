package annotationguides

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"view"|"update"|"delete"|"create"> or null,
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
#         "organization": { "id": <num> } or null,
#         "target": {
#             "owner": { "id": <num> or null },
#             "assignee": { "id": <num> or null },
#             "is_job_staff": <boolean>,
#         },
#     }
# }

is_target_owner if {
    input.resource.target.owner.id == input.auth.user.id
}

is_target_assignee if {
    input.resource.target.assignee.id == input.auth.user.id
}

is_target_staff if {
    is_target_owner
}

is_target_staff if {
    is_target_assignee
}

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.VIEW
    organizations.is_same_context_as_resource
    utils.has_perm(utils.WORKER)
    input.resource.target.is_job_staff
}

allow if {
    input.scope == utils.VIEW
    organizations.is_same_context_as_resource
    utils.has_perm(utils.WORKER)
    is_target_staff
}

allow if {
    input.scope in {utils.CREATE, utils.DELETE, utils.UPDATE}
    organizations.is_same_context_as_resource
    utils.has_perm(utils.USER)
    is_target_staff
}

allow if {
    input.scope in {utils.CREATE, utils.DELETE, utils.UPDATE, utils.VIEW}
    organizations.is_same_org_as_resource_with_perm(organizations.MAINTAINER)
    utils.has_perm(utils.USER)
}
