package auth
import data.utils

default allow = false
allow {
    input.method == utils.POST
    input.path == ["auth", "login"]
}

allow {
    allowed_methods = {utils.GET, utils.POST}
    allowed_methods[input.method]
    input.path == ["auth", "logout"]
}

allow {
    input.method == utils.POST
    allowed_paths = {
        ["auth", "password", "change"],
        ["auth", "password", "reset"],
        ["auth", "password", "reset", "confirm"],
        ["auth", "signing"]
    }
    allowed_paths[input.path]
}

allow {
    input.method == utils.POST
    input.path == ["auth", "register"]
    input.restrictions.SIGNUP == "allowed"
}
