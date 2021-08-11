package tasks
import data.utils

default allow = false

allow {
    input.method == utils.POST
    input.path == ["tasks"]
    utils.has_privilege(utils.BUSINESS)
}

allow {
    input.method == utils.POST
    input.path == ["tasks"]
    count(input.owner.tasks) < input.restrictions.USER_TASKS_COUNT
    utils.has_privilege(utils.USER)
}