# cvat_sdk.InvitationsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**invitations_create**](InvitationsApi.md#invitations_create) | **POST** /api/invitations | Method creates an invitation
[**invitations_destroy**](InvitationsApi.md#invitations_destroy) | **DELETE** /api/invitations/{key} | Method deletes an invitation
[**invitations_list**](InvitationsApi.md#invitations_list) | **GET** /api/invitations | Method returns a paginated list of invitations according to query parameters
[**invitations_partial_update**](InvitationsApi.md#invitations_partial_update) | **PATCH** /api/invitations/{key} | Methods does a partial update of chosen fields in an invitation
[**invitations_retrieve**](InvitationsApi.md#invitations_retrieve) | **GET** /api/invitations/{key} | Method returns details of an invitation


# **invitations_create**
> InvitationWrite invitations_create(invitation_write_request)

Method creates an invitation

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import invitations_api
from cvat_sdk.model.invitation_write import InvitationWrite
from cvat_sdk.model.invitation_write_request import InvitationWriteRequest
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
    api_instance = invitations_api.InvitationsApi(api_client)
    invitation_write_request = InvitationWriteRequest(
        role=RoleEnum("worker"),
        email="email_example",
    ) # InvitationWriteRequest | 
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method creates an invitation
        api_response = api_instance.invitations_create(invitation_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_create: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method creates an invitation
        api_response = api_instance.invitations_create(invitation_write_request, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **invitation_write_request** | [**InvitationWriteRequest**](InvitationWriteRequest.md)|  |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**InvitationWrite**](InvitationWrite.md)

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

# **invitations_destroy**
> invitations_destroy(key)

Method deletes an invitation

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import invitations_api
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
    api_instance = invitations_api.InvitationsApi(api_client)
    key = "key_example" # str | A unique value identifying this invitation.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method deletes an invitation
        api_instance.invitations_destroy(key)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_destroy: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method deletes an invitation
        api_instance.invitations_destroy(key, x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_destroy: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **key** | **str**| A unique value identifying this invitation. |
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
**204** | The invitation has been deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **invitations_list**
> PaginatedInvitationReadList invitations_list()

Method returns a paginated list of invitations according to query parameters

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import invitations_api
from cvat_sdk.model.paginated_invitation_read_list import PaginatedInvitationReadList
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
    api_instance = invitations_api.InvitationsApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    filter = "filter_example" # str | A filter term. Avaliable filter_fields: ('owner',) (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    page = 1 # int | A page number within the paginated result set. (optional)
    page_size = 1 # int | Number of results to return per page. (optional)
    search = "search_example" # str | A search term. Avaliable search_fields: ('owner',) (optional)
    sort = "sort_example" # str | Which field to use when ordering the results. Avaliable ordering_fields: ['owner', 'created_date'] (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns a paginated list of invitations according to query parameters
        api_response = api_instance.invitations_list(x_organization=x_organization, filter=filter, org=org, org_id=org_id, page=page, page_size=page_size, search=search, sort=sort)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_list: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_organization** | **str**|  | [optional]
 **filter** | **str**| A filter term. Avaliable filter_fields: (&#39;owner&#39;,) | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **page** | **int**| A page number within the paginated result set. | [optional]
 **page_size** | **int**| Number of results to return per page. | [optional]
 **search** | **str**| A search term. Avaliable search_fields: (&#39;owner&#39;,) | [optional]
 **sort** | **str**| Which field to use when ordering the results. Avaliable ordering_fields: [&#39;owner&#39;, &#39;created_date&#39;] | [optional]

### Return type

[**PaginatedInvitationReadList**](PaginatedInvitationReadList.md)

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

# **invitations_partial_update**
> InvitationWrite invitations_partial_update(key)

Methods does a partial update of chosen fields in an invitation

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import invitations_api
from cvat_sdk.model.patched_invitation_write_request import PatchedInvitationWriteRequest
from cvat_sdk.model.invitation_write import InvitationWrite
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
    api_instance = invitations_api.InvitationsApi(api_client)
    key = "key_example" # str | A unique value identifying this invitation.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)
    patched_invitation_write_request = PatchedInvitationWriteRequest(
        role=RoleEnum("worker"),
        email="email_example",
    ) # PatchedInvitationWriteRequest |  (optional)

    # example passing only required values which don't have defaults set
    try:
        # Methods does a partial update of chosen fields in an invitation
        api_response = api_instance.invitations_partial_update(key)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_partial_update: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Methods does a partial update of chosen fields in an invitation
        api_response = api_instance.invitations_partial_update(key, x_organization=x_organization, org=org, org_id=org_id, patched_invitation_write_request=patched_invitation_write_request)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_partial_update: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **key** | **str**| A unique value identifying this invitation. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]
 **patched_invitation_write_request** | [**PatchedInvitationWriteRequest**](PatchedInvitationWriteRequest.md)|  | [optional]

### Return type

[**InvitationWrite**](InvitationWrite.md)

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

# **invitations_retrieve**
> InvitationRead invitations_retrieve(key)

Method returns details of an invitation

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_sdk
from cvat_sdk.api import invitations_api
from cvat_sdk.model.invitation_read import InvitationRead
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
    api_instance = invitations_api.InvitationsApi(api_client)
    key = "key_example" # str | A unique value identifying this invitation.
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    try:
        # Method returns details of an invitation
        api_response = api_instance.invitations_retrieve(key)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_retrieve: %s\n" % e)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method returns details of an invitation
        api_response = api_instance.invitations_retrieve(key, x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling InvitationsApi->invitations_retrieve: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **key** | **str**| A unique value identifying this invitation. |
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**InvitationRead**](InvitationRead.md)

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

