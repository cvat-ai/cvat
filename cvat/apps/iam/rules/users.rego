package users
import data.utils

# input: {
#     "scope": <"list"|"view"|"view:self"|"delete"|"update"> or null,
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

allow {
    input.scope == utils.UPDATE
    input.auth.user.id == input.resource.id
}

allow {
    input.scope == utils.DELETE
    input.auth.user.id == input.resource.id
}