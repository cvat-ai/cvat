package tasks
import future.keywords.if
import future.keywords.in

import data.utils
import data.organizations

# input: {
#     "scope": <"create"|"create@project"|"view"|"list"|"update:desc"|
#         "update:owner"|"update:assignee"|"update:project"|"delete"|
#         "view:annotations"|"update:annotations"|"delete:annotations"|
#         "export:dataset"|"view:data"|"upload:data"|"export:annotations"> or null,
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
#         "assignee": { "id": <num> },
#         "organization": { "id": <num> } or null,
#         "project": {
#             "id": <num>,
#             "owner": { "id": <num> },
#             "assignee": { "id": <num> },
#             "organization": { "id": <num> } or null,
#         } or null,
#         "user": {
#             "num_resources": <num>
#         }
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
    is_project_staff
}

is_task_staff {
    is_task_owner
}

is_task_staff {
    is_task_assignee
}

simple_allow if {
    utils.is_admin
}

# Limits
USER_TASKS_LIMIT := 10
ORG_TASKS_LIMIT := 10

# Query rules
#
# Use simple rules when no explanation required.
#
# For complex rules use the "extended_checks" style. Each check must have a unique name
# in this format.

default simple_allow = false

extended_checks["user sandbox task create"] = { "allow": allow, "reason": reason } if {
    input.scope in { utils.CREATE, utils.IMPORT_BACKUP }
    utils.is_sandbox
    utils.has_perm(utils.USER)

    allow := input.resource.user.num_resources < USER_TASKS_LIMIT
    reason := "user task limit is reached"
}

extended_checks["org user supervisor org task create"] = { "allow": allow, "reason": reason } if {
    input.scope in { utils.CREATE, utils.IMPORT_BACKUP }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)

    # FIXME: this condition is probably using invalid input
    allow := input.resource.user.num_resources < ORG_TASKS_LIMIT
    reason := "org task limit is reached"
}

simple_allow if {
    input.scope in { utils.CREATE, utils.IMPORT_BACKUP }
    utils.is_sandbox
    utils.has_perm(utils.BUSINESS)
}

simple_allow if {
    input.scope in { utils.CREATE, utils.IMPORT_BACKUP }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.SUPERVISOR)
}

extended_checks["project user staff sandbox project task create"] = { "allow": allow, "reason": reason } if {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.USER)
    is_project_staff

    allow := input.resource.user.num_resources < USER_TASKS_LIMIT
    reason := "user project limit is reached"
}

extended_checks["org user supervisor org project task create"] = { "allow": allow, "reason": reason } if {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.SUPERVISOR)

    # FIXME: this condition is probably using invalid input
    allow := input.resource.user.num_resources < ORG_TASKS_LIMIT
    reason := "org project limit is reached"
}

extended_checks["org project worker staff org project task create"] = { "allow": allow, "reason": reason } if {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.WORKER)
    is_project_staff

    # FIXME: this condition is probably using invalid input
    allow := input.resource.user.num_resources < ORG_TASKS_LIMIT
    reason := "project task limit is reached"
}

simple_allow if {
    input.scope == utils.CREATE_IN_PROJECT
    utils.is_sandbox
    utils.has_perm(utils.BUSINESS)
    is_project_staff
}

simple_allow if {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.SUPERVISOR)
}

simple_allow if {
    input.scope == utils.CREATE_IN_PROJECT
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.BUSINESS)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
}

simple_allow if {
    input.scope == utils.LIST
    utils.is_sandbox
}

simple_allow if {
    input.scope == utils.LIST
    organizations.is_member
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
    utils.is_sandbox
} else = qobject {
    utils.is_admin
    utils.is_organization
    qobject := [ {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|"]
} else = qobject {
    utils.is_sandbox
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"project__owner_id": user.id}, "|", {"project__assignee_id": user.id}, "|"]
} else = qobject {
    utils.is_organization
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
    qobject := [ {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|"]
} else = qobject {
    organizations.has_perm(organizations.WORKER)
    user := input.auth.user
    qobject := [ {"owner_id": user.id}, {"assignee_id": user.id}, "|",
        {"project__owner_id": user.id}, "|", {"project__assignee_id": user.id}, "|",
        {"organization": input.auth.organization.id},
        {"project__organization": input.auth.organization.id}, "|", "&"]
}

simple_allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET, utils.VIEW_METADATA,
        utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP
    }
    utils.is_sandbox
    is_task_staff
}

simple_allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET, utils.VIEW_METADATA,
        utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

simple_allow if {
    input.scope in {
        utils.VIEW, utils.VIEW_ANNOTATIONS, utils.EXPORT_DATASET, utils.VIEW_METADATA,
        utils.VIEW_DATA, utils.EXPORT_ANNOTATIONS, utils.EXPORT_BACKUP
    }
    input.auth.organization.id == input.resource.organization.id
    organizations.has_perm(organizations.WORKER)
    is_task_staff
}

simple_allow if {
    input.scope in {
        utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.UPLOAD_DATA, utils.UPDATE_METADATA, utils.IMPORT_ANNOTATIONS
    }
    utils.is_sandbox
    is_task_staff
    utils.has_perm(utils.WORKER)
}

simple_allow if {
    input.scope in {
        utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.UPLOAD_DATA, utils.UPDATE_METADATA, utils.IMPORT_ANNOTATIONS
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

simple_allow if {
    input.scope in {
        utils.UPDATE_DESC, utils.UPDATE_ANNOTATIONS, utils.DELETE_ANNOTATIONS,
        utils.UPLOAD_DATA, utils.UPDATE_METADATA, utils.IMPORT_ANNOTATIONS
    }
    is_task_staff
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
}

simple_allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ORG
    }
    utils.is_sandbox
    is_project_staff
    utils.has_perm(utils.WORKER)
}

simple_allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ORG
    }
    utils.is_sandbox
    is_task_owner
    utils.has_perm(utils.WORKER)
}

simple_allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ORG
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.USER)
    organizations.has_perm(organizations.MAINTAINER)
}

simple_allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ORG
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_task_owner
}

simple_allow if {
    input.scope in {
        utils.UPDATE_OWNER, utils.UPDATE_ASSIGNEE, utils.UPDATE_PROJECT,
        utils.DELETE, utils.UPDATE_ORG
    }
    input.auth.organization.id == input.resource.organization.id
    utils.has_perm(utils.WORKER)
    organizations.has_perm(organizations.WORKER)
    is_project_staff
}


# Create the resulting decision
# We prioritize allowances over denials here

default result = {
	"allow": false,
	"reason": "unauthorized resource access",
}

result = {"allow": true} if {
    # there is no "or" operator in rego
    simple_allow
} else = {"allow": true} if {
    some check in extended_checks
    check.allow == true
} else = {"allow": false, "reason": check.reason} if {
	some check in extended_checks
	check.allow == false
}

allow = result.allow
