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
    input.method == utils.GET
    storage_id := input.path[1]
    input.path == ["cloudstorages", storage_id]
    input.storage.owner.id == input.user.id
}

allow {
    input.method == utils.DELETE
    storage_id := input.path[1]
    input.path == ["cloudstorages", storage_id]
    input.storage.owner.id == input.user.id
}

allow {
    input.method == utils.PATCH
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

filter = v {
    utils.is_admin
    v := ["all"]
} else = v {
    v := ["own"]
}

