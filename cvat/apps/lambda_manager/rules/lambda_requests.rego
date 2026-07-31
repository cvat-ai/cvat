# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package lambda_requests

import rego.v1

import data.utils

# input: {
#     "scope": <"list"|"create"|"view"|"delete">,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null
#         },
#     },
#     "resource": {
#         "id": <string>,
#         "owner": { "id": <num> },
#     } or null
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope in {utils.VIEW, utils.CREATE, utils.LIST}
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == utils.DELETE
    input.auth.user.id == input.resource.owner.id
    utils.has_perm(utils.WORKER)
}

# Requests are backed by RQ rather than the database, so filtering is done in the view.
