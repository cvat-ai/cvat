package quality_reports

import future.keywords.if
import future.keywords.in

import data.utils
import data.organizations

# input: {
#     "scope": <"view"|"list"|"create"|"view:status"> or null,
#     "auth": {
#         "user": {
#             "id": <num>,
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
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

allow {
    utils.is_admin
}

allow {
    input.scope == utils.LIST
    utils.is_sandbox
}

allow {
    input.scope == utils.LIST
    organizations.is_member
}

filter := [] { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else := qobject {
    utils.is_admin
    utils.is_organization
    org := input.auth.organization
    qobject := [
        {"job__segment__task__organization": org.id},
        {"job__segment__task__project__organization": org.id}, "|",
        {"task__organization": org.id}, "|",
        {"task__project__organization": org.id}, "|",
    ]
} else := qobject {
    utils.is_sandbox
    user := input.auth.user
    qobject := [
        {"job__segment__task__owner_id": user.id},
        {"job__segment__task__assignee_id": user.id}, "|",
        {"job__segment__task__project__owner_id": user.id}, "|",
        {"job__segment__task__project__assignee_id": user.id}, "|",
        {"task__owner_id": user.id}, "|",
        {"task__assignee_id": user.id}, "|",
        {"task__project__owner_id": user.id}, "|",
        {"task__project__assignee_id": user.id}, "|",
    ]
} else := qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    org := input.auth.organization
    qobject := [
        {"job__segment__task__organization": org.id},
        {"job__segment__task__project__organization": org.id}, "|",
        {"task__organization": org.id}, "|",
        {"task__project__organization": org.id}, "|",
    ]
} else := qobject {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    org := input.auth.organization
    qobject := [
        {"job__segment__task__organization": org.id},
        {"job__segment__task__project__organization": org.id}, "|",
        {"task__organization": org.id}, "|",
        {"task__project__organization": org.id}, "|",

        {"job__segment__task__owner_id": user.id},
        {"job__segment__task__assignee_id": user.id}, "|",
        {"job__segment__task__project__owner_id": user.id}, "|",
        {"job__segment__task__project__assignee_id": user.id}, "|",
        {"task__owner_id": user.id}, "|",
        {"task__assignee_id": user.id}, "|",
        {"task__project__owner_id": user.id}, "|",
        {"task__project__assignee_id": user.id}, "|",

        "&"
    ]
}
