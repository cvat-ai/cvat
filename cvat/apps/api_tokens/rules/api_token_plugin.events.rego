# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package api_token_plugin.events

import rego.v1

import data.utils

# input: {
#     "scope": <"send:events","dump:events","download:exported_file"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null
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
#     }
#     "resource": {
#         "rq_job": { "owner": { "id": <num> } } or null,
#     } or null,
# }


default allow := false

allow if {
    not utils.api_token.is_api_token
}

allow if {
    utils.api_token.is_api_token
    input.scope in {utils.DOWNLOAD_EXPORTED_FILE, utils.DUMP_EVENTS}
}
