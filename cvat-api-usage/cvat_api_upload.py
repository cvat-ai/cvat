from time import sleep
from cvat_sdk.api_client import Configuration, ApiClient, models, apis, exceptions
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def create_task_and_upload_images(configuration, task_name, segment_size, project_id, org_name, image_folder):
    # Enter a context with an instance of the API client
    with ApiClient(configuration) as api_client:
        ##############################
        # CREATE A TASK FOR A PROJECT
        ##############################

        # Projects can be consulted and created with  api_client.projects_api()
        task_spec = {
            'name': task_name,
            'segment_size': segment_size,
            'project_id': project_id,
        }

        try:
            # Assign the task to an organization on creation
            # Organizations can be consulted and created with the api_client.organizations_api()
            (task, response) = api_client.tasks_api.create(task_spec, org=org_name)
        except exceptions.ApiException as e:
            # We can catch the basic exception type, or a derived type
            print("Exception when trying to create a task: %s\n" % e)

        ###############################
        # UPLOAD IMAGES TO TASK using task.id
        ###############################

        image_paths = [
            os.path.join(image_folder, fname)
            for fname in sorted(os.listdir(image_folder))
            if fname.lower().endswith(('.png', '.jpg', '.jpeg'))
        ]

        client_files = [open(path, 'rb') for path in image_paths]

        # Here we will use models instead of a dict
        task_data = models.DataRequest(
            image_quality=75,
            client_files=client_files,
        )

        # If we pass binary file objects, we need to specify content type.
        # For this endpoint, we don't have response data
        (_, response) = api_client.tasks_api.create_data(task.id,
            data_request=task_data,
            _content_type="multipart/form-data",

            # we can choose to check the response status manually
            # and disable the response data parsing
            _check_status=False, _parse_response=False
        )
        assert response.status == 202, response.msg

        # Wait till task data is processed
        for _ in range(100):
            (status, _) = api_client.tasks_api.retrieve_status(task.id)
            if status.state.value in ['Finished', 'Failed']:
                break
            sleep(0.1)
        assert status.state.value == 'Finished', status.message

        # Update the task object and check the task size
        (task, _) = api_client.tasks_api.retrieve(task.id)


configuration = Configuration(
    host=f"http://{os.getenv('CVAT_HOST')}:{os.getenv('CVAT_PORT')}/",
    username=os.getenv('CVAT_USERNAME'),
    password=os.getenv('CVAT_PASSWORD'),
)

task_name = "task_name" # Replace with your desired task name
segment_size = 500
project_id = 1
org_name = "org_name"  # Replace with your organization name or leave empty if not needed

image_folder = "image_folder"  # Replace with your image folder path

create_task_and_upload_images(configuration, task_name=task_name, segment_size=segment_size,
                              project_id=project_id, org_name=org_name, image_folder=image_folder)
