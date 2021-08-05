package lambda
import data.utils

default allow = false

# All users can see the list of functions and get information
# about a particular lambda function (GET /lambda/functions/*).
allow {
    input.method == utils.GET
    input.path[0] == "lambda"
    input.path[1] == "functions"
    utils.has_privilege(utils.WORKER)
}

# All users can call a lambda function for one frame
allow {
    input.method == utils.POST
    input.path[0] == "lambda"
    input.path[1] == "functions"
    count(input.path) == 3 # /lambda/functions/{func_id}
    utils.has_privilege(utils.WORKER)
}

# Business can call a lambda function for jobs, tasks, and projects
allow {
    {utils.POST, utils.GET}[input.method]
    input.path[0] == "lambda"
    input.path[1] == "requests"
    utils.has_privilege(utils.BUSINESS)
}
