# cvat_sdk.ProjectsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**projects_create**](ProjectsApi.md#projects_create) | **POST** /api/projects | Method creates a new project
[**projects_create_backup**](ProjectsApi.md#projects_create_backup) | **POST** /api/projects/backup/ | Methods create a project from a backup
[**projects_create_dataset**](ProjectsApi.md#projects_create_dataset) | **POST** /api/projects/{id}/dataset/ | Import dataset in specific format as a project
[**projects_destroy**](ProjectsApi.md#projects_destroy) | **DELETE** /api/projects/{id} | Method deletes a specific project
[**projects_list**](ProjectsApi.md#projects_list) | **GET** /api/projects | Returns a paginated list of projects according to query parameters (12 projects per page)
[**projects_list_tasks**](ProjectsApi.md#projects_list_tasks) | **GET** /api/projects/{id}/tasks | Method returns information of the tasks of the project with the selected id
[**projects_partial_update**](ProjectsApi.md#projects_partial_update) | **PATCH** /api/projects/{id} | Methods does a partial update of chosen fields in a project
[**projects_partial_update_backup_file**](ProjectsApi.md#projects_partial_update_backup_file) | **PATCH** /api/projects/backup/{file_id} | Allows to upload a file chunk. Implements TUS file uploading protocol.
[**projects_partial_update_dataset_file**](ProjectsApi.md#projects_partial_update_dataset_file) | **PATCH** /api/projects/{id}/dataset/{file_id} | Allows to upload a file chunk. Implements TUS file uploading protocol.
[**projects_retrieve**](ProjectsApi.md#projects_retrieve) | **GET** /api/projects/{id} | Method returns details of a specific project
[**projects_retrieve_annotations**](ProjectsApi.md#projects_retrieve_annotations) | **GET** /api/projects/{id}/annotations | Method allows to download project annotations
[**projects_retrieve_backup**](ProjectsApi.md#projects_retrieve_backup) | **GET** /api/projects/{id}/backup | Methods creates a backup copy of a project
[**projects_retrieve_dataset**](ProjectsApi.md#projects_retrieve_dataset) | **GET** /api/projects/{id}/dataset/ | Export project as a dataset in a specific format


# **projects_create**
> ProjectWrite projects_create(project_write_request)

Method creates a new project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
from cvat_sdk.model.project_write import ProjectWrite
from cvat_sdk.model.project_write_request import ProjectWriteRequest
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
    api_instance = projects_api.ProjectsApi(api_client)
    project_write_request = ProjectWriteRequest(
        name="name_example",
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
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        target_storage=PatchedProjectWriteRequestTargetStorage(None),
        source_storage=PatchedProjectWriteRequestTargetStorage(None),
        task_subsets=[
            "task_subsets_example",
        ],
    ) # ProjectWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method creates a new project
        api_response = api_instance.projects_create(project_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method creates a new project
        api_response = api_instance.projects_create(project_write_request, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_write_request** | [**ProjectWriteRequest**](ProjectWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**ProjectWrite**](ProjectWrite.md)

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

# **projects_create_backup**
> projects_create_backup(project_file_request)

Methods create a project from a backup

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
from cvat_sdk.model.project_file_request import ProjectFileRequest
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
    api_instance = projects_api.ProjectsApi(api_client)
    project_file_request = ProjectFileRequest(
        project_file=open('/path/to/file', 'rb'),
    ) # ProjectFileRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Backup file name (optional)
    location = "local" # str | Where to import the backup file from (optional) if omitted the server will use the default value of "local"
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods create a project from a backup
        api_instance.projects_create_backup(project_file_request)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create_backup: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods create a project from a backup
        api_instance.projects_create_backup(project_file_request, x_organization=x_organization, cloud_storage_id=cloud_storage_id, filename=filename, location=location, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create_backup: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_file_request** | [**ProjectFileRequest**](ProjectFileRequest.md)|  |
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
**201** | The project has been imported |  -  |
**202** | Importing a backup file has been started |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **projects_create_dataset**
> projects_create_dataset(id, dataset_file_request)

Import dataset in specific format as a project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
from cvat_sdk.model.dataset_file_request import DatasetFileRequest
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    dataset_file_request = DatasetFileRequest(
        dataset_file=open('/path/to/file', 'rb'),
    ) # DatasetFileRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Dataset file name (optional)
    format = "format_example" # str | Desired dataset format name You can get the list of supported formats at: /server/annotation/formats (optional)
    location = "cloud_storage" # str | Where to import the dataset from (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in the project to import annotations (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Import dataset in specific format as a project
        api_instance.projects_create_dataset(id, dataset_file_request)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create_dataset: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Import dataset in specific format as a project
        api_instance.projects_create_dataset(id, dataset_file_request, x_organization=x_organization, cloud_storage_id=cloud_storage_id, filename=filename, format=format, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create_dataset: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **dataset_file_request** | [**DatasetFileRequest**](DatasetFileRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Dataset file name | [optional]
 **format** | **str**| Desired dataset format name You can get the list of supported formats at: /server/annotation/formats | [optional]
 **location** | **str**| Where to import the dataset from | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in the project to import annotations | [optional] if omitted the server will use the default value of True

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
**202** | Exporting has been started |  -  |
**400** | Failed to import dataset |  -  |
**405** | Format is not available |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **projects_destroy**
> projects_destroy(id)

Method deletes a specific project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method deletes a specific project
        api_instance.projects_destroy(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_destroy: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method deletes a specific project
        api_instance.projects_destroy(id, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
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
**204** | The project has been deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **projects_list**
> PaginatedPolymorphicProjectList projects_list()

Returns a paginated list of projects according to query parameters (12 projects per page)

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
from cvat_sdk.model.paginated_polymorphic_project_list import PaginatedPolymorphicProjectList
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
    api_instance = projects_api.ProjectsApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('name', 'owner', 'assignee', 'status') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Returns a paginated list of projects according to query parameters (12 projects per page)
        api_response = api_instance.projects_list(x_organization=x_organization, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_organization** | **str**|  | [optional]
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedPolymorphicProjectList**](PaginatedPolymorphicProjectList.md)

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

# **projects_list_tasks**
> PaginatedTaskReadList projects_list_tasks(id)

Method returns information of the tasks of the project with the selected id

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('name', 'owner', 'assignee', 'status') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns information of the tasks of the project with the selected id
        api_response = api_instance.projects_list_tasks(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_list_tasks: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns information of the tasks of the project with the selected id
        api_response = api_instance.projects_list_tasks(id, x_organization=x_organization, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_list_tasks: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **x_organization** | **str**|  | [optional]
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]

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

# **projects_partial_update**
> ProjectWrite projects_partial_update(id)

Methods does a partial update of chosen fields in a project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
from cvat_sdk.model.project_write import ProjectWrite
from cvat_sdk.model.patched_project_write_request import PatchedProjectWriteRequest
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_project_write_request = PatchedProjectWriteRequest(
        name="name_example",
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
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        target_storage=PatchedProjectWriteRequestTargetStorage(None),
        source_storage=PatchedProjectWriteRequestTargetStorage(None),
        task_subsets=[
            "task_subsets_example",
        ],
    ) # PatchedProjectWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in a project
        api_response = api_instance.projects_partial_update(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in a project
        api_response = api_instance.projects_partial_update(id, x_organization=x_organization, org=org, org_id=org_id, patched_project_write_request=patched_project_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_project_write_request** | [**PatchedProjectWriteRequest**](PatchedProjectWriteRequest.md)|  | [optional]

### Return type

[**ProjectWrite**](ProjectWrite.md)

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

# **projects_partial_update_backup_file**
> projects_partial_update_backup_file(file_id)

Allows to upload a file chunk. Implements TUS file uploading protocol.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    body = open('/path/to/file', 'rb') # file_type |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.projects_partial_update_backup_file(file_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update_backup_file: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.projects_partial_update_backup_file(file_id, x_organization=x_organization, org=org, org_id=org_id, body=body)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update_backup_file: %s\n" % e)
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

# **projects_partial_update_dataset_file**
> projects_partial_update_dataset_file(file_id, id)

Allows to upload a file chunk. Implements TUS file uploading protocol.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    body = open('/path/to/file', 'rb') # file_type |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.projects_partial_update_dataset_file(file_id, id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update_dataset_file: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Allows to upload a file chunk. Implements TUS file uploading protocol.
        api_instance.projects_partial_update_dataset_file(file_id, id, x_organization=x_organization, org=org, org_id=org_id, body=body)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update_dataset_file: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **id** | **int**| A unique integer value identifying this project. |
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

# **projects_retrieve**
> ProjectRead projects_retrieve(id)

Method returns details of a specific project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
from cvat_sdk.model.project_read import ProjectRead
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of a specific project
        api_response = api_instance.projects_retrieve(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns details of a specific project
        api_response = api_instance.projects_retrieve(id, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**ProjectRead**](ProjectRead.md)

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

# **projects_retrieve_annotations**
> projects_retrieve_annotations(format, id)

Method allows to download project annotations

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    format = "format_example" # str | Desired output format name You can get the list of supported formats at: /server/annotation/formats
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    action = "download" # str | Used to start downloading process after annotation file had been created (optional) if omitted the server will use the default value of "download"
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Desired output file name (optional)
    location = "cloud_storage" # str | Where need to save downloaded dataset (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in project to export annotation (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Method allows to download project annotations
        api_instance.projects_retrieve_annotations(format, id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve_annotations: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method allows to download project annotations
        api_instance.projects_retrieve_annotations(format, id, x_organization=x_organization, action=action, cloud_storage_id=cloud_storage_id, filename=filename, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve_annotations: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **format** | **str**| Desired output format name You can get the list of supported formats at: /server/annotation/formats |
 **id** | **int**| A unique integer value identifying this project. |
 **x_organization** | **str**|  | [optional]
 **action** | **str**| Used to start downloading process after annotation file had been created | [optional] if omitted the server will use the default value of "download"
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Desired output file name | [optional]
 **location** | **str**| Where need to save downloaded dataset | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in project to export annotation | [optional] if omitted the server will use the default value of True

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
**401** | Format is not specified |  -  |
**405** | Format is not available |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **projects_retrieve_backup**
> projects_retrieve_backup(id)

Methods creates a backup copy of a project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    action = "download" # str | Used to start downloading process after backup file had been created (optional) if omitted the server will use the default value of "download"
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Backup file name (optional)
    location = "cloud_storage" # str | Where need to save downloaded backup (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in project to export backup (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Methods creates a backup copy of a project
        api_instance.projects_retrieve_backup(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve_backup: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods creates a backup copy of a project
        api_instance.projects_retrieve_backup(id, x_organization=x_organization, action=action, cloud_storage_id=cloud_storage_id, filename=filename, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve_backup: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **x_organization** | **str**|  | [optional]
 **action** | **str**| Used to start downloading process after backup file had been created | [optional] if omitted the server will use the default value of "download"
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Backup file name | [optional]
 **location** | **str**| Where need to save downloaded backup | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in project to export backup | [optional] if omitted the server will use the default value of True

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

# **projects_retrieve_dataset**
> projects_retrieve_dataset(id)

Export project as a dataset in a specific format

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import projects_api
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
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    x_organization = "X-Organization_example" # str |  (optional)
    action = "download" # str | Used to start downloading process after annotation file had been created (optional)
    cloud_storage_id = 3.14 # float | Storage id (optional)
    filename = "filename_example" # str | Desired output file name (optional)
    format = "format_example" # str | Desired output format name You can get the list of supported formats at: /server/annotation/formats (optional)
    location = "cloud_storage" # str | Where need to save downloaded dataset (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    use_default_location = True # bool | Use the location that was configured in project to import dataset (optional) if omitted the server will use the default value of True

    # example passing only required values which don't have defaults set
    try:
        # Export project as a dataset in a specific format
        api_instance.projects_retrieve_dataset(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve_dataset: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Export project as a dataset in a specific format
        api_instance.projects_retrieve_dataset(id, x_organization=x_organization, action=action, cloud_storage_id=cloud_storage_id, filename=filename, format=format, location=location, org=org, org_id=org_id, use_default_location=use_default_location)
    except cvat_sdk.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve_dataset: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **x_organization** | **str**|  | [optional]
 **action** | **str**| Used to start downloading process after annotation file had been created | [optional]
 **cloud_storage_id** | **float**| Storage id | [optional]
 **filename** | **str**| Desired output file name | [optional]
 **format** | **str**| Desired output format name You can get the list of supported formats at: /server/annotation/formats | [optional]
 **location** | **str**| Where need to save downloaded dataset | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **use_default_location** | **bool**| Use the location that was configured in project to import dataset | [optional] if omitted the server will use the default value of True

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

