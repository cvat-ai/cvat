# PatchedProjectWriteRequest


## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | [optional] 
**labels** | [**[PatchedLabelRequest]**](PatchedLabelRequest.md) |  | [optional]  if omitted the server will use the default value of []
**owner_id** | **int, none_type** |  | [optional] 
**assignee_id** | **int, none_type** |  | [optional] 
**bug_tracker** | **str** |  | [optional] 
**target_storage** | [**PatchedProjectWriteRequestTargetStorage**](PatchedProjectWriteRequestTargetStorage.md) |  | [optional] 
**source_storage** | [**PatchedProjectWriteRequestTargetStorage**](PatchedProjectWriteRequestTargetStorage.md) |  | [optional] 
**task_subsets** | **[str]** |  | [optional] 
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


