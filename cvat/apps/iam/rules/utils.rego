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
ACCEPT := "accept"
CALL_OFFLINE := "call:offline"
CALL_ONLINE := "call:online"
CHANGE_ROLE := "change:role"
CREATE := "create"
CREATE_IN_ISSUE := "create@issue"
CREATE_IN_JOB := "create@job"
CREATE_IN_ORGANIZATION := "create@organization"
CREATE_IN_PROJECT := "create@project"
DECLINE := "decline"
DELETE := "delete"
DELETE_ANNOTATIONS := "delete:annotations"
DOWNLOAD_EXPORTED_FILE := "download:exported_file"
DUMP_EVENTS := "dump:events"
EXPORT_ANNOTATIONS := "export:annotations"
EXPORT_BACKUP := "export:backup"
EXPORT_DATASET := "export:dataset"
IMPORT_ANNOTATIONS := "import:annotations"
IMPORT_BACKUP := "import:backup"
IMPORT_DATASET := "import:dataset"
LIST := "list"
LIST_CONTENT := "list:content"
LIST_OFFLINE := "list:offline"
RESEND := "resend"
SEND_EVENTS := "send:events"
UPDATE := "update"
UPDATE_ANNOTATIONS := "update:annotations"
UPDATE_ASSIGNEE := "update:assignee"
UPDATE_ASSOCIATED_STORAGE := "update:associated_storage"
UPDATE_DESC := "update:desc"
UPDATE_METADATA := "update:metadata"
UPDATE_OWNER := "update:owner"
UPDATE_PERSONAL_DATA := "update:personal_data"
UPDATE_PROJECT := "update:project"
UPDATE_STAGE := "update:stage"
UPDATE_STATE := "update:state"
UPDATE_VALIDATION_LAYOUT := "update:validation_layout"
UPLOAD_DATA := "upload:data"
VIEW := "view"
VIEW_ANNOTATIONS := "view:annotations"
VIEW_DATA := "view:data"
VIEW_METADATA := "view:metadata"
VIEW_STATUS := "view:status"
VIEW_VALIDATION_LAYOUT := "view:validation_layout"


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
