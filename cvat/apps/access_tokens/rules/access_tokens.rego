# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package access_tokens

import rego.v1

import data.utils

# input: {
#     "scope": <"create"|"view"|"list"|"update"|"delete"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null,
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
#         "id": <num> or null,
#         "owner": { "id": <num> },
#     }
# }



default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope in {utils.LIST, utils.CREATE}
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope in {utils.VIEW, utils.UPDATE, utils.DELETE}
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

q_user_is_owner(user) := [
    {"owner_id": user.id},
]

# Django Q object to filter list of entries
filter := q_user_is_owner(input.auth.user)
