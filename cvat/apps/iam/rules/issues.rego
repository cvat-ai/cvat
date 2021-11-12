package issues
import data.utils

default allow = false

allow {
    utils.is_admin
}

filter = [] {
    utils.is_admin
}