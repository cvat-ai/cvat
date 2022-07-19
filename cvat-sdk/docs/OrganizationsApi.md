# cvat_sdk.OrganizationsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**organizations_create**](OrganizationsApi.md#organizations_create) | **POST** /api/organizations | Method creates an organization
[**organizations_destroy**](OrganizationsApi.md#organizations_destroy) | **DELETE** /api/organizations/{id} | Method deletes an organization
[**organizations_list**](OrganizationsApi.md#organizations_list) | **GET** /api/organizations | Method returns a paginated list of organizatins according to query parameters
[**organizations_partial_update**](OrganizationsApi.md#organizations_partial_update) | **PATCH** /api/organizations/{id} | Methods does a partial update of chosen fields in an organization
[**organizations_retrieve**](OrganizationsApi.md#organizations_retrieve) | **GET** /api/organizations/{id} | Method returns details of an organization


# **organizations_create**
> OrganizationWrite organizations_create(organization_write_request)

Method creates an organization

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import organizations_api
from cvat_sdk.model.organization_write import OrganizationWrite
from cvat_sdk.model.organization_write_request import OrganizationWriteRequest
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
    api_instance = organizations_api.OrganizationsApi(api_client)
    organization_write_request = OrganizationWriteRequest(
        slug="z",
        name="name_example",
        description="description_example",
        contact={
            "key": None,
        },
    ) # OrganizationWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method creates an organization
        api_response = api_instance.organizations_create(organization_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_create: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method creates an organization
        api_response = api_instance.organizations_create(organization_write_request, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **organization_write_request** | [**OrganizationWriteRequest**](OrganizationWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**OrganizationWrite**](OrganizationWrite.md)

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

# **organizations_destroy**
> organizations_destroy(id)

Method deletes an organization

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import organizations_api
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
    api_instance = organizations_api.OrganizationsApi(api_client)
    id = 1 # int | A unique integer value identifying this organization.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method deletes an organization
        api_instance.organizations_destroy(id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_destroy: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method deletes an organization
        api_instance.organizations_destroy(id, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this organization. |
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
**204** | The organization has been deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **organizations_list**
> [OrganizationRead] organizations_list()

Method returns a paginated list of organizatins according to query parameters

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import organizations_api
from cvat_sdk.model.organization_read import OrganizationRead
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
    api_instance = organizations_api.OrganizationsApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ['name', 'owner', 'id', 'slug'] (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('name', 'owner') (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['name', 'owner', 'id', 'slug'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a paginated list of organizatins according to query parameters
        api_response = api_instance.organizations_list(x_organization=x_organization, filter=filter, org=org, org_id=org_id, search=search, sort=sort)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_organization** | **str**|  | [optional]
 **filter** | **str**| A filter term. Avaliable filter_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;id&#39;, &#39;slug&#39;] | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;name&#39;, &#39;owner&#39;) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;name&#39;, &#39;owner&#39;, &#39;id&#39;, &#39;slug&#39;] | [optional]

### Return type

[**[OrganizationRead]**](OrganizationRead.md)

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

# **organizations_partial_update**
> OrganizationWrite organizations_partial_update(id)

Methods does a partial update of chosen fields in an organization

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import organizations_api
from cvat_sdk.model.patched_organization_write_request import PatchedOrganizationWriteRequest
from cvat_sdk.model.organization_write import OrganizationWrite
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
    api_instance = organizations_api.OrganizationsApi(api_client)
    id = 1 # int | A unique integer value identifying this organization.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_organization_write_request = PatchedOrganizationWriteRequest(
        slug="z",
        name="name_example",
        description="description_example",
        contact={
            "key": None,
        },
    ) # PatchedOrganizationWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in an organization
        api_response = api_instance.organizations_partial_update(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in an organization
        api_response = api_instance.organizations_partial_update(id, x_organization=x_organization, org=org, org_id=org_id, patched_organization_write_request=patched_organization_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this organization. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_organization_write_request** | [**PatchedOrganizationWriteRequest**](PatchedOrganizationWriteRequest.md)|  | [optional]

### Return type

[**OrganizationWrite**](OrganizationWrite.md)

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

# **organizations_retrieve**
> OrganizationRead organizations_retrieve(id)

Method returns details of an organization

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import organizations_api
from cvat_sdk.model.organization_read import OrganizationRead
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
    api_instance = organizations_api.OrganizationsApi(api_client)
    id = 1 # int | A unique integer value identifying this organization.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of an organization
        api_response = api_instance.organizations_retrieve(id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_retrieve: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns details of an organization
        api_response = api_instance.organizations_retrieve(id, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling OrganizationsApi->organizations_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **int**| A unique integer value identifying this organization. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**OrganizationRead**](OrganizationRead.md)

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

