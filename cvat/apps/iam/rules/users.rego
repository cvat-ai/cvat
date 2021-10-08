package users
import data.utils

# input: {
#     "scope": <"LIST"|"VIEW"|"VIEW_SELF"> or null,
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
#     },
#     "resource": {
#         "id": <num>
#     } or null,
# }

default allow = false
allow {
    utils.is_admin
}

allow {
    input.scope == utils.VIEW_SELF
}

allow {
    input.scope == utils.VIEW
    input.auth.user.id == input.resource.id
}