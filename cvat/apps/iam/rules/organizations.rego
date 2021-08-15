package organizations
import data.utils

default allow = false
allow {
    utils.is_admin
}

allow {
    input.method == utils.POST
    input.path == ["organizations"]
    utils.has_privilege(utils.USER)
    count(input.owner.organizations) < input.restrictions.USER_ORGS_COUNT
}

allow {
    input.method == utils.POST
    input.path == ["organizations"]
    utils.has_privilege(utils.BUSINESS)
}

allow {
    allowed_methods = {utils.GET, utils.PATCH, utils.DELETE}
    allowed_methods[input.method]
    org_id := input.path[1]
    input.path == ["organizations", org_id]
    input.organization.owner.id == input.user.id
}

filter = v {
    utils.is_admin
    v := ["all"]
} else = v {
    v := ["own"]
}
