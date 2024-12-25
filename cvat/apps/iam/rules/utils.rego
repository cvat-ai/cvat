package utils

import rego.v1

# Groups
ADMIN := "admin"
USER := "user"
WORKER := "worker"

# Visibility of objects
PUBLIC := "public"
PRIVATE := "private"
INTERNAL := "internal"

# Context
SANDBOX := "sandbox"
ORGANIZATION := "organization"

# Scopes
CREATE := "create"
LIST := "list"
VIEW := "view"
UPDATE := "update"
ACCEPT := "accept"
DECLINE := "decline"
DELETE := "delete"
LIST_CONTENT := "list:content"
CALL_ONLINE := "call:online"
CALL_OFFLINE := "call:offline"
LIST_OFFLINE := "list:offline"
SEND_EVENTS := "send:events"
DUMP_EVENTS := "dump:events"
CHANGE_ROLE := "change:role"
RESEND := "resend"
UPDATE_DESC := "update:desc"
UPDATE_ASSIGNEE := "update:assignee"
UPDATE_OWNER := "update:owner"
UPDATE_ASSOCIATED_STORAGE := "update:associated_storage"
EXPORT_ANNOTATIONS := "export:annotations"
EXPORT_DATASET := "export:dataset"
CREATE_IN_PROJECT := "create@project"
CREATE_IN_ORGANIZATION := "create@organization"
UPDATE_PROJECT := "update:project"
VIEW_ANNOTATIONS := "view:annotations"
UPDATE_ANNOTATIONS := "update:annotations"
DELETE_ANNOTATIONS := "delete:annotations"
VIEW_DATA := "view:data"
UPLOAD_DATA := "upload:data"
VIEW_METADATA := "view:metadata"
UPDATE_METADATA := "update:metadata"
IMPORT_ANNOTATIONS := "import:annotations"
UPDATE_STATE := "update:state"
UPDATE_STAGE := "update:stage"
CREATE_IN_JOB := "create@job"
CREATE_IN_ISSUE := "create@issue"
IMPORT_DATASET := "import:dataset"
IMPORT_BACKUP := "import:backup"
EXPORT_BACKUP := "export:backup"
UPDATE_ORG := "update:organization"
VIEW_STATUS := "view:status"
VIEW_VALIDATION_LAYOUT := "view:validation_layout"
UPDATE_VALIDATION_LAYOUT := "update:validation_layout"


get_priority(privilege) := {
    ADMIN: 0,
    USER: 75,
    WORKER: 100,
    null: 1000
}[privilege]

has_perm(group) if {
    get_priority(input.auth.user.privilege) <= get_priority(group)
}

is_admin if {
    input.auth.user.privilege == ADMIN
}

is_user if {
    input.auth.user.privilege == USER
}

is_worker if {
    input.auth.user.privilege == WORKER
}

is_resource_owner if {
    input.resource.owner.id == input.auth.user.id
}

is_resource_assignee if {
    input.resource.assignee.id == input.auth.user.id
}

is_sandbox if {
    input.auth.organization == null
}

is_organization if {
    input.auth.organization != null
}
