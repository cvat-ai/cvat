package storages
import data.utils

default allow = false

# Admin has no restrictions
allow {
    utils.is_admin
}

allow {
    input.method == utils.POST
    input.path == ["cloudstorages"]
    utils.has_privilege(utils.USER)
}

allow {
    allowed_methods = {utils.GET, utils.PATCH, utils.DELETE}
    allowed_methods[input.method]
    storage_id := input.path[1]
    input.path == ["cloudstorages", storage_id]
    input.storage.owner.id == input.user.id
}

allow {
    input.method == utils.GET
    storage_id := input.path[1]
    input.path == ["cloudstorages", storage_id, "content"]
    input.storage.owner.id == input.user.id
}

