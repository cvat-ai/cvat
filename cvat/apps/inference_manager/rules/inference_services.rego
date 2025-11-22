package inference_services

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"list"|"view"|"update"|"delete"|"stop"|"predict"|"health"|"logs"> or null,
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
#         "model": { "id": <num> }
#     }
# }

default allow := false

# Scopes
STOP := "stop"
PREDICT := "predict"
HEALTH := "health"
LOGS := "logs"

# Admin has no restrictions
allow if {
    utils.is_admin
}

# Create: User+ in sandbox
allow if {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
    utils.is_sandbox
}

# Create: Maintainer+ in organization
allow if {
    input.scope == utils.CREATE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

# List: All users in sandbox
allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

# List: Organization members
allow if {
    input.scope == utils.LIST
    organizations.is_member
}

# Filter list based on permissions
filter := [] if { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else := qobject if {
    utils.is_admin
    qobject := [ {"organization": input.auth.organization.id} ]
} else := qobject if {
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
    qobject := [ {"organization": input.auth.organization.id} ]
} else := qobject if {
    utils.is_sandbox
    qobject := [ {"owner": input.auth.user.id} ]
} else := qobject if {
    utils.is_organization
    qobject := [ {"owner": input.auth.user.id}, {"organization": input.auth.organization.id}, "&" ]
}

# View: Owner in sandbox
allow if {
    input.scope == utils.VIEW
    utils.is_sandbox
    utils.is_resource_owner
}

# View: Owner in organization
allow if {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.is_resource_owner
}

# View: Supervisor+ in organization
allow if {
    input.scope == utils.VIEW
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

# Health check: Same as view (anyone who can view can check health)
allow if {
    input.scope == HEALTH
    utils.is_sandbox
    utils.is_resource_owner
}

allow if {
    input.scope == HEALTH
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
}

# Logs: Owner in sandbox
allow if {
    input.scope == LOGS
    utils.is_sandbox
    utils.is_resource_owner
}

# Logs: Owner or Supervisor+ in organization
allow if {
    input.scope == LOGS
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.is_resource_owner
}

allow if {
    input.scope == LOGS
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)
}

# Predict: Owner with Worker+ privilege in sandbox
allow if {
    input.scope == PREDICT
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Predict: Any organization member with Worker+ privilege (shared services)
allow if {
    input.scope == PREDICT
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
}

# Stop: Owner with Worker+ privilege in sandbox
allow if {
    input.scope == STOP
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Stop: Owner with Worker+ privilege in organization
allow if {
    input.scope == STOP
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Stop: Maintainer+ in organization
allow if {
    input.scope == STOP
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

# Update: Owner with Worker+ privilege in sandbox
allow if {
    input.scope == utils.UPDATE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Update: Owner with Worker+ privilege in organization
allow if {
    input.scope == utils.UPDATE
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Update: Maintainer+ in organization
allow if {
    input.scope == utils.UPDATE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

# Delete: Owner with Worker+ privilege in sandbox
allow if {
    input.scope == utils.DELETE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Delete: Owner with Worker+ privilege in organization
allow if {
    input.scope == utils.DELETE
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Delete: Maintainer+ in organization
allow if {
    input.scope == utils.DELETE
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}
