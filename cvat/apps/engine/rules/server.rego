package server

import rego.v1

import data.utils

# input: {
#     "scope": <"view"|"list:content"> or null,
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
    input.scope == utils.VIEW
}

allow if {
    input.scope == utils.LIST_CONTENT
    utils.has_perm(utils.USER)
}
