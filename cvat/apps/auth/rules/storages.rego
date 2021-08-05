package storages
import data.utils

default allow = false

# Admin has no restrictions
allow {
    utils.is_admin
}

# Non-workers can create 1 non-public storage
allow {
    input.method == utils.POST
    input.path == ["storages"]
    input.storage.visibility != utils.PUBLIC
    utils.has_privilege(utils.USER)
    input.storages.count < 1
}

# Business account can create non-public storages
allow {
    input.method == utils.POST
    input.path == ["storages"]
    input.storage.visibility != utils.PUBLIC
    utils.has_privilege(utils.BUSINESS)
}

# All can GET, DELETE, PATCH own storages
allow {
    input.method != utils.POST
    input.storage.owner.id == input.user.id
    utils.has_privilege(utils.USER)
}

# All can see public storages
allow {
    input.method == utils.GET
    input.storage.visibility == utils.PUBLIC
    utils.has_privilege(utils.USER)
}

filter = v {
    utils.is_admin
    v := ["all"]
} else = v {
    utils.has_any_role
    v := ["own", "public"]
}

