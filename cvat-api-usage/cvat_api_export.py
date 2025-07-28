import json
from http import HTTPStatus
from time import sleep
from urllib.parse import parse_qsl, urlparse
from cvat_sdk.api_client import Configuration, ApiClient, models, exceptions
import os


def export_task_annotations(configuration, task_id, export_format, save_images, output_file_path, interval=1):
    """
    Export annotations from a CVAT task.

    Args:
        configuration: CVAT API configuration
        task_id: ID of the task to export
        export_format: Format for export (e.g., "COCO 1.0", "YOLO 1.1", "Pascal VOC 1.1")
        save_images: Whether to include images in the export
        output_file_path: Path where the exported file will be saved
        interval: Sleep interval for checking export status (seconds)
    """
    # Enter a context with an instance of the API client
    with ApiClient(configuration) as api_client:
        try:
            print(f"Starting export for task {task_id} in format '{export_format}'...")

            # Initiate the process to export a task as a dataset
            (_, response) = api_client.tasks_api.create_dataset_export(
                id=task_id,
                format=export_format,
                save_images=save_images,
                _parse_response=False,
            )

            assert response.status == HTTPStatus.ACCEPTED, f"Export request failed with status {response.status}"

            # Obtain the background request ID from the server response
            rq_id = json.loads(response.data).get("rq_id")
            assert rq_id, "The rq_id parameter was not found in the server response"

            print(f"Export request submitted with ID: {rq_id}")
            print("Waiting for export to complete...")

            # Check the status of the background process
            while True:
                (background_request, response) = api_client.requests_api.retrieve(rq_id)
                assert response.status == HTTPStatus.OK
                process_status = background_request.status.value

                print(f"Export status: {process_status}")

                if process_status in (
                    models.RequestStatus.allowed_values[("value",)]["FINISHED"],
                    models.RequestStatus.allowed_values[("value",)]["FAILED"],
                ):
                    break
                sleep(interval)

            if process_status != models.RequestStatus.allowed_values[("value",)]["FINISHED"]:
                exception_msg = f"Export failed with status: {process_status}"
                if background_request.message:
                    exception_msg += f". Details: {background_request.message}"
                raise Exception(exception_msg)

            print("Export completed successfully!")

            # Download a prepared file
            result_url = background_request.result_url
            assert result_url, "No 'result_url' in the server response"

            parsed_result_url = urlparse(result_url)
            query_params = parse_qsl(parsed_result_url.query)
            _, response = api_client.call_api(
                parsed_result_url.path,
                method="GET",
                query_params=query_params,
                auth_settings=api_client.configuration.auth_settings(),
                _parse_response=False,
            )

            # Create output directory if it doesn't exist
            output_dir = os.path.dirname(output_file_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)

            # Save the resulting file
            print(f"Downloading export to: {output_file_path}")
            with open(output_file_path, "wb") as output_file:
                while (chunk := response.read(8192)):
                    output_file.write(chunk)

            print(f"Export saved successfully to: {output_file_path}")

        except exceptions.ApiException as e:
            print(f"Exception when trying to export task: {e}")
            raise
        except Exception as e:
            print(f"Error during export: {e}")
            raise


# Configuration - update these values as needed
configuration = Configuration(
    host="http://192.168.0.227:9090/",
    username='ssilva',
    password='sara2388',
)

# Export parameters
task_id = 7  # Replace with the actual task ID you want to export
export_format = "COCO 1.0"  # Available formats: "COCO 1.0", "YOLO 1.1", "Pascal VOC 1.1", etc.
save_images = True  # Set to False if you only want annotations without images
output_file_path = "/data/projects/anii-anomalias/sienz_uflow/data/task_export.zip"

# Export the task annotations
if __name__ == "__main__":
    export_task_annotations(
        configuration=configuration,
        task_id=task_id,
        export_format=export_format,
        save_images=save_images,
        output_file_path=output_file_path
    )
