# Data preparation on the fly

## Description

Data on the fly processing is a way of working with data, the main idea of which is as follows:
Minimum necessary meta information is collected, when task is created.
This meta information allows in the future to create a necessary chunks when receiving a request from a client.

Generated chunks are stored in a cache of limited size with a policy of evicting less popular items.

When a request received from a client, the required chunk is searched for in the cache.
If the chunk does not exist yet, it is created using a prepared meta information and then put into the cache.

This method of working with data allows:

- reduce the task creation time.
- store data in a cache of limited size with a policy of evicting less popular items.

## Prepare meta information

Different meta information is collected for different types of uploaded data.

### Video

For video, this is a valid mapping of key frame numbers and their timestamps. This information is saved to `meta_info.txt`.

Unfortunately, this method will not work for all videos with valid meta information.
If there are not enough keyframes in the video for smooth video decoding, the task will be created in the old way.

#### Uploading meta information along with data

When creating a task, you can upload a file with meta information along with the video,
which will further reduce the time for creating a task.
You can see how to prepare meta information [here](/utils/prepare_meta_information/README.md).

It is worth noting that the generated file also contains information about the number of frames in the video at the end.

### Images

Mapping of chunk number and paths to images that should enter the chunk
is saved at the time of creating a task in a files `dummy_{chunk_number}.txt`
