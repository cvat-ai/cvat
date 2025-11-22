package models

import rego.v1

import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"list"|"view"|"update"|"delete"|"sync"|"download"> or null,
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
#     }
# }

default allow := false

# Scopes
SYNC := "sync"
DOWNLOAD := "download"

# Admin has no restrictions
allow if {
    utils.is_admin
}

# Create: User privilege in sandbox
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

# Sync: User privilege in sandbox (requires cloud storage)
allow if {
    input.scope == SYNC
    utils.has_perm(utils.USER)
    utils.is_sandbox
}

# Sync: Maintainer+ in organization
allow if {
    input.scope == SYNC
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

# List: All users in sandbox can list their models
allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

# List: Organization members can list organization models
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

# Download: Owner in sandbox (Worker+ privilege)
allow if {
    input.scope == DOWNLOAD
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Download: Owner in organization (Worker+ privilege)
allow if {
    input.scope == DOWNLOAD
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Download: Any member in organization (for shared models)
allow if {
    input.scope == DOWNLOAD
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
}

# Update: Owner in sandbox (Worker+ privilege)
allow if {
    input.scope == utils.UPDATE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Update: Owner in organization (Worker+ privilege)
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

# Delete: Owner in sandbox (Worker+ privilege)
allow if {
    input.scope == utils.DELETE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
}

# Delete: Owner in organization (Worker+ privilege)
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
