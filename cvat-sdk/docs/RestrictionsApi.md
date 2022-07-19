# cvat_sdk.RestrictionsApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**restrictions_retrieve_terms_of_use**](RestrictionsApi.md#restrictions_retrieve_terms_of_use) | **GET** /api/restrictions/terms-of-use | Method provides CVAT terms of use
[**restrictions_retrieve_user_agreements**](RestrictionsApi.md#restrictions_retrieve_user_agreements) | **GET** /api/restrictions/user-agreements | Method provides user agreements that the user must accept to register


# **restrictions_retrieve_terms_of_use**
> restrictions_retrieve_terms_of_use()

Method provides CVAT terms of use

### Example


```python
import time
import cvat_sdk
from cvat_sdk.api import restrictions_api
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)


# Enter a context with an instance of the API client
with cvat_sdk.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = restrictions_api.RestrictionsApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method provides CVAT terms of use
        api_instance.restrictions_retrieve_terms_of_use(x_organization=x_organization, org=org, org_id=org_id)
    except cvat_sdk.ApiException as e:
        print("Exception when calling RestrictionsApi->restrictions_retrieve_terms_of_use: %s\n" % e)
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

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | CVAT terms of use |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **restrictions_retrieve_user_agreements**
> UserAgreement restrictions_retrieve_user_agreements()

Method provides user agreements that the user must accept to register

### Example


```python
import time
import cvat_sdk
from cvat_sdk.api import restrictions_api
from cvat_sdk.model.user_agreement import UserAgreement
from pprint import pprint
# Defining the host is optional and defaults to http://localhost
# See configuration.py for a list of all supported configuration parameters.
configuration = cvat_sdk.Configuration(
    host = "http://localhost"
)


# Enter a context with an instance of the API client
with cvat_sdk.ApiClient() as api_client:
    # Create an instance of the API class
    api_instance = restrictions_api.RestrictionsApi(api_client)
    x_organization = "X-Organization_example" # str |  (optional)
    org = "org_example" # str | Organization unique slug (optional)
    org_id = 1 # int | Organization identifier (optional)

    # example passing only required values which don't have defaults set
    # and optional values
    try:
        # Method provides user agreements that the user must accept to register
        api_response = api_instance.restrictions_retrieve_user_agreements(x_organization=x_organization, org=org, org_id=org_id)
        pprint(api_response)
    except cvat_sdk.ApiException as e:
        print("Exception when calling RestrictionsApi->restrictions_retrieve_user_agreements: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **x_organization** | **str**|  | [optional]
 **org** | **str**| Organization unique slug | [optional]
 **org_id** | **int**| Organization identifier | [optional]

### Return type

[**UserAgreement**](UserAgreement.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

