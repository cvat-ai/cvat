package lambda
import data.utils

# input: {
#     "scope": <"LIST"|"VIEW"|"CALL_ONLINE"|"CALL_OFFLINE"> or null,
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
#                 "role": <"maintainer"|"supervisor"|"worker"> or null
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
    utils.has_privilege(utils.WORKER)
}

# Business can call a lambda function for own jobs, tasks, and projects
allow {
    input.scope == utils.CALL_OFFLINE
    utils.has_privilege(utils.BUSINESS)
}
