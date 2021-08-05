package server
import data.utils

default allow = false
allow {
    input.method == utils.GET
    input.path == ["server", "about"]
    utils.has_any_role
}

allow {
    input.method == utils.GET
    input.path == ["server", "annotation", "formats"]
    utils.has_any_role
}

allow {
    input.method == utils.POST
    input.path == ["server", "exception"]
    utils.has_any_role
}

allow {
    input.method == utils.POST
    input.path == ["server", "exception"]
    utils.has_any_role
}

allow {
    input.method == utils.POST
    input.path == ["server", "logs"]
    utils.has_any_role
}

allow {
    input.method == utils.GET
    input.path == ["server", "plugins"]
    utils.has_any_role
}

allow {
    input.method == utils.GET
    input.path == ["server", "share"]
    utils.has_privilege(utils.USER)
}
