package users
import data.utils

default allow = false

allow {
    utils.is_admin
}

allow {
    input.method == utils.GET
    input.path == ["users", "self"]
}