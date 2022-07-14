# IssueWriteRequest

Adds support for write once fields to serializers.  To use it, specify a list of fields as `write_once_fields` on the serializer's Meta: ``` class Meta:     model = SomeModel     fields = '__all__'     write_once_fields = ('collection', ) ```  Now the fields in `write_once_fields` can be set during POST (create), but cannot be changed afterwards via PUT or PATCH (update). Inspired by http://stackoverflow.com/a/37487134/627411.

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**frame** | **int** |  | 
**position** | **[float]** |  | 
**job** | **int** |  | 
**message** | **str** |  | 
**assignee** | **int, none_type** |  | [optional] 
**resolved** | **bool** |  | [optional] 
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


