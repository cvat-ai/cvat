package analytics_reports

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

allow {
    utils.is_admin
}

allow {
    input.scope == utils.LIST
    utils.has_perm(utils.WORKER)
}
