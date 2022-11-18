package limits

import future.keywords.if
import future.keywords.in
import future.keywords.contains


CAP_TASK_CREATE = "task_create"
CAP_TASK_CREATE_IN_PROJECT = "task_create_in_project"
CAP_PROJECT_CREATE = "project_create"
CAP_ORG_CREATE = "org_create"
CAP_CLOUD_STORAGE_CREATE = "cloud_storage_create"
CAP_WEBHOOK_CREATE = "webhook_create"

check_limit_exceeded(current, max) {
    null != max
    current >= max
}


default checks = []

checks contains "user tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASK_CREATE].used,
        input.resource.limits[CAP_TASK_CREATE].max
    )
}

checks contains "user projects limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_PROJECT_CREATE].used,
        input.resource.limits[CAP_PROJECT_CREATE].max
    )
}

checks contains "user project tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASK_CREATE_IN_PROJECT].used,
        input.resource.limits[CAP_TASK_CREATE_IN_PROJECT].max
    )
}

checks contains "org tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASK_CREATE].used,
        input.resource.limits[CAP_TASK_CREATE].max
    )
}

checks contains "org projects limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_PROJECT_CREATE].used,
        input.resource.limits[CAP_PROJECT_CREATE].max
    )
}

checks contains "org project tasks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASK_CREATE_IN_PROJECT].used,
        input.resource.limits[CAP_TASK_CREATE_IN_PROJECT].max
    )
}

checks contains "project webhooks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_WEBHOOK_CREATE].used,
        input.resource.limits[CAP_WEBHOOK_CREATE].max
    )
}

checks contains "org webhooks limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_WEBHOOK_CREATE].used,
        input.resource.limits[CAP_WEBHOOK_CREATE].max
    )
}

checks contains "user orgs limit reached" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_CREATE].used,
        input.resource.limits[CAP_ORG_CREATE].max
    )
}


result := {
    "allow": count(checks) == 0,
    "reasons": checks
}

allow := result.allow
