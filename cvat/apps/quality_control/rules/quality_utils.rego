package quality_utils

import rego.v1


# TODO: move to engine

is_task_owner(task_data) if {
    task_data.owner.id == input.auth.user.id
}

is_task_assignee(task_data) if {
    task_data.assignee.id == input.auth.user.id
}

is_project_owner(project_data) if {
    project_data.owner.id == input.auth.user.id
}

is_project_assignee(project_data) if {
    project_data.assignee.id == input.auth.user.id
}

is_project_staff(project_data) if {
    is_project_owner(project_data)
}

is_project_staff(project_data) if {
    is_project_assignee(project_data)
}

is_task_staff(task_data, project_data) if {
    is_project_staff(project_data)
}

is_task_staff(task_data, project_data) if {
    is_task_owner(task_data)
}

is_task_staff(task_data, project_data) if {
    is_task_assignee(task_data)
}
