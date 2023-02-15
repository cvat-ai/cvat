package events
import data.utils

# input: {
#     "scope": <"send:events"|"dump:events"> or null,
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

default allow = false

allow {
    input.scope == utils.SEND_EVENTS
}

allow {
    input.scope == utils.DUMP_EVENTS
    utils.has_perm(utils.BUSINESS)
}
