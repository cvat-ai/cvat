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

# HTTP methods
POST := "POST"
GET := "GET"
DELETE := "DELETE"
PATCH := "PATCH"
PUT := "PUT"

get_priority(privilege) = priority {
    priority := {
        ADMIN: 0,
        BUSINESS: 50,
        USER: 75,
        WORKER: 100
    }[privilege]
}

has_privilege(privilege) {
    get_priority(input.user.privilege) <= get_priority(privilege)
}

is_admin {
    input.user.privilege == ADMIN
}

is_business {
    input.user.privilege == BUSINESS
}

is_user {
    input.user.privilege == USER
}

is_worker {
    input.user.privilege == WORKER
}
