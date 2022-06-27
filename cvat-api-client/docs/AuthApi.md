# cvat_api_client.AuthApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**auth_login_create**](AuthApi.md#auth_login_create) | **POST** /api/auth/login | 
[**auth_logout_create**](AuthApi.md#auth_logout_create) | **POST** /api/auth/logout | 
[**auth_password_change_create**](AuthApi.md#auth_password_change_create) | **POST** /api/auth/password/change | 
[**auth_password_reset_confirm_create**](AuthApi.md#auth_password_reset_confirm_create) | **POST** /api/auth/password/reset/confirm | 
[**auth_password_reset_create**](AuthApi.md#auth_password_reset_create) | **POST** /api/auth/password/reset | 
[**auth_register_create**](AuthApi.md#auth_register_create) | **POST** /api/auth/register | 
[**auth_signing_create**](AuthApi.md#auth_signing_create) | **POST** /api/auth/signing | This method signs URL for access to the server


# **auth_login_create**
> Token auth_login_create(login_request)



Check the credentials and return the REST Token if the credentials are valid and authenticated. Calls Django Auth login method to register User ID in Django session framework  Accept the following POST parameters: username, password Return the REST Framework Token Object's key.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.login_request import LoginRequest
from cvat_api_client.model.token import Token
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
    api_instance = auth_api.AuthApi(api_client)
    login_request = LoginRequest(
        username="username_example",
        email="email_example",
        password="password_example",
    ) # LoginRequest | 

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.auth_login_create(login_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_login_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **login_request** | [**LoginRequest**](LoginRequest.md)|  |

### Return type

[**Token**](Token.md)

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

# **auth_logout_create**
> RestAuthDetail auth_logout_create()



Calls Django logout method and delete the Token object assigned to the current User object.  Accepts/Returns nothing.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.rest_auth_detail import RestAuthDetail
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
    api_instance = auth_api.AuthApi(api_client)

    # example, this endpoint has no required or optional parameters
    try:
        api_response = api_instance.auth_logout_create()
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_logout_create: %s\n" % e)
```


### Parameters
This endpoint does not need any parameter.

### Return type

[**RestAuthDetail**](RestAuthDetail.md)

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

# **auth_password_change_create**
> RestAuthDetail auth_password_change_create(password_change_request)



Calls Django Auth SetPasswordForm save method.  Accepts the following POST parameters: new_password1, new_password2 Returns the success/fail message.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.rest_auth_detail import RestAuthDetail
from cvat_api_client.model.password_change_request import PasswordChangeRequest
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
    api_instance = auth_api.AuthApi(api_client)
    password_change_request = PasswordChangeRequest(
        old_password="old_password_example",
        new_password1="new_password1_example",
        new_password2="new_password2_example",
    ) # PasswordChangeRequest | 

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.auth_password_change_create(password_change_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_password_change_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **password_change_request** | [**PasswordChangeRequest**](PasswordChangeRequest.md)|  |

### Return type

[**RestAuthDetail**](RestAuthDetail.md)

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

# **auth_password_reset_confirm_create**
> RestAuthDetail auth_password_reset_confirm_create(password_reset_confirm_request)



Password reset e-mail link is confirmed, therefore this resets the user's password.  Accepts the following POST parameters: token, uid,     new_password1, new_password2 Returns the success/fail message.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.password_reset_confirm_request import PasswordResetConfirmRequest
from cvat_api_client.model.rest_auth_detail import RestAuthDetail
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
    api_instance = auth_api.AuthApi(api_client)
    password_reset_confirm_request = PasswordResetConfirmRequest(
        new_password1="new_password1_example",
        new_password2="new_password2_example",
        uid="uid_example",
        token="token_example",
    ) # PasswordResetConfirmRequest | 

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.auth_password_reset_confirm_create(password_reset_confirm_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_password_reset_confirm_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **password_reset_confirm_request** | [**PasswordResetConfirmRequest**](PasswordResetConfirmRequest.md)|  |

### Return type

[**RestAuthDetail**](RestAuthDetail.md)

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

# **auth_password_reset_create**
> RestAuthDetail auth_password_reset_create(password_reset_serializer_ex_request)



Calls Django Auth PasswordResetForm save method.  Accepts the following POST parameters: email Returns the success/fail message.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.rest_auth_detail import RestAuthDetail
from cvat_api_client.model.password_reset_serializer_ex_request import PasswordResetSerializerExRequest
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
    api_instance = auth_api.AuthApi(api_client)
    password_reset_serializer_ex_request = PasswordResetSerializerExRequest(
        email="email_example",
    ) # PasswordResetSerializerExRequest | 

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.auth_password_reset_create(password_reset_serializer_ex_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_password_reset_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **password_reset_serializer_ex_request** | [**PasswordResetSerializerExRequest**](PasswordResetSerializerExRequest.md)|  |

### Return type

[**RestAuthDetail**](RestAuthDetail.md)

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

# **auth_register_create**
> RestrictedRegister auth_register_create(restricted_register_request)



### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.restricted_register_request import RestrictedRegisterRequest
from cvat_api_client.model.restricted_register import RestrictedRegister
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
    api_instance = auth_api.AuthApi(api_client)
    restricted_register_request = RestrictedRegisterRequest(
        username="username_example",
        email="email_example",
        password1="password1_example",
        password2="password2_example",
        first_name="first_name_example",
        last_name="last_name_example",
        confirmations=[
            UserAgreementRequest(
                name="name_example",
                display_text="",
                url="",
                required=False,
                value=False,
            ),
        ],
    ) # RestrictedRegisterRequest | 

    # example passing only required values which don't have defaults set
    try:
        api_response = api_instance.auth_register_create(restricted_register_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_register_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **restricted_register_request** | [**RestrictedRegisterRequest**](RestrictedRegisterRequest.md)|  |

### Return type

[**RestrictedRegister**](RestrictedRegister.md)

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

# **auth_signing_create**
> str auth_signing_create(signing_request)

This method signs URL for access to the server

Signed URL contains a token which authenticates a user on the server.Signed URL is valid during 30 seconds since signing.

### Example

* Api Key Authentication (SignatureAuthentication):
* Basic Authentication (basicAuth):
* Api Key Authentication (cookieAuth):
* Api Key Authentication (tokenAuth):

```python
import time
import cvat_api_client
from cvat_api_client.api import auth_api
from cvat_api_client.model.signing_request import SigningRequest
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
    api_instance = auth_api.AuthApi(api_client)
    signing_request = SigningRequest(
        url="url_example",
    ) # SigningRequest | 

    # example passing only required values which don't have defaults set
    try:
        # This method signs URL for access to the server
        api_response = api_instance.auth_signing_create(signing_request)
        pprint(api_response)
    except cvat_api_client.ApiException as e:
        print("Exception when calling AuthApi->auth_signing_create: %s\n" % e)
```


### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **signing_request** | [**SigningRequest**](SigningRequest.md)|  |

### Return type

**str**

### Authorization

[SignatureAuthentication](../README.md#SignatureAuthentication), [basicAuth](../README.md#basicAuth), [cookieAuth](../README.md#cookieAuth), [tokenAuth](../README.md#tokenAuth)

### HTTP request headers

 - **Content-Type**: application/json, application/x-www-form-urlencoded, multipart/form-data, application/offset+octet-stream
 - **Accept**: application/vnd.cvat+json


### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | text URL |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

