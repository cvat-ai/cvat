package cloudstorages
import data.utils

default allow = false

# Admin has no restrictions
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    utils.has_privilege(utils.USER)
}

allow {
    allowed_actions = {utils.DELETE, utils.UPDATE, utils.VIEW}
    allowed_actions[input.scope]
    input.storage.owner.id == input.auth.user.id
}

allow {
    input.scope == utils.LIST_CONTENT
    input.storage.owner.id == input.auth.user.id
}

