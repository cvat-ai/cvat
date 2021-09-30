package invitations
import data.utils

default allow = false
allow {
    utils.is_admin
}

filter = [] { # Django Q object to filter list of entries
    utils.is_admin
} else = qobject {
    qobject := [ {"owner_id": input.user.id}, {"membership__user_id": input.user.id}, "|" ]
}
