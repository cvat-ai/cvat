# cvat_api_client.ServerApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**server_about_retrieve**](ServerApi.md#server_about_retrieve) | **GET** /api/server/about | Method provides basic CVAT information
[**server_annotation_formats_retrieve**](ServerApi.md#server_annotation_formats_retrieve) | **GET** /api/server/annotation/formats | Method provides the list of supported annotations formats
[**server_exception_create**](ServerApi.md#server_exception_create) | **POST** /api/server/exception | Method saves an exception from a client on the server
[**server_logs_create**](ServerApi.md#server_logs_create) | **POST** /api/server/logs | Method saves logs from a client on the server
[**server_plugins_retrieve**](ServerApi.md#server_plugins_retrieve) | **GET** /api/server/plugins | Method provides allowed plugins
[**server_share_list**](ServerApi.md#server_share_list) | **GET** /api/server/share | Returns all files and folders that are on the server along specified path


# **server_about_retrieve**
> About server_about_retrieve()

Method provides basic CVAT information

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import server_api
from cvat_api_client.model.about import About
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
    api_instance = server_api.ServerApi(api_client)

    # example, this endpoint has no required or optional parameters
    try:
        # Method provides basic CVAT information
        api_response = api_instance.server_about_retrieve()
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ServerApi->server_about_retrieve: %s\n" % e)
```


### Parameters
This endpoint does not need any parameter.

### Return type

[**About**](About.md)

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

# **server_annotation_formats_retrieve**
> DatasetFormats server_annotation_formats_retrieve()

Method provides the list of supported annotations formats

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import server_api
from cvat_api_client.model.dataset_formats import DatasetFormats
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
    api_instance = server_api.ServerApi(api_client)

    # example, this endpoint has no required or optional parameters
    try:
        # Method provides the list of supported annotations formats
        api_response = api_instance.server_annotation_formats_retrieve()
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ServerApi->server_annotation_formats_retrieve: %s\n" % e)
```


### Parameters
This endpoint does not need any parameter.

### Return type

[**DatasetFormats**](DatasetFormats.md)

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

# **server_exception_create**
> Exception server_exception_create(exception_request)

Method saves an exception from a client on the server

Sends logs to the ELK if it is connected

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import server_api
from cvat_api_client.model.exception import Exception
from cvat_api_client.model.exception_request import ExceptionRequest
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
    api_instance = server_api.ServerApi(api_client)
    exception_request = ExceptionRequest(
        system="system_example",
        client="client_example",
        time=dateutil_parser('1970-01-01T00:00:00.00Z'),
        job_id=1,
        task_id=1,
        proj_id=1,
        client_id=1,
        message="message_example",
        filename="filename_example",
        line=1,
        column=1,
        stack="stack_example",
    ) # ExceptionRequest | 

    # example passing only required values which don't have defaults set
    try:
        # Method saves an exception from a client on the server
        api_response = api_instance.server_exception_create(exception_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ServerApi->server_exception_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **exception_request** | [**ExceptionRequest**](ExceptionRequest.md)|  |

### Return type

[**Exception**](Exception.md)

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

# **server_logs_create**
> [LogEvent] server_logs_create(log_event_request)

Method saves logs from a client on the server

Sends logs to the ELK if it is connected

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import server_api
from cvat_api_client.model.log_event_request import LogEventRequest
from cvat_api_client.model.log_event import LogEvent
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
    api_instance = server_api.ServerApi(api_client)
    log_event_request = [
        LogEventRequest(
            job_id=1,
            task_id=1,
            proj_id=1,
            client_id=1,
            name="name_example",
            time=dateutil_parser('1970-01-01T00:00:00.00Z'),
            message="message_example",
            payload={
                "key": None,
            },
            is_active=True,
        ),
    ] # [LogEventRequest] | 

    # example passing only required values which don't have defaults set
    try:
        # Method saves logs from a client on the server
        api_response = api_instance.server_logs_create(log_event_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ServerApi->server_logs_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **log_event_request** | [**[LogEventRequest]**](LogEventRequest.md)|  |

### Return type

[**[LogEvent]**](LogEvent.md)

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

# **server_plugins_retrieve**
> Plugins server_plugins_retrieve()

Method provides allowed plugins

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import server_api
from cvat_api_client.model.plugins import Plugins
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
    api_instance = server_api.ServerApi(api_client)

    # example, this endpoint has no required or optional parameters
    try:
        # Method provides allowed plugins
        api_response = api_instance.server_plugins_retrieve()
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ServerApi->server_plugins_retrieve: %s\n" % e)
```


### Parameters
This endpoint does not need any parameter.

### Return type

[**Plugins**](Plugins.md)

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

# **server_share_list**
> [FileInfo] server_share_list()

Returns all files and folders that are on the server along specified path

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import server_api
from cvat_api_client.model.file_info import FileInfo
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
    api_instance = server_api.ServerApi(api_client)
    directory = "directory_example" # str | Directory to browse (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Returns all files and folders that are on the server along specified path
        api_response = api_instance.server_share_list(directory=directory)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling ServerApi->server_share_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **directory** | **str**| Directory to browse | [optional]

### Return type

[**[FileInfo]**](FileInfo.md)

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

