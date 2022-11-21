package limits

import future.keywords.if
import future.keywords.in
import future.keywords.contains

import data.utils


CAP_USER_SANDBOX_TASKS = "USER_SANDBOX_TASKS"
CAP_USER_SANDBOX_PROJECTS = "USER_SANDBOX_PROJECTS"
CAP_TASKS_IN_USER_SANDBOX_PROJECT = "TASKS_IN_USER_SANDBOX_PROJECT"
CAP_USER_OWNED_ORGS = "USER_OWNED_ORGS"
CAP_USER_SANDBOX_CLOUD_STORAGES = "USER_SANDBOX_CLOUD_STORAGES"
CAP_ORG_TASKS = "ORG_TASKS"
CAP_ORG_PROJECTS = "ORG_PROJECTS"
CAP_TASKS_IN_ORG_PROJECT = "TASKS_IN_ORG_PROJECT"
CAP_ORG_CLOUD_STORAGES = "ORG_CLOUD_STORAGES"
CAP_ORG_COMMON_WEBHOOKS = "ORG_COMMON_WEBHOOKS"
CAP_PROJECT_WEBHOOKS = "PROJECT_WEBHOOKS"


check_limit_exceeded(current, max) {
    null != max
    current >= max
}



checks contains "user tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_TASKS].used,
        input.resource.limits[CAP_USER_SANDBOX_TASKS].max
    )
}

checks contains "user projects limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_PROJECTS].used,
        input.resource.limits[CAP_USER_SANDBOX_PROJECTS].max
    )
}

checks contains "user project tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASKS_IN_USER_SANDBOX_PROJECT].used,
        input.resource.limits[CAP_TASKS_IN_USER_SANDBOX_PROJECT].max
    )
}

checks contains "org tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_TASKS].used,
        input.resource.limits[CAP_ORG_TASKS].max
    )
}

checks contains "org projects limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_PROJECTS].used,
        input.resource.limits[CAP_ORG_PROJECTS].max
    )
}

checks contains "org project tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASKS_IN_ORG_PROJECT].used,
        input.resource.limits[CAP_TASKS_IN_ORG_PROJECT].max
    )
}

checks contains "project webhooks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_PROJECT_WEBHOOKS].used,
        input.resource.limits[CAP_PROJECT_WEBHOOKS].max
    )
}

checks contains "org webhooks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_COMMON_WEBHOOKS].used,
        input.resource.limits[CAP_ORG_COMMON_WEBHOOKS].max
    )
}

checks contains "user orgs limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_OWNED_ORGS].used,
        input.resource.limits[CAP_USER_OWNED_ORGS].max
    )
}

checks contains "user cloud storages limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_CLOUD_STORAGES].used,
        input.resource.limits[CAP_USER_SANDBOX_CLOUD_STORAGES].max
    )
}

checks contains "org cloud storages limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_CLOUD_STORAGES].used,
        input.resource.limits[CAP_ORG_CLOUD_STORAGES].max
    )
}


result := {
    "allow": count(checks) == 0,
    "reasons": checks
} if {
    not utils.is_admin
} else := {
    "allow": true,
    "reasons": [],
}

allow := result.allow
