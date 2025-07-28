# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package api_token_plugin.projects

import rego.v1

import data.utils

# input: {
#     "scope": <
#              "create"|
#              "delete"|
#              "download:exported_file"|
#              "export:annotations"|
#              "export:backup"|
#              "export:dataset"|
#              "import:backup"|
#              "import:dataset"|
#              "list"|
#              "update:assignee"|
#              "update:associated_storage"|
#              "update:desc"|
#              "update:organization"|
#              "update:owner"|
#              "update"|
#              "view"|
#          > or null,
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
#     },
#     "resource": {
#         "id": <num>,
#         "owner": { "id": <num> },
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "rq_job": { "owner": { "id": <num> } } or null,
#         "destination": <"local" | "cloud_storage"> or undefined,
#     }
# }

default allow := false

allow if {
    not utils.api_token.is_api_token
}

allow if {
    utils.api_token.is_api_token
    input.scope in {utils.VIEW, utils.LIST, utils.DOWNLOAD_EXPORTED_FILE}
}

allow if {
    utils.api_token.is_api_token
    input.scope in {utils.CREATE, utils.UPDATE, utils.DELETE}
    not input.auth.token.read_only
}

allow if {
    utils.api_token.is_api_token
    startswith(input.scope, "update:")
    not input.auth.token.read_only
}

allow if {
    # safe exports are allowed
    utils.api_token.is_api_token
    utils.exportable_resource.is_local_export
}

allow if {
    utils.api_token.is_api_token
    utils.exportable_resource.is_cloud_export
    not input.auth.token.read_only
}