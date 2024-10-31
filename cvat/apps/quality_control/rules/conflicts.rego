package conflicts

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"list"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"user"|"worker"> or null
#         },
#         "organization": {
#             "id": <num>,
#             "owner": {
#                 "id": <num>
#             },
#             "user": {
#                 "role": <"owner"|"maintainer"|"supervisor"|"worker"> or null
#             }
#         } or null,
#     },
#     "resource": {
#         "id": <num>,
#         "owner": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "task": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#         "project": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#     }
# }

default allow := false

allow if {
    utils.is_admin
}

allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow if {
    input.scope == utils.LIST
    organizations.is_member
}

filter := [] if { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else := qobject if {
    utils.is_admin
    utils.is_organization
    org := input.auth.organization
    qobject := [
        {"report__job__segment__task__organization": org.id},
        {"report__job__segment__task__project__organization": org.id}, "|",
        {"report__task__organization": org.id}, "|",
        {"report__task__project__organization": org.id}, "|",
    ]
} else := qobject if {
    utils.is_sandbox
    user := input.auth.user
    qobject := [
        {"report__job__segment__task__owner_id": user.id},
        {"report__job__segment__task__assignee_id": user.id}, "|",
        {"report__job__segment__task__project__owner_id": user.id}, "|",
        {"report__job__segment__task__project__assignee_id": user.id}, "|",
        {"report__task__owner_id": user.id}, "|",
        {"report__task__assignee_id": user.id}, "|",
        {"report__task__project__owner_id": user.id}, "|",
        {"report__task__project__assignee_id": user.id}, "|",
    ]
} else := qobject if {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    org := input.auth.organization
    qobject := [
        {"report__job__segment__task__organization": org.id},
        {"report__job__segment__task__project__organization": org.id}, "|",
        {"report__task__organization": org.id}, "|",
        {"report__task__project__organization": org.id}, "|",
    ]
} else := qobject if {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    org := input.auth.organization
    qobject := [
        {"report__job__segment__task__organization": org.id},
        {"report__job__segment__task__project__organization": org.id}, "|",
        {"report__task__organization": org.id}, "|",
        {"report__task__project__organization": org.id}, "|",

        {"report__job__segment__task__owner_id": user.id},
        {"report__job__segment__task__assignee_id": user.id}, "|",
        {"report__job__segment__task__project__owner_id": user.id}, "|",
        {"report__job__segment__task__project__assignee_id": user.id}, "|",
        {"report__task__owner_id": user.id}, "|",
        {"report__task__assignee_id": user.id}, "|",
        {"report__task__project__owner_id": user.id}, "|",
        {"report__task__project__assignee_id": user.id}, "|",

        "&"
    ]
}
