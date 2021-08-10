package projects
import data.utils

default allow = false

allow {
    input.method == utils.POST
    input.path == ["projects"]
    utils.has_privilege(utils.BUSINESS)
}

allow {
    input.method == utils.POST
    input.path == ["projects"]
    count(input.owner.projects) < input.restrictions.USER_PROJECTS_COUNT
    utils.has_privilege(utils.USER)
}
