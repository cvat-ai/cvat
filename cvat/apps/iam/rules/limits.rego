package limits

import future.keywords.if
import future.keywords.in


user_tasks_limit := { "allow": true, "reason": "" } if {
    null != input.resource.user.max_resources
    input.resource.user.num_resources < input.resource.user.max_resources
} else := { "allow": false, "reason": "user tasks limit reached" }

user_projects_limit := { "allow": true, "reason": "" } if {
    null != input.resource.user.max_resources
    input.resource.user.num_resources < input.resource.user.max_resources
} else := { "allow": false, "reason": "user projects limit reached" }

user_project_tasks_limit := { "allow": true, "reason": "" } if {
    null != input.resource.project.organization.max_resources
    input.resource.project.organization.num_resources < input.resource.project.organization.max_resources
} else := { "allow": false, "reason": "user project tasks limit reached" }

org_tasks_limit = { "allow": true, "reason": "" } if {
    null != input.resource.organization.max_resources
    input.resource.organization.num_resources < input.resource.organization.max_resources
} else := { "allow": false, "reason": "org tasks limit reached" }

org_projects_limit := { "allow": true, "reason": "" } if {
    null != input.resource.organization.max_resources
    input.resource.organization.num_resources < input.resource.organization.max_resources
} else := { "allow": false, "reason": "org projects limit reached" }

org_project_tasks_limit := { "allow": true, "reason": "" } if {
    null != input.resource.project.organization.max_resources
    input.resource.project.organization.num_resources < input.resource.project.organization.max_resources
} else := { "allow": false, "reason": "org project tasks limit reached" }

project_webhooks := { "allow": true, "reason": "" } if {
    null != input.resource.user.max_resources
    input.resource.user.num_resources < input.resource.user.max_resources
} else := { "allow": false, "reason": "project webhooks limit reached" }

org_webhooks := { "allow": true, "reason": "" } if {
    null != input.resource.organization.max_resources
    input.resource.organization.num_resources < input.resource.organization.max_resources
} else := { "allow": false, "reason": "org webhooks limit reached" }

user_orgs := { "allow": true, "reason": "" } if {
    null != input.resource.user.max_resources
    input.resource.user.num_resources < input.resource.user.max_resources
} else := { "allow": false, "reason": "user orgs limit reached" }
