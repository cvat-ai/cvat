# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package utils.exportable_resource

import rego.v1

LOCAL_EXPORT := "local"
CLOUD_EXPORT := "cloud_storage"

default is_local_export := false

is_local_export if {
    startswith(input.scope, "export:")
    input.resource.destination == LOCAL_EXPORT
}

default is_cloud_export := false

is_cloud_export if {
    startswith(input.scope, "export:")
    input.resource.destination == CLOUD_EXPORT
}