---
title: 'Data preparation on the fly'
linkTitle: 'Data preparation on the fly'
weight: 31
---

<!--lint disable heading-style-->

## Description

Data on the fly processing is a way of working with data, the main idea of which is as follows: when creating a task,
the minimum necessary meta information is collected. This meta information allows in the future to create necessary
chunks when receiving a request from a client.

Generated chunks are stored in a cache of the limited size with a policy of evicting less popular items.

When a request is received from a client, the required chunk is searched for in the cache. If the chunk does not exist
yet, it is created using prepared meta information and then put into the cache.

This method of working with data allows:

- reduce the task creation time.
- store data in a cache of the limited size with a policy of evicting less popular items.

Unfortunately, this method has several drawbacks:
- The first access to the data will take more time.
- It will not work for some videos, even if they have a valid manifest file.
  If there are not enough keyframes in the video for smooth video decoding,
  the task data chunks will be created with the default method, i.e. during the task creation.
- If the data has not been cached yet, and is not reachable during the access time,
  it cannot be retrieved.

#### How to use

To enable or disable this feature for a new task, use the
{{< ilink "/docs/manual/basics/create_an_annotation_task#use-cache" "`Use Cache`" >}}
toggle in the task configuration.

#### Uploading a manifest with data

When creating a task, you can upload a `manifest.jsonl` file along with the video or dataset with images.
You can see how to prepare it {{< ilink "/docs/manual/advanced/dataset_manifest" "here" >}}.
