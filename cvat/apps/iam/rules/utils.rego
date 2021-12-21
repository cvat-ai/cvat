package utils

# Groups
ADMIN := "admin"
BUSINESS := "business"
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
DELETE := "delete"
LIST_CONTENT := "list:content"
CALL_ONLINE := "call:online"
CALL_OFFLINE := "call:offline"
SEND_EXCEPTION := "send:exception"
SEND_LOGS := "send:logs"
CHANGE_ROLE := "change:role"
RESEND := "resend"
UPDATE_DESC := "update:desc"
UPDATE_ASSIGNEE := "update:assignee"
UPDATE_OWNER := "update:owner"
EXPORT_ANNOTATIONS := "export:annotations"
EXPORT_DATASET := "export:dataset"
CREATE_IN_PROJECT := "create@project"
UPDATE_PROJECT := "update:project"
VIEW_ANNOTATIONS := "view:annotations"
UPDATE_ANNOTATIONS := "update:annotations"
DELETE_ANNOTATIONS := "delete:annotations"
VIEW_DATA := "view:data"
UPLOAD_DATA := "upload:data"
IMPORT_ANNOTATIONS := "import:annotations"
UPDATE_STATE := "update:state"
UPDATE_STAGE := "update:stage"
CREATE_IN_JOB := "create@job"
CREATE_IN_ISSUE := "create@issue"
IMPORT_DATASET := "import:dataset"
IMPORT_BACKUP := "import:backup"
EXPORT_BACKUP := "export:backup"


get_priority(privilege) = priority {
    priority := {
        ADMIN: 0,
        BUSINESS: 50,
        USER: 75,
        WORKER: 100,
        null: 1000
    }[privilege]
}

has_perm(group) {
    get_priority(input.auth.user.privilege) <= get_priority(group)
}

is_admin {
    input.auth.user.privilege == ADMIN
}

is_business {
    input.auth.user.privilege == BUSINESS
}

is_user {
    input.auth.user.privilege == USER
}

is_worker {
    input.auth.user.privilege == WORKER
}

is_resource_owner {
    input.resource.owner.id == input.auth.user.id
}

is_resource_assignee {
    input.resource.assignee.id == input.auth.user.id
}

is_sandbox {
    input.auth.organization == null
}

is_organization {
    input.auth.organization != null
}
