# cvat_sdk.TasksApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**jobs_partial_update_data_meta**](TasksApi.md#jobs_partial_update_data_meta) | **PATCH** /api/jobs/{id}/data/meta | Method provides a meta information about media files which are related with the job
[**tasks_create**](TasksApi.md#tasks_create) | **POST** /api/tasks | Method creates a new task in a database without any attached images and videos
[**tasks_create_annotations**](TasksApi.md#tasks_create_annotations) | **POST** /api/tasks/{id}/annotations/ | Method allows to upload task annotations from storage
[**tasks_create_backup**](TasksApi.md#tasks_create_backup) | **POST** /api/tasks/backup/ | Method recreates a task from an attached task backup file
[**tasks_create_data**](TasksApi.md#tasks_create_data) | **POST** /api/tasks/{id}/data/ | Method permanently attaches images or video to a task. Supports tus uploads, see more https://tus.io/
[**tasks_destroy**](TasksApi.md#tasks_destroy) | **DELETE** /api/tasks/{id} | Method deletes a specific task, all attached jobs, annotations, and data
[**tasks_destroy_annotations**](TasksApi.md#tasks_destroy_annotations) | **DELETE** /api/tasks/{id}/annotations/ | Method deletes all annotations for a specific task
[**tasks_list**](TasksApi.md#tasks_list) | **GET** /api/tasks | Returns a paginated list of tasks according to query parameters (10 tasks per page)
[**tasks_list_jobs**](TasksApi.md#tasks_list_jobs) | **GET** /api/tasks/{id}/jobs | Method returns a list of jobs for a specific task
[**tasks_partial_update**](TasksApi.md#tasks_partial_update) | **PATCH** /api/tasks/{id} | Methods does a partial update of chosen fields in a task
[**tasks_partial_update_annotations**](TasksApi.md#tasks_partial_update_annotations) | **PATCH** /api/tasks/{id}/annotations/ | Method performs a partial update of annotations in a specific task
[**tasks_partial_update_annotations_file**](TasksApi.md#tasks_partial_update_annotations_file) | **PATCH** /api/tasks/{id}/annotations/{file_id} | Allows to upload an annotation file chunk. Implements TUS file uploading protocol.
[**tasks_partial_update_backup_file**](TasksApi.md#tasks_partial_update_backup_file) | **PATCH** /api/tasks/backup/{file_id} | Allows to upload a file chunk. Implements TUS file uploading protocol.
[**tasks_partial_update_data_file**](TasksApi.md#tasks_partial_update_data_file) | **PATCH** /api/tasks/{id}/data/{file_id} | Allows to upload a file chunk. Implements TUS file uploading protocol.
[**tasks_partial_update_data_meta**](TasksApi.md#tasks_partial_update_data_meta) | **PATCH** /api/tasks/{id}/data/meta | Method provides a meta information about media files which are related with the task
[**tasks_retrieve**](TasksApi.md#tasks_retrieve) | **GET** /api/tasks/{id} | Method returns details of a specific task
[**tasks_retrieve_annotations**](TasksApi.md#tasks_retrieve_annotations) | **GET** /api/tasks/{id}/annotations/ | Method allows to download task annotations
[**tasks_retrieve_backup**](TasksApi.md#tasks_retrieve_backup) | **GET** /api/tasks/{id}/backup | Method backup a specified task
[**tasks_retrieve_data**](TasksApi.md#tasks_retrieve_data) | **GET** /api/tasks/{id}/data/ | Method returns data for a specific task
[**tasks_retrieve_data_meta**](TasksApi.md#tasks_retrieve_data_meta) | **GET** /api/tasks/{id}/data/meta | Method provides a meta information about media files which are related with the task
[**tasks_retrieve_dataset**](TasksApi.md#tasks_retrieve_dataset) | **GET** /api/tasks/{id}/dataset | Export task as a dataset in a specific format
[**tasks_retrieve_status**](TasksApi.md#tasks_retrieve_status) | **GET** /api/tasks/{id}/status | When task is being created the method returns information about a status of the creation process
[**tasks_update**](TasksApi.md#tasks_update) | **PUT** /api/tasks/{id} | Method updates a task by id
[**tasks_update_annotations**](TasksApi.md#tasks_update_annotations) | **PUT** /api/tasks/{id}/annotations/ | Method allows to upload task annotations


# **jobs_partial_update_data_meta**
> DataMetaRead jobs_partial_update_data_meta(id)

Method provides a meta information about media files which are related with the job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.patched_job_write_request import PatchedJobWriteRequest
from cvat_sdk.model.data_meta_read import DataMetaRead
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_job_write_request = PatchedJobWriteRequest(
        assignee=1,
        stage=JobStage("annotation"),
        state=OperationStatus("new"),
    ) # PatchedJobWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method provides a meta information about media files which are related with the job
        api_response = api_instance.jobs_partial_update_data_meta(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->jobs_partial_update_data_meta: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method provides a meta information about media files which are related with the job
        api_response = api_instance.jobs_partial_update_data_meta(id, x_organization=x_organization, org=org, org_id=org_id, patched_job_write_request=patched_job_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->jobs_partial_update_data_meta: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_job_write_request** | [**PatchedJobWriteRequest**](PatchedJobWriteRequest.md)|  | [optional]

### Return type

[**DataMetaRead**](DataMetaRead.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_create**
> TaskWrite tasks_create(task_write_request)

Method creates a new task in a database without any attached images and videos

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_write import TaskWrite
from cvat_sdk.model.task_write_request import TaskWriteRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    task_write_request = TaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # TaskWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method creates a new task in a database without any attached images and videos
        api_response = api_instance.tasks_create(task_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method creates a new task in a database without any attached images and videos
        api_response = api_instance.tasks_create(task_write_request, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **task_write_request** | [**TaskWriteRequest**](TaskWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**TaskWrite**](TaskWrite.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_create_annotations**
> tasks_create_annotations(id, task_write_request)

Method allows to upload task annotations from storage

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_write_request import TaskWriteRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    task_write_request = TaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # TaskWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Annotation file name (optional)
    format = "format_example" # str | Input format name You can get the list of supported formats at: /server/annotation/formats (optional)
    location = "cloud_storage" # str | where to import the annotation from (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in task to import annotations (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Method allows to upload task annotations from storage
        api_instance.tasks_create_annotations(id, task_write_request)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create_annotations: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method allows to upload task annotations from storage
        api_instance.tasks_create_annotations(id, task_write_request, x_organization=x_organization, cloud_storage_id=cloud_storage_id, filename=filename, format=format, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create_annotations: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **task_write_request** | [**TaskWriteRequest**](TaskWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Annotation file name | [optional]
 **format** | **str**| Input format name You can get the list of supported formats at: /server/annotation/formats | [optional]
 **location** | **str**| where to import the annotation from | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in task to import annotations | [optional] if omitted the server will use the default value of True

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Uploading has finished |  -  |
**202** | Uploading has been started |  -  |
**405** | Format is not available |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_create_backup**
> tasks_create_backup(task_file_request)

Method recreates a task from an attached task backup file

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_file_request import TaskFileRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    task_file_request = TaskFileRequest(
        task_file=open('/path/to/file', 'rb'),
    ) # TaskFileRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Backup file name (optional)
    location = "local" # str | Where to import the backup file from (optional) if omitted the server will use the default value of "local"
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method recreates a task from an attached task backup file
        api_instance.tasks_create_backup(task_file_request)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create_backup: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method recreates a task from an attached task backup file
        api_instance.tasks_create_backup(task_file_request, x_organization=x_organization, cloud_storage_id=cloud_storage_id, filename=filename, location=location, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create_backup: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **task_file_request** | [**TaskFileRequest**](TaskFileRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Backup file name | [optional]
 **location** | **str**| Where to import the backup file from | [optional] if omitted the server will use the default value of "local"
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | The task has been imported |  -  |
**202** | Importing a backup file has been started |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_create_data**
> tasks_create_data(id, data_request)

Method permanently attaches images or video to a task. Supports tus uploads, see more https://tus.io/

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.data_request import DataRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    data_request = DataRequest(
        chunk_size=1,
        size=1,
        image_quality=0,
        start_frame=1,
        stop_frame=1,
        frame_filter="frame_filter_example",
        compressed_chunk_type=ChunkType("video"),
        original_chunk_type=ChunkType("video"),
        client_files=[],
        server_files=[],
        remote_files=[],
        use_zip_chunks=False,
        cloud_storage_id=1,
        use_cache=False,
        copy_data=False,
        storage_method=StorageMethod("cache"),
        storage=StorageType("cloud_storage"),
        sorting_method=SortingMethod("lexicographical"),
    ) # DataRequest | 
    upload_finish = True # bool | Finishes data upload. Can be combined with Upload-Start header to create task data with one request (optional)
    upload_multiple = True # bool | Indicates that data with this request are single or multiple files that should be attached to a task (optional)
    upload_start = True # bool | Initializes data upload. No data should be sent with this header (optional)
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method permanently attaches images or video to a task. Supports tus uploads, see more https://tus.io/
        api_instance.tasks_create_data(id, data_request)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create_data: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method permanently attaches images or video to a task. Supports tus uploads, see more https://tus.io/
        api_instance.tasks_create_data(id, data_request, upload_finish=upload_finish, upload_multiple=upload_multiple, upload_start=upload_start, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_create_data: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **data_request** | [**DataRequest**](DataRequest.md)|  |
 **upload_finish** | **bool**| Finishes data upload. Can be combined with Upload-Start header to create task data with one request | [optional]
 **upload_multiple** | **bool**| Indicates that data with this request are single or multiple files that should be attached to a task | [optional]
 **upload_start** | **bool**| Initializes data upload. No data should be sent with this header | [optional]
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**202** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_destroy**
> tasks_destroy(id)

Method deletes a specific task, all attached jobs, annotations, and data

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method deletes a specific task, all attached jobs, annotations, and data
        api_instance.tasks_destroy(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_destroy: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method deletes a specific task, all attached jobs, annotations, and data
        api_instance.tasks_destroy(id, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | The task has been deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_destroy_annotations**
> tasks_destroy_annotations(id)

Method deletes all annotations for a specific task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method deletes all annotations for a specific task
        api_instance.tasks_destroy_annotations(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_destroy_annotations: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method deletes all annotations for a specific task
        api_instance.tasks_destroy_annotations(id, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_destroy_annotations: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | The annotation has been deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_list**
> PaginatedTaskReadList tasks_list()

Returns a paginated list of tasks according to query parameters (10 tasks per page)

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.paginated_task_read_list import PaginatedTaskReadList
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension', 'id', 'project_id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension', 'id', 'project_id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Returns a paginated list of tasks according to query parameters (10 tasks per page)
        api_response = api_instance.tasks_list(x_organization=x_organization, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_organization** | **str**|  | [optional]
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;project_name&#39;, &#39;name&#39;, &#39;owner&#39;, &#39;status&#39;, &#39;assignee&#39;, &#39;subset&#39;, &#39;mode&#39;, &#39;dimension&#39;, &#39;id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;project_name&#39;, &#39;name&#39;, &#39;owner&#39;, &#39;status&#39;, &#39;assignee&#39;, &#39;subset&#39;, &#39;mode&#39;, &#39;dimension&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;project_name&#39;, &#39;name&#39;, &#39;owner&#39;, &#39;status&#39;, &#39;assignee&#39;, &#39;subset&#39;, &#39;mode&#39;, &#39;dimension&#39;, &#39;id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedTaskReadList**](PaginatedTaskReadList.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_list_jobs**
> PaginatedJobReadList tasks_list_jobs(id)

Method returns a list of jobs for a specific task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.paginated_job_read_list import PaginatedJobReadList
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension', 'id', 'project_id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['project_name', 'name', 'owner', 'status', 'assignee', 'subset', 'mode', 'dimension', 'id', 'project_id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns a list of jobs for a specific task
        api_response = api_instance.tasks_list_jobs(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_list_jobs: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a list of jobs for a specific task
        api_response = api_instance.tasks_list_jobs(id, x_organization=x_organization, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_list_jobs: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;project_name&#39;, &#39;name&#39;, &#39;owner&#39;, &#39;status&#39;, &#39;assignee&#39;, &#39;subset&#39;, &#39;mode&#39;, &#39;dimension&#39;, &#39;id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;project_name&#39;, &#39;name&#39;, &#39;owner&#39;, &#39;status&#39;, &#39;assignee&#39;, &#39;subset&#39;, &#39;mode&#39;, &#39;dimension&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;project_name&#39;, &#39;name&#39;, &#39;owner&#39;, &#39;status&#39;, &#39;assignee&#39;, &#39;subset&#39;, &#39;mode&#39;, &#39;dimension&#39;, &#39;id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedJobReadList**](PaginatedJobReadList.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_partial_update**
> TaskWrite tasks_partial_update(id)

Methods does a partial update of chosen fields in a task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_write import TaskWrite
from cvat_sdk.model.patched_task_write_request import PatchedTaskWriteRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_task_write_request = PatchedTaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # PatchedTaskWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in a task
        api_response = api_instance.tasks_partial_update(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in a task
        api_response = api_instance.tasks_partial_update(id, x_organization=x_organization, org=org, org_id=org_id, patched_task_write_request=patched_task_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_task_write_request** | [**PatchedTaskWriteRequest**](PatchedTaskWriteRequest.md)|  | [optional]

### Return type

[**TaskWrite**](TaskWrite.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_partial_update_annotations**
> TaskWrite tasks_partial_update_annotations(action, id)

Method performs a partial update of annotations in a specific task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_write import TaskWrite
from cvat_sdk.model.patched_task_write_request import PatchedTaskWriteRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    action = "create" # str | 
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_task_write_request = PatchedTaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # PatchedTaskWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method performs a partial update of annotations in a specific task
        api_response = api_instance.tasks_partial_update_annotations(action, id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_annotations: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method performs a partial update of annotations in a specific task
        api_response = api_instance.tasks_partial_update_annotations(action, id, x_organization=x_organization, org=org, org_id=org_id, patched_task_write_request=patched_task_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_annotations: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **action** | **str**|  |
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_task_write_request** | [**PatchedTaskWriteRequest**](PatchedTaskWriteRequest.md)|  | [optional]

### Return type

[**TaskWrite**](TaskWrite.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_partial_update_annotations_file**
> tasks_partial_update_annotations_file(file_id, id)

Allows to upload an annotation file chunk. Implements TUS file uploading protocol.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    body = open('/path/to/file', 'rb') # file_type |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Allows to upload an annotation file chunk. Implements TUS file uploading protocol.
        api_instance.tasks_partial_update_annotations_file(file_id, id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_annotations_file: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Allows to upload an annotation file chunk. Implements TUS file uploading protocol.
        api_instance.tasks_partial_update_annotations_file(file_id, id, x_organization=x_organization, org=org, org_id=org_id, body=body)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_annotations_file: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **body** | **file_type**|  | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_partial_update_backup_file**
> tasks_partial_update_backup_file(file_id)

Allows to upload a file chunk. Implements TUS file uploading protocol.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    body = open('/path/to/file', 'rb') # file_type |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.tasks_partial_update_backup_file(file_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_backup_file: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.tasks_partial_update_backup_file(file_id, x_organization=x_organization, org=org, org_id=org_id, body=body)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_backup_file: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **body** | **file_type**|  | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_partial_update_data_file**
> tasks_partial_update_data_file(file_id, id)

Allows to upload a file chunk. Implements TUS file uploading protocol.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    body = open('/path/to/file', 'rb') # file_type |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.tasks_partial_update_data_file(file_id, id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_data_file: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.tasks_partial_update_data_file(file_id, id, x_organization=x_organization, org=org, org_id=org_id, body=body)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_data_file: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **body** | **file_type**|  | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_partial_update_data_meta**
> DataMetaRead tasks_partial_update_data_meta(id)

Method provides a meta information about media files which are related with the task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.patched_task_write_request import PatchedTaskWriteRequest
from cvat_sdk.model.data_meta_read import DataMetaRead
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_task_write_request = PatchedTaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # PatchedTaskWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method provides a meta information about media files which are related with the task
        api_response = api_instance.tasks_partial_update_data_meta(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_data_meta: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method provides a meta information about media files which are related with the task
        api_response = api_instance.tasks_partial_update_data_meta(id, x_organization=x_organization, org=org, org_id=org_id, patched_task_write_request=patched_task_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_partial_update_data_meta: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_task_write_request** | [**PatchedTaskWriteRequest**](PatchedTaskWriteRequest.md)|  | [optional]

### Return type

[**DataMetaRead**](DataMetaRead.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve**
> TaskRead tasks_retrieve(id)

Method returns details of a specific task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_read import TaskRead
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of a specific task
        api_response = api_instance.tasks_retrieve(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns details of a specific task
        api_response = api_instance.tasks_retrieve(id, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**TaskRead**](TaskRead.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve_annotations**
> tasks_retrieve_annotations(id)

Method allows to download task annotations

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    action = "download" # str | Used to start downloading process after annotation file had been created (optional) if omitted the server will use the default value of "download"
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Desired output file name (optional)
    format = "format_example" # str | Desired output format name You can get the list of supported formats at: /server/annotation/formats (optional)
    location = "cloud_storage" # str | Where need to save downloaded dataset (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in the task to export annotation (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Method allows to download task annotations
        api_instance.tasks_retrieve_annotations(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_annotations: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method allows to download task annotations
        api_instance.tasks_retrieve_annotations(id, x_organization=x_organization, action=action, cloud_storage_id=cloud_storage_id, filename=filename, format=format, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_annotations: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **action** | **str**| Used to start downloading process after annotation file had been created | [optional] if omitted the server will use the default value of "download"
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Desired output file name | [optional]
 **format** | **str**| Desired output format name You can get the list of supported formats at: /server/annotation/formats | [optional]
 **location** | **str**| Where need to save downloaded dataset | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in the task to export annotation | [optional] if omitted the server will use the default value of True

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Download of file started |  -  |
**201** | Annotations file is ready to download |  -  |
**202** | Dump of annotations has been started |  -  |
**405** | Format is not available |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve_backup**
> tasks_retrieve_backup(id)

Method backup a specified task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    action = "download" # str | Used to start downloading process after backup file had been created (optional) if omitted the server will use the default value of "download"
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Backup file name (optional)
    location = "cloud_storage" # str | Where need to save downloaded backup (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in the task to export backup (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Method backup a specified task
        api_instance.tasks_retrieve_backup(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_backup: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method backup a specified task
        api_instance.tasks_retrieve_backup(id, x_organization=x_organization, action=action, cloud_storage_id=cloud_storage_id, filename=filename, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_backup: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **action** | **str**| Used to start downloading process after backup file had been created | [optional] if omitted the server will use the default value of "download"
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Backup file name | [optional]
 **location** | **str**| Where need to save downloaded backup | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in the task to export backup | [optional] if omitted the server will use the default value of True

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Download of file started |  -  |
**201** | Output backup file is ready for downloading |  -  |
**202** | Creating a backup file has been started |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve_data**
> tasks_retrieve_data(id, number, quality, type)

Method returns data for a specific task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    number = 1 # int | A unique number value identifying chunk or frame, doesn't matter for 'preview' type
    quality = "compressed" # str | Specifies the quality level of the requested data, doesn't matter for 'preview' type
    type = "chunk" # str | Specifies the type of the requested data
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns data for a specific task
        api_instance.tasks_retrieve_data(id, number, quality, type)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_data: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns data for a specific task
        api_instance.tasks_retrieve_data(id, number, quality, type, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_data: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **number** | **int**| A unique number value identifying chunk or frame, doesn&#39;t matter for &#39;preview&#39; type |
 **quality** | **str**| Specifies the quality level of the requested data, doesn&#39;t matter for &#39;preview&#39; type |
 **type** | **str**| Specifies the type of the requested data |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Data of a specific type |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve_data_meta**
> DataMetaRead tasks_retrieve_data_meta(id)

Method provides a meta information about media files which are related with the task

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.data_meta_read import DataMetaRead
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method provides a meta information about media files which are related with the task
        api_response = api_instance.tasks_retrieve_data_meta(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_data_meta: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method provides a meta information about media files which are related with the task
        api_response = api_instance.tasks_retrieve_data_meta(id, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_data_meta: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**DataMetaRead**](DataMetaRead.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve_dataset**
> tasks_retrieve_dataset(format, id)

Export task as a dataset in a specific format

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    format = "format_example" # str | Desired output format name You can get the list of supported formats at: /server/annotation/formats
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    action = "download" # str | Used to start downloading process after annotation file had been created (optional) if omitted the server will use the default value of "download"
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Desired output file name (optional)
    location = "cloud_storage" # str | Where need to save downloaded dataset (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in task to export annotations (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Export task as a dataset in a specific format
        api_instance.tasks_retrieve_dataset(format, id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_dataset: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Export task as a dataset in a specific format
        api_instance.tasks_retrieve_dataset(format, id, x_organization=x_organization, action=action, cloud_storage_id=cloud_storage_id, filename=filename, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_dataset: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **format** | **str**| Desired output format name You can get the list of supported formats at: /server/annotation/formats |
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **action** | **str**| Used to start downloading process after annotation file had been created | [optional] if omitted the server will use the default value of "download"
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Desired output file name | [optional]
 **location** | **str**| Where need to save downloaded dataset | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in task to export annotations | [optional] if omitted the server will use the default value of True

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Download of file started |  -  |
**201** | Output file is ready for downloading |  -  |
**202** | Exporting has been started |  -  |
**405** | Format is not available |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_retrieve_status**
> RqStatus tasks_retrieve_status(id)

When task is being created the method returns information about a status of the creation process

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.rq_status import RqStatus
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # When task is being created the method returns information about a status of the creation process
        api_response = api_instance.tasks_retrieve_status(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_status: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # When task is being created the method returns information about a status of the creation process
        api_response = api_instance.tasks_retrieve_status(id, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_retrieve_status: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**RqStatus**](RqStatus.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_update**
> TaskWrite tasks_update(id, task_write_request)

Method updates a task by id

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_write import TaskWrite
from cvat_sdk.model.task_write_request import TaskWriteRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    task_write_request = TaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # TaskWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method updates a task by id
        api_response = api_instance.tasks_update(id, task_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method updates a task by id
        api_response = api_instance.tasks_update(id, task_write_request, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **task_write_request** | [**TaskWriteRequest**](TaskWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**TaskWrite**](TaskWrite.md)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **tasks_update_annotations**
> tasks_update_annotations(id, task_write_request)

Method allows to upload task annotations

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import tasks_api
from cvat_sdk.model.task_write_request import TaskWriteRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure API key authorization: SignatureAuthentication
configuration.api_key['SignatureAuthentication'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['SignatureAuthentication'] = 'Bearer'

# Configure HTTP basic authorization: basicAuth
configuration = cvat_sdk.Configuration(
    username = 'YOUR_USERNAME',
    password = 'YOUR_PASSWORD'
)

# Configure API key authorization: cookieAuth
configuration.api_key['cookieAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['cookieAuth'] = 'Bearer'

# Configure API key authorization: tokenAuth
configuration.api_key['tokenAuth'] = 'YOUR_API_KEY'

# Uncomment below to setup prefix (e.g. Bearer) for API key, if needed
# configuration.api_key_prefix['tokenAuth'] = 'Bearer'

# Enter a context with an instance of the API client
with cvat_sdk.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tasks_api.TasksApi(api_client)
    id = 1 # int | A unique integer value identifying this task.
    task_write_request = TaskWriteRequest(
        name="name_example",
        project_id=1,
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        overlap=1,
        segment_size=1,
        labels=[
            PatchedLabelRequest(
                id=1,
                name="name_example",
                color="color_example",
                attributes=[
                    AttributeRequest(
                        name="name_example",
                        mutable=True,
                        input_type=InputTypeEnum("checkbox"),
                        default_value="default_value_example",
                        values=[
                            "values_example",
                        ],
                    ),
                ],
                deleted=True,
            ),
        ],
        subset="subset_example",
        target_storage=PatchedTaskWriteRequestTargetStorage(None),
        source_storage=PatchedTaskWriteRequestTargetStorage(None),
    ) # TaskWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    format = "format_example" # str | Input format name You can get the list of supported formats at: /server/annotation/formats (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method allows to upload task annotations
        api_instance.tasks_update_annotations(id, task_write_request)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_update_annotations: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method allows to upload task annotations
        api_instance.tasks_update_annotations(id, task_write_request, x_organization=x_organization, format=format, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling TasksApi->tasks_update_annotations: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this task. |
 **task_write_request** | [**TaskWriteRequest**](TaskWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **format** | **str**| Input format name You can get the list of supported formats at: /server/annotation/formats | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

void (empty response body)

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Uploading has finished |  -  |
**202** | Uploading has been started |  -  |
**405** | Format is not available |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

