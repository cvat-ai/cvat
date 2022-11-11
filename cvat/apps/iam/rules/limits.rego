package limits
import future.keywords.if
import future.keywords.in

# Limits
USER_TASKS_LIMIT := 10
ORG_TASKS_LIMIT := 10

limit_checks["project user staff sandbox project task create"] = reason if {
    input.resource.user.num_resources < USER_TASKS_LIMIT

    reason := "user project limit is reached"
}

limit_checks["org user supervisor org project task create"] = reason if {
    # FIXME: this condition is probably using invalid input
    input.resource.user.num_resources < ORG_TASKS_LIMIT

    reason := "org project limit is reached"
}

limit_checks["org project worker staff org project task create"] = reason if {
    # FIXME: this condition is probably using invalid input
    input.resource.user.num_resources < ORG_TASKS_LIMIT

    reason := "project task limit is reached"
}

limit_checks["user sandbox task create"] = reason if {
    input.resource.user.num_resources < USER_TASKS_LIMIT

    reason := "user task limit is reached"
}

limit_checks["org user supervisor org task create"] = reason if {
    # FIXME: this condition is probably using invalid input
    input.resource.user.num_resources < ORG_TASKS_LIMIT

    reason := "org task limit is reached"
}

limit_checks["project webhooks"] = reason if {
    input.resource.num_resources < PROJECT_WEBHOOKS_LIMIT

    reason := "project webhooks limit reached"
}

limit_checks["org webhooks"] = reason if {
    input.resource.num_resources < ORG_WEBHOOKS_LIMIT

    reason := "org webhooks limit reached"
}

limit_checks["user projects"] = reason if {
    input.resource.user.num_resources < USER_PROJECTS_LIMIT

    reason := "user projects limit reached"
}

limit_checks["org projects"] = reason if {
    input.resource.user.num_resources < ORG_PROJECTS_LIMIT

    reason := "org projects limit reached"
}

limit_checks["user orgs"] = reason if {
    input.resource.user.num_resources < USER_ORGS_LIMIT

    reason := "user orgs limit reached"
}


