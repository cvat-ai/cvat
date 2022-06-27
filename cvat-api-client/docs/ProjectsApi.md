# cvat_api_client.ProjectsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**projects_annotations_retrieve**](ProjectsApi.md#projects_annotations_retrieve) | **GET** /api/projects/{id}/annotations | Method allows to download project annotations
[**projects_backup_create**](ProjectsApi.md#projects_backup_create) | **POST** /api/projects/backup/ | Methods create a project from a backup
[**projects_backup_partial_update**](ProjectsApi.md#projects_backup_partial_update) | **PATCH** /api/projects/backup/{file_id} | 
[**projects_backup_retrieve**](ProjectsApi.md#projects_backup_retrieve) | **GET** /api/projects/{id}/backup | Methods creates a backup copy of a project
[**projects_create**](ProjectsApi.md#projects_create) | **POST** /api/projects | Method creates a new project
[**projects_dataset_create**](ProjectsApi.md#projects_dataset_create) | **POST** /api/projects/{id}/dataset/ | Import dataset in specific format as a project
[**projects_dataset_partial_update**](ProjectsApi.md#projects_dataset_partial_update) | **PATCH** /api/projects/{id}/dataset/{file_id} | 
[**projects_dataset_retrieve**](ProjectsApi.md#projects_dataset_retrieve) | **GET** /api/projects/{id}/dataset/ | Export project as a dataset in a specific format
[**projects_destroy**](ProjectsApi.md#projects_destroy) | **DELETE** /api/projects/{id} | Method deletes a specific project
[**projects_list**](ProjectsApi.md#projects_list) | **GET** /api/projects | Returns a paginated list of projects according to query parameters (12 projects per page)
[**projects_partial_update**](ProjectsApi.md#projects_partial_update) | **PATCH** /api/projects/{id} | Methods does a partial update of chosen fields in a project
[**projects_retrieve**](ProjectsApi.md#projects_retrieve) | **GET** /api/projects/{id} | Method returns details of a specific project
[**projects_tasks_list**](ProjectsApi.md#projects_tasks_list) | **GET** /api/projects/{id}/tasks | Method returns information of the tasks of the project with the selected id


# **projects_annotations_retrieve**
> projects_annotations_retrieve(format, id)

Method allows to download project annotations

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    format = "format_example" # str | Desired output format name You can get the list of supported formats at: /server/annotation/formats
    id = 1 # int | A unique integer value identifying this project.
    action = "download" # str | Used to start downloading process after annotation file had been created (optional) if omitted the server will use the default value of "download"
    filename = "filename_example" # str | Desired output file name (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method allows to download project annotations
        api_instance.projects_annotations_retrieve(format, id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_annotations_retrieve: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method allows to download project annotations
        api_instance.projects_annotations_retrieve(format, id, action=action, filename=filename)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_annotations_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **format** | **str**| Desired output format name You can get the list of supported formats at: /server/annotation/formats |
 **id** | **int**| A unique integer value identifying this project. |
 **action** | **str**| Used to start downloading process after annotation file had been created | [optional] if omitted the server will use the default value of "download"
 **filename** | **str**| Desired output file name | [optional]

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

# **projects_backup_create**
> projects_backup_create(project_request)

Methods create a project from a backup

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project_request import ProjectRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    project_request = ProjectRequest(
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
        assignee=PatchedProjectRequestAssignee(None),
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        task_subsets=[
            "task_subsets_example",
        ],
    ) # ProjectRequest | 

    # example passing only required values which don't have defaults set
    try:
        # Methods create a project from a backup
        api_instance.projects_backup_create(project_request)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_backup_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_request** | [**ProjectRequest**](ProjectRequest.md)|  |

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

# **projects_backup_partial_update**
> Project projects_backup_partial_update(file_id)



### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project import Project
from cvat_api_client.model.patched_project_request import PatchedProjectRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    patched_project_request = PatchedProjectRequest(
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
        assignee=PatchedProjectRequestAssignee(None),
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        task_subsets=[
            "task_subsets_example",
        ],
    ) # PatchedProjectRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.projects_backup_partial_update(file_id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_backup_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        api_response = api_instance.projects_backup_partial_update(file_id, patched_project_request=patched_project_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_backup_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **patched_project_request** | [**PatchedProjectRequest**](PatchedProjectRequest.md)|  | [optional]

### Return type

[**Project**](Project.md)

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

# **projects_backup_retrieve**
> projects_backup_retrieve(id)

Methods creates a backup copy of a project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.

    # example passing only required values which don't have defaults set
    try:
        # Methods creates a backup copy of a project
        api_instance.projects_backup_retrieve(id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_backup_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |

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

# **projects_create**
> Project projects_create(project_request)

Method creates a new project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project import Project
from cvat_api_client.model.project_request import ProjectRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    project_request = ProjectRequest(
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
        assignee=PatchedProjectRequestAssignee(None),
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        task_subsets=[
            "task_subsets_example",
        ],
    ) # ProjectRequest | 

    # example passing only required values which don't have defaults set
    try:
        # Method creates a new project
        api_response = api_instance.projects_create(project_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **project_request** | [**ProjectRequest**](ProjectRequest.md)|  |

### Return type

[**Project**](Project.md)

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

# **projects_dataset_create**
> projects_dataset_create(format, id, project_request)

Import dataset in specific format as a project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project_request import ProjectRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    format = "format_example" # str | Desired dataset format name You can get the list of supported formats at: /server/annotation/formats
    id = 1 # int | A unique integer value identifying this project.
    project_request = ProjectRequest(
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
        assignee=PatchedProjectRequestAssignee(None),
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        task_subsets=[
            "task_subsets_example",
        ],
    ) # ProjectRequest | 

    # example passing only required values which don't have defaults set
    try:
        # Import dataset in specific format as a project
        api_instance.projects_dataset_create(format, id, project_request)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_dataset_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **format** | **str**| Desired dataset format name You can get the list of supported formats at: /server/annotation/formats |
 **id** | **int**| A unique integer value identifying this project. |
 **project_request** | [**ProjectRequest**](ProjectRequest.md)|  |

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

# **projects_dataset_partial_update**
> Project projects_dataset_partial_update(file_id, id)



### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project import Project
from cvat_api_client.model.patched_project_request import PatchedProjectRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    id = 1 # int | A unique integer value identifying this project.
    patched_project_request = PatchedProjectRequest(
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
        assignee=PatchedProjectRequestAssignee(None),
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        task_subsets=[
            "task_subsets_example",
        ],
    ) # PatchedProjectRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.projects_dataset_partial_update(file_id, id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_dataset_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        api_response = api_instance.projects_dataset_partial_update(file_id, id, patched_project_request=patched_project_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_dataset_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **id** | **int**| A unique integer value identifying this project. |
 **patched_project_request** | [**PatchedProjectRequest**](PatchedProjectRequest.md)|  | [optional]

### Return type

[**Project**](Project.md)

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

# **projects_dataset_retrieve**
> projects_dataset_retrieve(format, id)

Export project as a dataset in a specific format

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    format = "format_example" # str | Desired output format name You can get the list of supported formats at: /server/annotation/formats
    id = 1 # int | A unique integer value identifying this project.
    action = "download" # str | Used to start downloading process after annotation file had been created (optional)
    filename = "filename_example" # str | Desired output file name (optional)

    # example passing only required values which don't have defaults set
    try:
        # Export project as a dataset in a specific format
        api_instance.projects_dataset_retrieve(format, id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_dataset_retrieve: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Export project as a dataset in a specific format
        api_instance.projects_dataset_retrieve(format, id, action=action, filename=filename)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_dataset_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **format** | **str**| Desired output format name You can get the list of supported formats at: /server/annotation/formats |
 **id** | **int**| A unique integer value identifying this project. |
 **action** | **str**| Used to start downloading process after annotation file had been created | [optional]
 **filename** | **str**| Desired output file name | [optional]

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
import cvat_api_client
from cvat_api_client.api import projects_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.

    # example passing only required values which don't have defaults set
    try:
        # Method deletes a specific project
        api_instance.projects_destroy(id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |

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
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.paginated_polymorphic_project_list import PaginatedPolymorphicProjectList
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('name', 'owner', 'assignee', 'status') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Returns a paginated list of projects according to query parameters (12 projects per page)
        api_response = api_instance.projects_list(filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
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

# **projects_partial_update**
> Project projects_partial_update(id)

Methods does a partial update of chosen fields in a project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project import Project
from cvat_api_client.model.patched_project_request import PatchedProjectRequest
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    patched_project_request = PatchedProjectRequest(
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
        assignee=PatchedProjectRequestAssignee(None),
        owner_id=1,
        assignee_id=1,
        bug_tracker="bug_tracker_example",
        task_subsets=[
            "task_subsets_example",
        ],
    ) # PatchedProjectRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in a project
        api_response = api_instance.projects_partial_update(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in a project
        api_response = api_instance.projects_partial_update(id, patched_project_request=patched_project_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **patched_project_request** | [**PatchedProjectRequest**](PatchedProjectRequest.md)|  | [optional]

### Return type

[**Project**](Project.md)

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

# **projects_retrieve**
> Project projects_retrieve(id)

Method returns details of a specific project

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.project import Project
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of a specific project
        api_response = api_instance.projects_retrieve(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |

### Return type

[**Project**](Project.md)

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

# **projects_tasks_list**
> PaginatedTaskList projects_tasks_list(id)

Method returns information of the tasks of the project with the selected id

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import projects_api
from cvat_api_client.model.paginated_task_list import PaginatedTaskList
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_api_client.Configuration(
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
configuration = cvat_api_client.Configuration(
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
with cvat_api_client.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = projects_api.ProjectsApi(api_client)
    id = 1 # int | A unique integer value identifying this project.
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('name', 'owner', 'assignee', 'status') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['name', 'owner', 'assignee', 'status', 'id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns information of the tasks of the project with the selected id
        api_response = api_instance.projects_tasks_list(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_tasks_list: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns information of the tasks of the project with the selected id
        api_response = api_instance.projects_tasks_list(id, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ProjectsApi->projects_tasks_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this project. |
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;assignee&#39;, &#39;status&#39;, &#39;id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedTaskList**](PaginatedTaskList.md)

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

