package server
import data.utils

default allow = false
allow {
    input.scope == utils.VIEW
}

allow {
    input.scope == utils.SEND_EXCEPTION
}

allow {
    input.scope == utils.SEND_LOGS
}

allow {
    input.scope == utils.LIST_CONTENT
    utils.has_privilege(utils.USER)
}
