# DataRequest


## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**image_quality** | **int** |  | 
**chunk_size** | **int, none_type** |  | [optional] 
**size** | **int** |  | [optional] 
**start_frame** | **int** |  | [optional] 
**stop_frame** | **int** |  | [optional] 
**frame_filter** | **str** |  | [optional] 
**compressed_chunk_type** | [**ChunkType**](ChunkType.md) |  | [optional] 
**original_chunk_type** | [**ChunkType**](ChunkType.md) |  | [optional] 
**client_files** | **[file_type]** |  | [optional]  if omitted the server will use the default value of []
**server_files** | **[str]** |  | [optional]  if omitted the server will use the default value of []
**remote_files** | **[str]** |  | [optional]  if omitted the server will use the default value of []
**use_zip_chunks** | **bool** |  | [optional]  if omitted the server will use the default value of False
**cloud_storage_id** | **int, none_type** |  | [optional] 
**use_cache** | **bool** |  | [optional]  if omitted the server will use the default value of False
**copy_data** | **bool** |  | [optional]  if omitted the server will use the default value of False
**storage_method** | [**StorageMethod**](StorageMethod.md) |  | [optional] 
**storage** | [**StorageType**](StorageType.md) |  | [optional] 
**sorting_method** | [**SortingMethod**](SortingMethod.md) |  | [optional] 
**any string name** | **bool, date, datetime, dict, float, int, list, str, none_type** | any string name can be used but the value must be the correct type | [optional]

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


