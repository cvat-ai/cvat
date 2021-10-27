package server
import data.utils

# input: {
#     "scope": <"send:logs"|"send:exception"|"view"|"list:content"> or null,
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
    input.scope == utils.VIEW
}

allow {
    input.scope == utils.SEND_EXCEPTION
}

allow {
    input.scope == utils.SEND_LOGS
}

allow {
    input.scope == utils.LIST_CONTENT
    utils.has_perm(utils.WORKER)
}
