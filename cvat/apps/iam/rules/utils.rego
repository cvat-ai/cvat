package utils

# System roles
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

has_role(name) {
    input.user.roles[_] == name
}

has_any_role {
    count(input.user.roles) != 0
}

get_privilege(role) = ret {
    ret := {
        ADMIN: 0,
        BUSINESS: 50,
        USER: 75,
        WORKER: 100
    }[role]
}

has_privilege(role) {
    privileges = [x | x := get_privilege(input.user.roles[_])]
    highest_privilege := sort(privileges)[0]
    highest_privilege <= get_privilege(role)
}

is_admin {
    has_role(ADMIN)
}

is_business {
    has_role(BUSINESS)
}

is_user {
    has_role(USER)
}

is_worker {
    has_role(WORKER)
}
