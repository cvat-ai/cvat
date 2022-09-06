package webhooks
import data.utils
import data.organizations

# input : {
#     "scope": <"create@project" | "create@organization" | "update" > or null,
#     "auth": {
#         "user": {
#             "id": <num>
#             "privilege": <"admin"|"business"|"user"|"worker"> or null
#         }
#         "organization": {
#             "id": <num>,
#             "owner":
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
#         "project": {
#             "id": <num>,
#             "owner": { "id": num },
#         } or null,
#         "num_resources": <num>
#     }
# }
#

default allow = false

is_project_owner {
    input.resource.project.owner.id == input.auth.user.id
}

is_webhook_owner {
    input.resource.owner.id == input.auth.user.id
}

allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.USER)
    is_project_owner
}

allow {
    {utils.CREATE_IN_PROJECT, utils.CREATE_IN_ORGANIZATION, utils.UPDATE}[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.MAINTAINER)
}

allow {
    {utils.CREATE_IN_PROJECT, utils.UPDATE}[input.scope]
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_owner
}

allow {
    input.scope == utils.UPDATE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

allow {
    input.scope == utils.UPDATE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    is_project_owner
}

allow {
    input.scope == utils.UPDATE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    utils.is_resource_owner
}


