package server
import data.utils

default allow = false
allow {
    input.method == utils.GET
    input.path == ["server", "about"]
}

allow {
    input.method == utils.GET
    input.path == ["server", "annotation", "formats"]
}

allow {
    input.method == utils.POST
    input.path == ["server", "exception"]
}

allow {
    input.method == utils.POST
    input.path == ["server", "logs"]
}

allow {
    input.method == utils.GET
    input.path == ["server", "plugins"]
}

allow {
    input.method == utils.GET
    input.path == ["server", "share"]
    utils.has_privilege(utils.USER)
}
