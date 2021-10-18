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
VIEW_SELF := "view:self"
CHANGE_ROLE := "change:role"
RESEND := "resend"
UPDATE_DESC := "update:desc"
UPDATE_ASSIGNEE := "update:assignee"
UPDATE_OWNER := "update:owner"

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