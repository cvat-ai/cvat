# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package access_token_plugin.tasks

import rego.v1

import data.utils

# input: {
#     "scope": <
#              "create"|
#              "create@project"|
#              "delete:annotations"|
#              "delete"|
#              "download:exported_file"|
#              "export:annotations"|
#              "export:backup"|
#              "export:dataset"|
#              "import:annotations"|
#              "import:backup"|
#              "list"|
#              "update:annotations"|
#              "update:assignee"|
#              "update:associated_storage"|
#              "update:desc"|
#              "update:metadata"|
#              "update:organization"|
#              "update:owner"|
#              "update:project"|
#              "update:validation_layout"|
#              "update"|
#              "upload:data"|
#              "view:annotations"|
#              "view:data"|
#              "view:metadata"|
#              "view:validation_layout"|
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
    input.scope in {utils.VIEW, utils.LIST, utils.DOWNLOAD_EXPORTED_FILE}
}

allow if {
    startswith(input.scope, "view:")
}

allow if {
    input.scope in {
        utils.CREATE, utils.CREATE_IN_PROJECT,
        utils.UPDATE, utils.UPLOAD_DATA,
        utils.DELETE, utils.DELETE_ANNOTATIONS,
        utils.IMPORT_DATASET, utils.IMPORT_BACKUP, utils.IMPORT_ANNOTATIONS
    }
    not input.auth.token.read_only
}

allow if {
    startswith(input.scope, "update:")
    not input.auth.token.read_only
}

allow if {
    # safe exports are allowed
    utils.exportable_resource.is_local_export
}

allow if {
    utils.exportable_resource.is_cloud_export
    not input.auth.token.read_only
}
