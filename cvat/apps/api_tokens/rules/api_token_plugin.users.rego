# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package api_token_plugin.users

import rego.v1

import data.utils

# input: {
#     "scope": <"create"|"view"|"list"> or null,
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
#         "token": {
#             "id": <num>,
#             "read_only": <bool>,
#         },
#     },
#     "resource": {
#         "id": <num> or null,
#         "owner": { "id": <num> },
#     }
# }

default allow := false

allow if {
    not utils.api_token.is_api_token
}

allow if {
    utils.api_token.is_api_token
    input.scope in {utils.LIST, utils.VIEW}
}
