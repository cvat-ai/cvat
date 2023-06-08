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
    { utils.CREATE, utils.DELETE, utils.UPDATE, utils.VIEW }[input.scope]
    input.scope == utils.CREATE
    utils.is_sandbox
    is_target_staff
}

allow {
    { utils.CREATE, utils.DELETE, utils.UPDATE, utils.VIEW }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.CREATE, utils.DELETE, utils.UPDATE, utils.VIEW }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    is_target_staff
}
