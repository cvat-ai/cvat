# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package access_token_plugin.jobs

import rego.v1

import data.utils

# input: {
#     "scope": <
#              "create"|
#              "delete"|
#              "delete:annotations"|
#              "download:exported_file"|
#              "export:annotations"|
#              "export:dataset"|
#              "import:annotations"|
#              "list"|
#              "update"|
#              "update:annotations"|
#              "update:assignee"|
#              "update:metadata"|
#              "update:stage"|
#              "update:state"|
#              "update:validation_layout"|
#              "view"|
#              "view:annotations"|
#              "view:data"|
#              "view:metadata"|
#              "view:validation_layout"
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
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "project": {
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> }
#         } or null,
#         "task": {
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> }
#         } or null,
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
        utils.CREATE, utils.UPDATE,
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