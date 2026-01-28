package requests

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"view"|"delete"> or null,
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
#         "owner": { "id": <num> } or null,
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope in {utils.VIEW, utils.DELETE}
    input.auth.user.id == input.resource.owner.id
}
