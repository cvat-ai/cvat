# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

package utils.api_token

import rego.v1

default is_api_token := false

is_api_token if {
    input.auth.token.id != null
}