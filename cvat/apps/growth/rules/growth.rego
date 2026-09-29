package growth

import rego.v1

import data.utils


default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.LIST
}

allow if {
    input.scope in {utils.VIEW, utils.UPDATE}
    input.resource.user.id == input.auth.user.id
}

filter := {} if {
    utils.is_admin
} else := {"user_id": input.auth.user.id}
