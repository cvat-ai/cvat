package limitations
import data.utils
import data.organizations

# input : {
#     "scope": <"update" | "list"> or null,
#     "auth": {
#         "user": {
#             "id": <num>
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         }
#         "organization": {
#             "id": <num>,
#             "owner":
#                 "id": <num>
#             },
#             "user": {
#                 "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#             }
#         } or null,
#     },
#     "resource": {
#         "id": <num>,
#         "user": { "id": <num> },
#         "organization": { "id": <num> } or null,
#     }
# }
#

default allow = false

allow {
    utils.is_admin
}