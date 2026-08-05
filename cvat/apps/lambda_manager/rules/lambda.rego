package lambda

import rego.v1

import data.utils

# input: {
#     "scope": <"list"|"view"|"call:online"> or null,
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
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.LIST
}

allow if {
    input.scope == utils.VIEW
}

allow if {
    input.scope == utils.CALL_ONLINE
    utils.has_perm(utils.WORKER)
}
