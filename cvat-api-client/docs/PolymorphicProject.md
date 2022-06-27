# PolymorphicProject


## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | [readonly] 
**url** | **str** |  | [optional] [readonly] 
**id** | **int** |  | [optional] [readonly] 
**labels** | [**[Label]**](Label.md) |  | [optional]  if omitted the server will use the default value of []
**tasks** | **[int]** |  | [optional] [readonly] 
**owner** | [**ProjectOwner**](ProjectOwner.md) |  | [optional] 
**assignee** | [**CommentReadOwner**](CommentReadOwner.md) |  | [optional] 
**bug_tracker** | **str** |  | [optional] 
**task_subsets** | **[str]** |  | [optional] 
**created_date** | **datetime** |  | [optional] [readonly] 
**updated_date** | **datetime** |  | [optional] [readonly] 
**status** | **bool, date, datetime, dict, float, int, list, str, none_type** |  | [optional] [readonly] 
**dimension** | **str** |  | [optional] [readonly] 
**organization** | **int, none_type** |  | [optional] [readonly] 
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


