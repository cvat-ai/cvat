package projects
import data.utils

default allow = false
# Admin has no restrictions
allow {
    utils.is_admin
}

allow {
    input.method == utils.POST
    input.path == ["projects"]
    utils.has_privilege(utils.USER)
}