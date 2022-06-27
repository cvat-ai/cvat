# Task

Adds support for write once fields to serializers.  To use it, specify a list of fields as `write_once_fields` on the serializer's Meta: ``` class Meta:     model = SomeModel     fields = '__all__'     write_once_fields = ('collection', ) ```  Now the fields in `write_once_fields` can be set during POST (create), but cannot be changed afterwards via PUT or PATCH (update). Inspired by http://stackoverflow.com/a/37487134/627411.

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**url** | **str** |  | [optional] [readonly] 
**id** | **int** |  | [optional] [readonly] 
**project_id** | **int, none_type** |  | [optional] 
**mode** | **str** |  | [optional] [readonly] 
**owner** | [**BasicUser**](BasicUser.md) |  | [optional] 
**assignee** | [**CommentReadOwner**](CommentReadOwner.md) |  | [optional] 
**bug_tracker** | **str** |  | [optional] 
**created_date** | **datetime** |  | [optional] [readonly] 
**updated_date** | **datetime** |  | [optional] [readonly] 
**overlap** | **int, none_type** |  | [optional] 
**segment_size** | **int** |  | [optional] 
**status** | **bool, date, datetime, dict, float, int, list, str, none_type** |  | [optional] [readonly] 
**labels** | [**[Label]**](Label.md) |  | [optional] 
**segments** | [**[Segment]**](Segment.md) |  | [optional] [readonly] 
**data_chunk_size** | **int, none_type** |  | [optional] [readonly] 
**data_compressed_chunk_type** | **bool, date, datetime, dict, float, int, list, str, none_type** |  | [optional] [readonly] 
**data_original_chunk_type** | **bool, date, datetime, dict, float, int, list, str, none_type** |  | [optional] [readonly] 
**size** | **int** |  | [optional] [readonly] 
**image_quality** | **int** |  | [optional] [readonly] 
**data** | **int** |  | [optional] [readonly] 
**dimension** | **str** |  | [optional] 
**subset** | **str** |  | [optional] 
**organization** | **int, none_type** |  | [optional] [readonly] 
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


