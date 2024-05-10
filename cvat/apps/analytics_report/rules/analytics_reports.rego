package analytics_reports

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"list"|"create"> or null,
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
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
}

allow if {
    input.scope == utils.LIST
    utils.has_perm(utils.WORKER)
}
