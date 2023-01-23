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
CAP_USER_SANDBOX_PROJECT_WEBHOOKS = "USER_SANDBOX_PROJECT_WEBHOOKS"
CAP_USER_SANDBOX_LAMBDA_CALL_OFFLINE = "USER_SANDBOX_LAMBDA_CALL_OFFLINE"
CAP_USER_SANDBOX_JOB_EXPORT_DATASET = "USER_SANDBOX_JOB_EXPORT_DATASET"
CAP_USER_SANDBOX_TASK_EXPORT_DATASET = "USER_SANDBOX_TASK_EXPORT_DATASET"
CAP_USER_SANDBOX_PROJECT_EXPORT_DATASET = "USER_SANDBOX_PROJECT_EXPORT_DATASET"
CAP_ORG_TASKS = "ORG_TASKS"
CAP_ORG_PROJECTS = "ORG_PROJECTS"
CAP_TASKS_IN_ORG_PROJECT = "TASKS_IN_ORG_PROJECT"
CAP_ORG_CLOUD_STORAGES = "ORG_CLOUD_STORAGES"
CAP_ORG_COMMON_WEBHOOKS = "ORG_COMMON_WEBHOOKS"
CAP_ORG_PROJECT_WEBHOOKS = "ORG_PROJECT_WEBHOOKS"
CAP_ORG_LAMBDA_CALL_OFFLINE = "ORG_LAMBDA_CALL_OFFLINE"
CAP_ORG_JOB_EXPORT_DATASET = "ORG_JOB_EXPORT_DATASET"
CAP_ORG_TASK_EXPORT_DATASET = "ORG_TASK_EXPORT_DATASET"
CAP_ORG_PROJECT_EXPORT_DATASET = "ORG_PROJECT_EXPORT_DATASET"
CAP_ORG_MEMBERS = "ORG_MEMBERS"


check_limit_exceeded(current, max) {
    null != max
    current >= max
}

problems contains "lambda requests per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_LAMBDA_CALL_OFFLINE].used,
        input.resource.limits[CAP_USER_SANDBOX_LAMBDA_CALL_OFFLINE].max
    )
}

problems contains "exporting job dataset with images per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_JOB_EXPORT_DATASET].used,
        input.resource.limits[CAP_USER_SANDBOX_JOB_EXPORT_DATASET].max
    )
}

problems contains "exporting task dataset per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_TASK_EXPORT_DATASET].used,
        input.resource.limits[CAP_USER_SANDBOX_TASK_EXPORT_DATASET].max
    )
}

problems contains "exporting project dataset per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_PROJECT_EXPORT_DATASET].used,
        input.resource.limits[CAP_USER_SANDBOX_PROJECT_EXPORT_DATASET].max
    )
}

problems contains "lambda requests per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_LAMBDA_CALL_OFFLINE].used,
        input.resource.limits[CAP_ORG_LAMBDA_CALL_OFFLINE].max
    )
}

problems contains "exporting job dataset per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_JOB_EXPORT_DATASET].used,
        input.resource.limits[CAP_ORG_JOB_EXPORT_DATASET].max
    )
}

problems contains "exporting task dataset per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_TASK_EXPORT_DATASET].used,
        input.resource.limits[CAP_ORG_TASK_EXPORT_DATASET].max
    )
}

problems contains "exporting project dataset per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_PROJECT_EXPORT_DATASET].used,
        input.resource.limits[CAP_ORG_PROJECT_EXPORT_DATASET].max
    )
}

problems contains "tasks per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_TASKS].used,
        input.resource.limits[CAP_USER_SANDBOX_TASKS].max
    )
}

problems contains "projects per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_PROJECTS].used,
        input.resource.limits[CAP_USER_SANDBOX_PROJECTS].max
    )
}

problems contains "tasks per project for the user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASKS_IN_USER_SANDBOX_PROJECT].used,
        input.resource.limits[CAP_TASKS_IN_USER_SANDBOX_PROJECT].max
    )
}

problems contains "tasks per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_TASKS].used,
        input.resource.limits[CAP_ORG_TASKS].max
    )
}

problems contains "projects per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_PROJECTS].used,
        input.resource.limits[CAP_ORG_PROJECTS].max
    )
}

problems contains "tasks per project for the organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_TASKS_IN_ORG_PROJECT].used,
        input.resource.limits[CAP_TASKS_IN_ORG_PROJECT].max
    )
}

problems contains "webhooks per project for the organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_PROJECT_WEBHOOKS].used,
        input.resource.limits[CAP_ORG_PROJECT_WEBHOOKS].max
    )
}

problems contains "webhooks per project for the user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_PROJECT_WEBHOOKS].used,
        input.resource.limits[CAP_USER_SANDBOX_PROJECT_WEBHOOKS].max
    )
}

problems contains "webhooks for the organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_COMMON_WEBHOOKS].used,
        input.resource.limits[CAP_ORG_COMMON_WEBHOOKS].max
    )
}

problems contains "organizations per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_OWNED_ORGS].used,
        input.resource.limits[CAP_USER_OWNED_ORGS].max
    )
}

problems contains "cloud storages per user" if {
    check_limit_exceeded(
        input.resource.limits[CAP_USER_SANDBOX_CLOUD_STORAGES].used,
        input.resource.limits[CAP_USER_SANDBOX_CLOUD_STORAGES].max
    )
}

problems contains "cloud storages per organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_CLOUD_STORAGES].used,
        input.resource.limits[CAP_ORG_CLOUD_STORAGES].max
    )
}

problems contains "members of organization" if {
    check_limit_exceeded(
        input.resource.limits[CAP_ORG_MEMBERS].used,
        input.resource.limits[CAP_ORG_MEMBERS].max
    )
}

# In the case of invalid input or no applicable limits,
# we deny the request. We suppose that we always check at least 1
# limit, and this package is queried by IAM only when there are
# limits to check in the input scope.
default result = {
    "allow": false,
    "reasons": []
}

result := {
    "allow": true,
    "reasons": [],
} if {
    utils.is_admin
} else := {
    "allow": count(problems) == 0,
    "reasons": problems
} if {
    not utils.is_admin
    count(input.resource.limits) != 0
}

allow := result.allow
