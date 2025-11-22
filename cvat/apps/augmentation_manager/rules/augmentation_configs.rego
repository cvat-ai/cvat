package augmentation_configs

import rego.v1

import data.utils
import data.organizations

# Constants
CREATE := "create"
LIST := "list"
VIEW := "view"
UPDATE := "update"
DELETE := "delete"

# Default deny
default allow := false

# Admin bypass
allow if {
    utils.is_admin
}

# List: Organization members can list configs
allow if {
    input.scope == LIST
    utils.is_sandbox
}

allow if {
    input.scope == LIST
    organizations.is_member
}

# Create: Workers and above can create configs
allow if {
    input.scope == CREATE
    utils.is_sandbox
    utils.has_perm(utils.WORKER)
}

allow if {
    input.scope == CREATE
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
}

# View: Config owner, or anyone if template, or organization members
allow if {
    input.scope == VIEW
    input.auth.user.id == input.resource.owner.id
}

allow if {
    input.scope == VIEW
    input.resource.is_template == true
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
}

allow if {
    input.scope == VIEW
    utils.is_sandbox
}

allow if {
    input.scope == VIEW
    input.auth.organization.id == input.resource.organization.id
    organizations.is_member
    utils.has_perm(utils.WORKER)
}

# Update: Config owner or Maintainers
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

# Delete: Config owner or Maintainers
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

# List filter: Return configs visible to user
filter := [] if {
    utils.is_admin
    utils.is_sandbox
} else := qobjs if {
    utils.is_sandbox
    qobjs := [config |
        some config in input.resource
        config.owner.id == input.auth.user.id
    ]
} else := qobjs if {
    utils.is_organization
    organizations.is_member
    qobjs := [config |
        some config in input.resource
        config.organization.id == input.auth.organization.id
        (config.is_template == true) or (config.owner.id == input.auth.user.id)
    ]
}
