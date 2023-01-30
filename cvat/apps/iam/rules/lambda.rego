package lambda
import data.utils

# input: {
#     "scope": <"list"|"view"|"call:online"|"call:offline"> or null,
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
    utils.is_admin
}

allow {
    input.scope == utils.LIST
}

allow {
    input.scope == utils.VIEW
}

allow {
    input.scope == utils.CALL_ONLINE
    utils.has_perm(utils.WORKER)
}

allow {
    input.scope == utils.CALL_OFFLINE
    utils.has_perm(utils.BUSINESS)
}
