package cloudstorages
import data.utils
import data.organizations

default allow = false

# Admin has no restrictions
allow {
    utils.is_admin
}

allow {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
    input.auth.organization == null
}

allow {
    input.scope == utils.CREATE
    utils.has_perm(utils.USER)
    organizations.has_role(organizations.MAINTAINER)
}

allow {
    input.scope == utils.LIST
    input.auth.organization == null
}

allow {
    input.scope == utils.LIST
    organizations.is_member
}

allow {
    input.scope == utils.VIEW
    utils.is_resource_owner
    input.auth.organization == null
}

allow {
    input.scope == utils.VIEW
    utils.has_perm(utils.USER)
    organizations.has_role(organizations.SUPERVISOR)
}

allow {
    input.scope == utils.VIEW
    utils.is_resource_owner
    organizations.is_member
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
    input.auth.organization == null
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    utils.has_perm(utils.USER)
    organizations.has_role(organizations.MAINTAINER)
}

allow {
    { utils.UPDATE, utils.DELETE }[input.scope]
    utils.has_perm(utils.WORKER)
    utils.is_resource_owner
    organizations.is_member
}

allow {
    input.scope == utils.LIST_CONTENT
    utils.is_resource_owner
}

allow {
    input.scope == utils.LIST_CONTENT
    utils.has_perm(utils.USER)
    organizations.has_role(organizations.SUPERVISOR)
}

allow {
    input.scope == utils.LIST_CONTENT
    utils.is_resource_owner
    organizations.is_member
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
    input.auth.organization == null
} else = qobject {
    utils.is_admin
    input.auth.organization != null
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    utils.has_perm(utils.USER)
    organizations.has_role(organizations.SUPERVISOR)
    qobject := [ {"organization": input.auth.organization.id} ]
} else = qobject {
    input.auth.organization == null
    user := input.auth.user
    qobject := [ {"owner_id": user.id} ]
} else = qobject {
    input.auth.organization != null
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"organization": input.auth.organization.id}, "&" ]
}
