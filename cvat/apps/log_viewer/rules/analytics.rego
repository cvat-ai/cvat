package analytics

import rego.v1

import data.utils

# input: {
#     "scope": <"view"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null,
#             "has_analytics_access": <true|false>
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
# }

default allow := false

allow if {
    input.auth.user.has_analytics_access
}
