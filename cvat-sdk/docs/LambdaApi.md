# cvat_sdk.LambdaApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**lambda_create_functions**](LambdaApi.md#lambda_create_functions) | **POST** /api/lambda/functions/{func_id} | 
[**lambda_create_requests**](LambdaApi.md#lambda_create_requests) | **POST** /api/lambda/requests | Method calls the function
[**lambda_list_functions**](LambdaApi.md#lambda_list_functions) | **GET** /api/lambda/functions | Method returns a list of functions
[**lambda_list_requests**](LambdaApi.md#lambda_list_requests) | **GET** /api/lambda/requests | Method returns a list of requests
[**lambda_retrieve_functions**](LambdaApi.md#lambda_retrieve_functions) | **GET** /api/lambda/functions/{func_id} | Method returns the information about the function
[**lambda_retrieve_requests**](LambdaApi.md#lambda_retrieve_requests) | **GET** /api/lambda/requests/{id} | Method returns the status of the request


# **lambda_create_functions**
> lambda_create_functions(func_id)



### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import lambda_api
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
    api_instance = lambda_api.LambdaApi(api_client)
    func_id = "2" # str | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        api_instance.lambda_create_functions(func_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_create_functions: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        api_instance.lambda_create_functions(func_id, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_create_functions: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **func_id** | **str**|  |
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
**200** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **lambda_create_requests**
> lambda_create_requests()

Method calls the function

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import lambda_api
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
    api_instance = lambda_api.LambdaApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method calls the function
        api_instance.lambda_create_requests(x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_create_requests: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
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
**201** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **lambda_list_functions**
> lambda_list_functions()

Method returns a list of functions

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import lambda_api
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
    api_instance = lambda_api.LambdaApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a list of functions
        api_instance.lambda_list_functions(x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_list_functions: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
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
**200** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **lambda_list_requests**
> lambda_list_requests()

Method returns a list of requests

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import lambda_api
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
    api_instance = lambda_api.LambdaApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a list of requests
        api_instance.lambda_list_requests(x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_list_requests: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
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
**200** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **lambda_retrieve_functions**
> {str: (bool, date, datetime, dict, float, int, list, str, none_type)} lambda_retrieve_functions(func_id)

Method returns the information about the function

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import lambda_api
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
    api_instance = lambda_api.LambdaApi(api_client)
    func_id = "2" # str | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns the information about the function
        api_response = api_instance.lambda_retrieve_functions(func_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_retrieve_functions: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns the information about the function
        api_response = api_instance.lambda_retrieve_functions(func_id, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_retrieve_functions: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **func_id** | **str**|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

**{str: (bool, date, datetime, dict, float, int, list, str, none_type)}**

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Information about the function |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **lambda_retrieve_requests**
> lambda_retrieve_requests(id)

Method returns the status of the request

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import lambda_api
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
    api_instance = lambda_api.LambdaApi(api_client)
    id = 1 # int | Request id
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns the status of the request
        api_instance.lambda_retrieve_requests(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_retrieve_requests: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns the status of the request
        api_instance.lambda_retrieve_requests(id, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling LambdaApi->lambda_retrieve_requests: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| Request id |
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
**200** | No response body |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

