package augmentation_jobs

import rego.v1

import data.utils
import data.organizations

# Constants
CREATE := "create"
LIST := "list"
VIEW := "view"
UPDATE := "update"
DELETE := "delete"
CANCEL := "cancel"
LOGS := "logs"

# Default deny
default allow := false

# Admin bypass
allow if {
    utils.is_admin
}

# List: Organization members can list jobs in their organization
allow if {
    input.scope == LIST
    utils.is_sandbox
}

allow if {
    input.scope == LIST
    organizations.is_member
}

# Create: Maintainers and above can create augmentation jobs
allow if {
    input.scope == CREATE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == CREATE
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.MAINTAINER)
}

# View: Job owner or organization members with Worker+ role
allow if {
    input.scope == VIEW
    input.auth.user.id == input.resource.owner.id
}

allow if {
    input.scope == VIEW
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
}

# Update: Job owner or Maintainers in organization
allow if {
    input.scope == UPDATE
    input.auth.user.id == input.resource.owner.id
}

allow if {
    input.scope == UPDATE
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.MAINTAINER)
}

# Delete: Job owner or Maintainers in organization
allow if {
    input.scope == DELETE
    input.auth.user.id == input.resource.owner.id
}

allow if {
    input.scope == DELETE
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.MAINTAINER)
}

# Cancel: Job owner or Supervisors+ in organization
allow if {
    input.scope == CANCEL
    input.auth.user.id == input.resource.owner.id
}

allow if {
    input.scope == CANCEL
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.SUPERVISOR)
}

# Logs: Job owner or Workers+ in organization
allow if {
    input.scope == LOGS
    input.auth.user.id == input.resource.owner.id
}

allow if {
    input.scope == LOGS
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
}

# List filter: Return jobs visible to user
filter := [] if {
    utils.is_admin
    utils.is_sandbox
} else := qobjs if {
    utils.is_sandbox
    qobjs := [job |
        some job in input.resource
        job.owner.id == input.auth.user.id
    ]
} else := qobjs if {
    utils.is_organization
    organizations.is_member
    qobjs := [job |
        some job in input.resource
        job.organization.id == input.auth.organization.id
    ]
}
