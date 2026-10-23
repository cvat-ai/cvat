package consensus_merges

import rego.v1

import data.utils
import data.organizations
import data.quality_utils

# input: {
#     "scope": <"create"> or null,
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
#         "owner": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "task": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#         "project": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.CREATE
    organizations.matching_context
    quality_utils.is_task_staff(input.resource.task, input.resource.project, input.auth)
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.CREATE
    organizations.user_and_resource_in_org_with_role(organizations.MAINTAINER)
    utils.has_perm(utils.USER)
}
