# CloudStorageWrite


## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**provider_type** | [**ProviderTypeEnum**](ProviderTypeEnum.md) |  | 
**resource** | **str** |  | 
**display_name** | **str** |  | 
**credentials_type** | [**CredentialsTypeEnum**](CredentialsTypeEnum.md) |  | 
**owner** | [**BasicUser**](BasicUser.md) |  | [optional] 
**created_date** | **datetime** |  | [optional] [readonly] 
**updated_date** | **datetime** |  | [optional] [readonly] 
**session_token** | **str** |  | [optional] 
**account_name** | **str** |  | [optional] 
**key** | **str** |  | [optional] 
**secret_key** | **str** |  | [optional] 
**key_file** | **str** |  | [optional] 
**specific_attributes** | **str** |  | [optional] 
**description** | **str** |  | [optional] 
**id** | **int** |  | [optional] [readonly] 
**manifests** | [**[Manifest]**](Manifest.md) |  | [optional]  if omitted the server will use the default value of []
**organization** | **int, none_type** |  | [optional] [readonly] 
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


