package server
import data.utils

# input: {
#     "scope": <"SEND_LOGS"|"SEND_EXCEPTION"|"VIEW"|"LIST_CONTENT"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         },
#         "organization": {
#             "id": <num>,
#             "is_owner": <true|false>,
#             "owner": {
#                 "id": <num>
#             },
#             "role": <"maintainer"|"supervisor"|"worker"> or null
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
    utils.has_privilege(utils.USER)
}
