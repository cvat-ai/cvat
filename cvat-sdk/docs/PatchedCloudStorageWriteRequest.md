# PatchedCloudStorageWriteRequest


## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**provider_type** | [**ProviderTypeEnum**](ProviderTypeEnum.md) |  | [optional] 
**resource** | **str** |  | [optional] 
**display_name** | **str** |  | [optional] 
**owner** | [**BasicUserRequest**](BasicUserRequest.md) |  | [optional] 
**credentials_type** | [**CredentialsTypeEnum**](CredentialsTypeEnum.md) |  | [optional] 
**session_token** | **str** |  | [optional] 
**account_name** | **str** |  | [optional] 
**key** | **str** |  | [optional] 
**secret_key** | **str** |  | [optional] 
**key_file** | **file_type** |  | [optional] 
**specific_attributes** | **str** |  | [optional] 
**description** | **str** |  | [optional] 
**manifests** | [**[ManifestRequest]**](ManifestRequest.md) |  | [optional]  if omitted the server will use the default value of []
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


