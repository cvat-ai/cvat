# cvat_api_client.IssuesApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**issues_comments_list**](IssuesApi.md#issues_comments_list) | **GET** /api/issues/{id}/comments | The action returns all comments of a specific issue
[**issues_create**](IssuesApi.md#issues_create) | **POST** /api/issues | Method creates an issue
[**issues_destroy**](IssuesApi.md#issues_destroy) | **DELETE** /api/issues/{id} | Method deletes an issue
[**issues_list**](IssuesApi.md#issues_list) | **GET** /api/issues | Method returns a paginated list of issues according to query parameters
[**issues_partial_update**](IssuesApi.md#issues_partial_update) | **PATCH** /api/issues/{id} | Methods does a partial update of chosen fields in an issue
[**issues_retrieve**](IssuesApi.md#issues_retrieve) | **GET** /api/issues/{id} | Method returns details of an issue


# **issues_comments_list**
> PaginatedCommentReadList issues_comments_list(id)

The action returns all comments of a specific issue

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import issues_api
from cvat_api_client.model.paginated_comment_read_list import PaginatedCommentReadList
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
    api_instance = issues_api.IssuesApi(api_client)
    id = 1 # int | A unique integer value identifying this issue.
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['owner', 'assignee', 'id', 'job_id', 'task_id', 'resolved'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('owner', 'assignee') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['owner', 'assignee', 'id', 'job_id', 'task_id', 'resolved'] (optional)

    # example passing only required values which don't have defaults set
    try:
        # The action returns all comments of a specific issue
        api_response = api_instance.issues_comments_list(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_comments_list: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # The action returns all comments of a specific issue
        api_response = api_instance.issues_comments_list(id, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_comments_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this issue. |
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;owner&#39;, &#39;assignee&#39;, &#39;id&#39;, &#39;job_id&#39;, &#39;task_id&#39;, &#39;resolved&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;owner&#39;, &#39;assignee&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;owner&#39;, &#39;assignee&#39;, &#39;id&#39;, &#39;job_id&#39;, &#39;task_id&#39;, &#39;resolved&#39;] | [optional]

### Return type

[**PaginatedCommentReadList**](PaginatedCommentReadList.md)

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

# **issues_create**
> IssueWrite issues_create(issue_write_request)

Method creates an issue

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import issues_api
from cvat_api_client.model.issue_write import IssueWrite
from cvat_api_client.model.issue_write_request import IssueWriteRequest
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
    api_instance = issues_api.IssuesApi(api_client)
    issue_write_request = IssueWriteRequest(
        frame=1,
        position=[
            3.14,
        ],
        job=1,
        assignee=1,
        message="message_example",
        resolved=True,
    ) # IssueWriteRequest | 

    # example passing only required values which don't have defaults set
    try:
        # Method creates an issue
        api_response = api_instance.issues_create(issue_write_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **issue_write_request** | [**IssueWriteRequest**](IssueWriteRequest.md)|  |

### Return type

[**IssueWrite**](IssueWrite.md)

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

# **issues_destroy**
> issues_destroy(id)

Method deletes an issue

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import issues_api
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
    api_instance = issues_api.IssuesApi(api_client)
    id = 1 # int | A unique integer value identifying this issue.

    # example passing only required values which don't have defaults set
    try:
        # Method deletes an issue
        api_instance.issues_destroy(id)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this issue. |

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
**204** | The issue has been deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **issues_list**
> PaginatedIssueReadList issues_list()

Method returns a paginated list of issues according to query parameters

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import issues_api
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
    api_instance = issues_api.IssuesApi(api_client)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['owner', 'assignee', 'id', 'job_id', 'task_id', 'resolved'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = "org_id_example" # str | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('owner', 'assignee') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['owner', 'assignee', 'id', 'job_id', 'task_id', 'resolved'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a paginated list of issues according to query parameters
        api_response = api_instance.issues_list(filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;owner&#39;, &#39;assignee&#39;, &#39;id&#39;, &#39;job_id&#39;, &#39;task_id&#39;, &#39;resolved&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **str**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;owner&#39;, &#39;assignee&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;owner&#39;, &#39;assignee&#39;, &#39;id&#39;, &#39;job_id&#39;, &#39;task_id&#39;, &#39;resolved&#39;] | [optional]

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

# **issues_partial_update**
> IssueWrite issues_partial_update(id)

Methods does a partial update of chosen fields in an issue

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import issues_api
from cvat_api_client.model.issue_write import IssueWrite
from cvat_api_client.model.patched_issue_write_request import PatchedIssueWriteRequest
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
    api_instance = issues_api.IssuesApi(api_client)
    id = 1 # int | A unique integer value identifying this issue.
    patched_issue_write_request = PatchedIssueWriteRequest(
        frame=1,
        position=[
            3.14,
        ],
        job=1,
        assignee=1,
        message="message_example",
        resolved=True,
    ) # PatchedIssueWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in an issue
        api_response = api_instance.issues_partial_update(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in an issue
        api_response = api_instance.issues_partial_update(id, patched_issue_write_request=patched_issue_write_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this issue. |
 **patched_issue_write_request** | [**PatchedIssueWriteRequest**](PatchedIssueWriteRequest.md)|  | [optional]

### Return type

[**IssueWrite**](IssueWrite.md)

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

# **issues_retrieve**
> IssueRead issues_retrieve(id)

Method returns details of an issue

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import issues_api
from cvat_api_client.model.issue_read import IssueRead
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
    api_instance = issues_api.IssuesApi(api_client)
    id = 1 # int | A unique integer value identifying this issue.

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of an issue
        api_response = api_instance.issues_retrieve(id)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling IssuesApi->issues_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this issue. |

### Return type

[**IssueRead**](IssueRead.md)

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

