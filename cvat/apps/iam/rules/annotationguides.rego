package annotationguides

import data.utils
import data.organizations

# input: {
#     "scope": <"view"|"update"|"delete"|"create"> or null,
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
#         "organization": { "id": <num> or null },
#         "task": {
#             "owner": { "id": <num> or null },
#             "assignee": { "id": <num> or null },
#         },
#         "project": {
#             "owner": { "id": <num> or null },
#             "assignee": { "id": <num> or null },
#         },
#     }
# }

is_task_owner {
    input.resource.owner.id == input.auth.user.id
}

is_task_assignee {
    input.resource.assignee.id == input.auth.user.id
}

is_project_owner {
    input.resource.project.owner.id == input.auth.user.id
}

is_project_assignee {
    input.resource.project.assignee.id == input.auth.user.id
}

is_project_staff {
    is_project_owner
}

is_project_staff {
    is_project_assignee
}

is_task_staff {
    is_task_owner
}

is_task_staff {
    is_task_assignee
}

is_target_staff {
    is_project_staff
}

is_target_staff {
    is_task_staff
}

default allow = false

allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    utils.is_sandbox
    is_target_staff
}

allow {
    input.scope == utils.DELETE
    utils.is_sandbox
    is_target_staff
}

allow {
    input.scope == utils.DELETE
    utils.is_sandbox
    utils.is_resource_owner
}

allow {
    input.scope == utils.UPDATE
    utils.is_sandbox
    is_target_staff
}

allow {
    input.scope == utils.UPDATE
    utils.is_sandbox
    utils.is_resource_owner
}

allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    is_target_staff
}

allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    utils.is_resource_owner
}
