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
CREATE := "CREATE"
LIST := "LIST"
VIEW := "VIEW"
UPDATE := "UPDATE"
ACCEPT := "ACCEPT"
DELETE := "DELETE"
LIST_CONTENT := "LIST_CONTENT"
CALL_ONLINE := "CALL_ONLINE"
CALL_OFFLINE := "CALL_OFFLINE"
SEND_EXCEPTION := "SEND_EXCEPTION"
SEND_LOGS := "SEND_LOGS"
VIEW_SELF := "VIEW_SELF"
CHANGE_ROLE := "CHANGE_ROLE"
RESEND := "RESEND"

get_priority(privilege) = priority {
    priority := {
        ADMIN: 0,
        BUSINESS: 50,
        USER: 75,
        WORKER: 100,
        null: 1000
    }[privilege]
}

has_privilege(privilege) {
    get_priority(input.auth.user.privilege) <= get_priority(privilege)
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