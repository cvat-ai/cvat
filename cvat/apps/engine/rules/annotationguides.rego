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
#         "organization": { "id": <num> or null },
#         "target": {
#             "owner": { "id": <num> or null },
#             "assignee": { "id": <num> or null },
#             "is_job_staff": <boolean>,
#         },
#     }
# }

is_target_owner {
    input.resource.target.owner.id == input.auth.user.id
}

is_target_assignee {
    input.resource.target.assignee.id == input.auth.user.id
}

is_target_staff {
    is_target_owner
}

is_target_staff {
    is_target_assignee
}

default allow := false

allow {
    utils.is_admin
}

allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    input.resource.target.is_job_staff
}

allow {
    input.scope == utils.VIEW
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_target_staff
}

allow {
    { utils.CREATE, utils.DELETE, utils.UPDATE }[input.scope]
    utils.is_sandbox
    utils.has_perm(utils.USER)
    is_target_staff
}

allow {
    { utils.CREATE, utils.DELETE, utils.UPDATE, utils.VIEW }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    { utils.CREATE, utils.DELETE, utils.UPDATE }[input.scope]
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.USER)
    is_target_staff
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    is_target_staff
}

allow {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    input.resource.target.is_job_staff
}
