package quality_utils

import rego.v1


is_task_owner(task_data, auth_data) if {
    task_data.owner.id == auth_data.user.id
}

is_task_assignee(task_data, auth_data) if {
    task_data.assignee.id == auth_data.user.id
}

is_project_owner(project_data, auth_data) if {
    project_data.owner.id == auth_data.user.id
}

is_project_assignee(project_data, auth_data) if {
    project_data.assignee.id == auth_data.user.id
}

is_project_staff(project_data, auth_data) if {
    is_project_owner(project_data, auth_data)
}

is_project_staff(project_data, auth_data) if {
    is_project_assignee(project_data, auth_data)
}

is_task_staff(task_data, project_data, auth_data) if {
    is_project_staff(project_data, auth_data)
}

is_task_staff(task_data, project_data, auth_data) if {
    is_task_owner(task_data, auth_data)
}

is_task_staff(task_data, project_data, auth_data) if {
    is_task_assignee(task_data, auth_data)
}
