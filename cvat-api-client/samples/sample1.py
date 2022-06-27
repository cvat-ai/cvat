from pprint import pprint
import cvat_api_client
import cvat_api_client.apis
from cvat_api_client.configuration import Configuration
from cvat_api_client.models import Task, Login, PaginatedTaskList
from urllib3 import HTTPResponse
import json


def main():
    config = Configuration(host='http://localhost:8080', username='business1', password='!Q@W#E$R')
    with cvat_api_client.ApiClient(configuration=config) as client:
        # auth_api = cvat_api_client.apis.AuthApi(client)
        # login = Login(password='admin', username='admin')
        # login = auth_api.auth_login_create(login)
        # client.set_default_header('Authorization', 'Token ' + login.key)

        # tasks_api = cvat_api_client.apis.TasksApi(client)
        # tasks_api.tasks_list()
        # tasks: HTTPResponse = tasks_api.tasks_list(_preload_content=False)
        projects_api = cvat_api_client.apis.ProjectsApi(client)
        tasks = projects_api.projects_tasks_list_raw(1)
        decoded = json.loads(tasks.data)
        PaginatedTaskList._from_openapi_data(**decoded, _configuration=config)

if __name__ == '__main__':
    main()
