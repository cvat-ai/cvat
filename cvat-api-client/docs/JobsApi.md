# cvat_api_client.JobsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**jobs_annotations_create**](JobsApi.md#jobs_annotations_create) | **POST** /api/jobs/{id}/annotations/ | 
[**jobs_annotations_destroy**](JobsApi.md#jobs_annotations_destroy) | **DELETE** /api/jobs/{id}/annotations/ | Method deletes all annotations for a specific job
[**jobs_annotations_list**](JobsApi.md#jobs_annotations_list) | **GET** /api/jobs/{id}/annotations/ | Method returns annotations for a specific job
[**jobs_annotations_partial_update**](JobsApi.md#jobs_annotations_partial_update) | **PATCH** /api/jobs/{id}/annotations/ | Method performs a partial update of annotations in a specific job
[**jobs_annotations_partial_update2**](JobsApi.md#jobs_annotations_partial_update2) | **PATCH** /api/jobs/{id}/annotations/{file_id} | 
[**jobs_annotations_update**](JobsApi.md#jobs_annotations_update) | **PUT** /api/jobs/{id}/annotations/ | Method performs an update of all annotations in a specific job
[**jobs_commits_list**](JobsApi.md#jobs_commits_list) | **GET** /api/jobs/{id}/commits | The action returns the list of tracked changes for the job
[**jobs_data_meta_retrieve**](JobsApi.md#jobs_data_meta_retrieve) | **GET** /api/jobs/{id}/data/meta | Method provides a meta information about media files which are related with the job
[**jobs_data_retrieve**](JobsApi.md#jobs_data_retrieve) | **GET** /api/jobs/{id}/data | Method returns data for a specific job
[**jobs_issues_list**](JobsApi.md#jobs_issues_list) | **GET** /api/jobs/{id}/issues | Method returns list of issues for the job
[**jobs_list**](JobsApi.md#jobs_list) | **GET** /api/jobs | Method returns a paginated list of jobs according to query parameters
[**jobs_partial_update**](JobsApi.md#jobs_partial_update) | **PATCH** /api/jobs/{id} | Methods does a partial update of chosen fields in a job
[**jobs_retrieve**](JobsApi.md#jobs_retrieve) | **GET** /api/jobs/{id} | Method returns details of a job
[**jobs_update**](JobsApi.md#jobs_update) | **PUT** /api/jobs/{id} | Method updates a job by id


# **jobs_annotations_create**
> JobWrite jobs_annotations_create(id)



### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.job_write import JobWrite
from cvat_api_client.model.job_write_request import JobWriteRequest
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    job_write_request = JobWriteRequest(
        assignee=1,
        stage=StageEnum("annotation"),
        state=StateBf1Enum("new"),
    ) # JobWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.jobs_annotations_create(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_create: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        api_response = api_instance.jobs_annotations_create(id, job_write_request=job_write_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **job_write_request** | [**JobWriteRequest**](JobWriteRequest.md)|  | [optional]

### Return type

[**JobWrite**](JobWrite.md)

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

# **jobs_annotations_destroy**
> jobs_annotations_destroy(id)

Method deletes all annotations for a specific job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.

    # example passing only required values which don't have defaults set
    try:
        # Method deletes all annotations for a specific job
        api_instance.jobs_annotations_destroy(id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |

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

# **jobs_annotations_list**
> PaginatedLabeledDataList jobs_annotations_list(id)

Method returns annotations for a specific job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.paginated_labeled_data_list import PaginatedLabeledDataList
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('task_name', 'project_name', 'assignee', 'state', 'stage') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns annotations for a specific job
        api_response = api_instance.jobs_annotations_list(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_list: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns annotations for a specific job
        api_response = api_instance.jobs_annotations_list(id, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedLabeledDataList**](PaginatedLabeledDataList.md)

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

# **jobs_annotations_partial_update**
> jobs_annotations_partial_update(action, id)

Method performs a partial update of annotations in a specific job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.patched_job_write_request import PatchedJobWriteRequest
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
    api_instance = jobs_api.JobsApi(api_client)
    action = "create" # str | 
    id = 1 # int | A unique integer value identifying this job.
    patched_job_write_request = PatchedJobWriteRequest(
        assignee=1,
        stage=StageEnum("annotation"),
        state=StateBf1Enum("new"),
    ) # PatchedJobWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method performs a partial update of annotations in a specific job
        api_instance.jobs_annotations_partial_update(action, id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method performs a partial update of annotations in a specific job
        api_instance.jobs_annotations_partial_update(action, id, patched_job_write_request=patched_job_write_request)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **action** | **str**|  |
 **id** | **int**| A unique integer value identifying this job. |
 **patched_job_write_request** | [**PatchedJobWriteRequest**](PatchedJobWriteRequest.md)|  | [optional]

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
**200** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **jobs_annotations_partial_update2**
> JobWrite jobs_annotations_partial_update2(file_id, id)



### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.job_write import JobWrite
from cvat_api_client.model.patched_job_write_request import PatchedJobWriteRequest
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
    api_instance = jobs_api.JobsApi(api_client)
    file_id = "bf325375-e030-fccb-a009-17317c574773" # str | 
    id = 1 # int | A unique integer value identifying this job.
    patched_job_write_request = PatchedJobWriteRequest(
        assignee=1,
        stage=StageEnum("annotation"),
        state=StateBf1Enum("new"),
    ) # PatchedJobWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.jobs_annotations_partial_update2(file_id, id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_partial_update2: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        api_response = api_instance.jobs_annotations_partial_update2(file_id, id, patched_job_write_request=patched_job_write_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_partial_update2: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **file_id** | **str**|  |
 **id** | **int**| A unique integer value identifying this job. |
 **patched_job_write_request** | [**PatchedJobWriteRequest**](PatchedJobWriteRequest.md)|  | [optional]

### Return type

[**JobWrite**](JobWrite.md)

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

# **jobs_annotations_update**
> jobs_annotations_update(id, annotation_file_request)

Method performs an update of all annotations in a specific job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.annotation_file_request import AnnotationFileRequest
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    annotation_file_request = AnnotationFileRequest(
        annotation_file=open('/path/to/file', 'rb'),
    ) # AnnotationFileRequest | 

    # example passing only required values which don't have defaults set
    try:
        # Method performs an update of all annotations in a specific job
        api_instance.jobs_annotations_update(id, annotation_file_request)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_annotations_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **annotation_file_request** | [**AnnotationFileRequest**](AnnotationFileRequest.md)|  |

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

# **jobs_commits_list**
> PaginatedJobCommitList jobs_commits_list(id)

The action returns the list of tracked changes for the job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.paginated_job_commit_list import PaginatedJobCommitList
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('task_name', 'project_name', 'assignee', 'state', 'stage') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # The action returns the list of tracked changes for the job
        api_response = api_instance.jobs_commits_list(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_commits_list: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # The action returns the list of tracked changes for the job
        api_response = api_instance.jobs_commits_list(id, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_commits_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedJobCommitList**](PaginatedJobCommitList.md)

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

# **jobs_data_meta_retrieve**
> DataMetaRead jobs_data_meta_retrieve(id)

Method provides a meta information about media files which are related with the job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.data_meta_read import DataMetaRead
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.

    # example passing only required values which don't have defaults set
    try:
        # Method provides a meta information about media files which are related with the job
        api_response = api_instance.jobs_data_meta_retrieve(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_data_meta_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |

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

# **jobs_data_retrieve**
> jobs_data_retrieve(id, number, quality, type)

Method returns data for a specific job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    number = 3.14 # float | A unique number value identifying chunk or frame, doesn't matter for 'preview' type
    quality = "compressed" # str | Specifies the quality level of the requested data, doesn't matter for 'preview' type
    type = "chunk" # str | Specifies the type of the requested data

    # example passing only required values which don't have defaults set
    try:
        # Method returns data for a specific job
        api_instance.jobs_data_retrieve(id, number, quality, type)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_data_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **number** | **float**| A unique number value identifying chunk or frame, doesn&#39;t matter for &#39;preview&#39; type |
 **quality** | **str**| Specifies the quality level of the requested data, doesn&#39;t matter for &#39;preview&#39; type |
 **type** | **str**| Specifies the type of the requested data |

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

# **jobs_issues_list**
> PaginatedIssueReadList jobs_issues_list(id)

Method returns list of issues for the job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.paginated_issue_read_list import PaginatedIssueReadList
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('task_name', 'project_name', 'assignee', 'state', 'stage') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns list of issues for the job
        api_response = api_instance.jobs_issues_list(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_issues_list: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns list of issues for the job
        api_response = api_instance.jobs_issues_list(id, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_issues_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]

### Return type

[**PaginatedIssueReadList**](PaginatedIssueReadList.md)

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

# **jobs_list**
> PaginatedJobReadList jobs_list()

Method returns a paginated list of jobs according to query parameters

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.paginated_job_read_list import PaginatedJobReadList
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
    api_instance = jobs_api.JobsApi(api_client)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('task_name', 'project_name', 'assignee', 'state', 'stage') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['task_name', 'project_name', 'assignee', 'state', 'stage', 'id', 'task_id', 'project_id', 'updated_date'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a paginated list of jobs according to query parameters
        api_response = api_instance.jobs_list(filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;task_name&#39;, &#39;project_name&#39;, &#39;assignee&#39;, &#39;state&#39;, &#39;stage&#39;, &#39;id&#39;, &#39;task_id&#39;, &#39;project_id&#39;, &#39;updated_date&#39;] | [optional]

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

# **jobs_partial_update**
> JobWrite jobs_partial_update(id)

Methods does a partial update of chosen fields in a job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.job_write import JobWrite
from cvat_api_client.model.patched_job_write_request import PatchedJobWriteRequest
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    patched_job_write_request = PatchedJobWriteRequest(
        assignee=1,
        stage=StageEnum("annotation"),
        state=StateBf1Enum("new"),
    ) # PatchedJobWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in a job
        api_response = api_instance.jobs_partial_update(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in a job
        api_response = api_instance.jobs_partial_update(id, patched_job_write_request=patched_job_write_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **patched_job_write_request** | [**PatchedJobWriteRequest**](PatchedJobWriteRequest.md)|  | [optional]

### Return type

[**JobWrite**](JobWrite.md)

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

# **jobs_retrieve**
> JobRead jobs_retrieve(id)

Method returns details of a job

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.job_read import JobRead
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of a job
        api_response = api_instance.jobs_retrieve(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |

### Return type

[**JobRead**](JobRead.md)

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

# **jobs_update**
> JobWrite jobs_update(id)

Method updates a job by id

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import jobs_api
from cvat_api_client.model.job_write import JobWrite
from cvat_api_client.model.job_write_request import JobWriteRequest
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
    api_instance = jobs_api.JobsApi(api_client)
    id = 1 # int | A unique integer value identifying this job.
    job_write_request = JobWriteRequest(
        assignee=1,
        stage=StageEnum("annotation"),
        state=StateBf1Enum("new"),
    ) # JobWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method updates a job by id
        api_response = api_instance.jobs_update(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method updates a job by id
        api_response = api_instance.jobs_update(id, job_write_request=job_write_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling JobsApi->jobs_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this job. |
 **job_write_request** | [**JobWriteRequest**](JobWriteRequest.md)|  | [optional]

### Return type

[**JobWrite**](JobWrite.md)

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

