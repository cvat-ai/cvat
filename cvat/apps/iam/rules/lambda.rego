package lambda
import data.utils

default allow = false

allow {
    input.method == utils.GET
    input.path == ["lambda", "functions"]
}

allow {
    input.method == utils.GET
    function_id = input.path[2]
    input.path == ["lambda", "functions", function_id]
}

allow {
    input.method == utils.POST
    function_id = input.path[2]
    input.path == ["lambda", "functions", function_id]
    utils.has_privilege(utils.WORKER)
}

# Business can call a lambda function for jobs, tasks, and projects
allow {
    allowed_methods = {utils.POST, utils.GET}
    allowed_methods[input.method]
    input.path == ["lambda", "requests"]
    utils.has_privilege(utils.BUSINESS)
}

allow {
    input.method == utils.GET
    request_id = input.path[2]
    input.path == ["lambda", "requests", request_id]
    utils.has_privilege(utils.BUSINESS)
}
