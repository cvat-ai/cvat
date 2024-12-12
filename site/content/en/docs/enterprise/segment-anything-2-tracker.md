---
title: 'Segment Anything 2 Tracker'
linkTitle: 'Segment Anything 2 Tracker'
weight: 6
description: 'Accelerating video labeling using SAM2 model'
---

## Overview

Segment Anything 2 is a segmentation model that allows fast and precise selection of any object in videos or images.
For enterprise customers, this model can be installed in their self-hosted solution. To ensure a good experience,
it is strongly recommended to deploy the model using a GPU. Although it is possible to use a CPU-based version,
it generally performs much slower and is suitable only for handling a single parallel request. Unlike a regular
tracking model, the SAM 2 tracker is implemented as an annotation action. This allows it to be applied to existing
objects (polygons and masks) to track them forward for a specified number of frames.

## How to install

> **Note**: This feature is not available in the community CVAT version.

> **Note**: This feature requires the enhanced actions UI plugin, which is enabled by default.
Usually, no additional steps are necessary on this.

### Docker

You can use existing scripts from the community repository
(`./serverless/deploy_cpu.sh` or `./serverless/deploy_gpu.sh`).
To deploy the feature, simply run:

```sh
./serverless/deploy_gpu.sh "path/to/the/function"
```

### Kubernetes

- You need to deploy the Nuclio function manually.
Note that this function requires a Redis storage configured to keep the tracking state.
You may use the same storage as `cvat_redis_ondisk` uses.
When running the `nuclio deploy` command, make sure to provide the necessary arguments.
The minimal command is:

```sh
nuctl deploy "path/to/the/function"
  --env CVAT_FUNCTIONS_REDIS_HOST="<redis_host>"
  --env CVAT_FUNCTIONS_REDIS_PORT="<redis_port>"
  --env CVAT_FUNCTIONS_REDIS_PASSWORD="<redis_password>" # if applicable
```

## Running on an object

The tracker can be applied to any polygons and masks. To run the tracker on an object, open the object menu and click
"Run annotation action".

<img src="/images/sam2_tracker_run_shape_action.png" style="max-width: 200px; padding: 16px;">

Alternatively, you can use a hotkey: select the object and press **Ctrl + E** (default shortcut).
When the modal opened, in "Select action" list, choose **Segment Anything 2: Tracker**:

<img src="/images/sam2_tracker_run_shape_action_modal.png" style="max-width: 500px; padding: 16px;">

Specify the **target frame** until which you want the object to be tracked,
then click the **Run** button to start tracking. The process begins and may take some time to complete.
The duration depends on the inference device, and the number of frames where the object will be tracked.

<img src="/images/sam2_tracker_run_shape_action_modal_progress.png" style="max-width: 500px; padding: 16px;">

Once the process is complete, the modal window closes. You can review how the object was tracked.
If you notice that the tracked shape deteriorates at some point,
you can adjust the object coordinates and run the tracker again from that frame.

## Running on multiple objects

Instead of tracking each object individually, you can track multiple objects
simultaneously. To do this, click the **Menu** button in the annotation view and select the **Run Actions** option:

<img src="/images/sam2_tracker_run_action.png" style="max-width: 200px; padding: 16px;">

Alternatively, you can use a hotkey: just press **Ctrl + E** (default shortcut) when there are no objects selected.
This opens the actions modal. In this case, the tracker will be applied to all visible objects of suitable types
(polygons and masks). In the action list of the opened model, select **Segment Anything 2: Tracker**:

<img src="/images/sam2_tracker_run_action_modal.png" style="max-width: 500px; padding: 16px;">

Specify the **target frame** until which you want the objects to be tracked,
then click the **Run** button to start tracking. The process begins and may take some time to complete.
The duration depends on the inference device, the number of simultaneously tracked objects,
and the number of frames where the object will be tracked.

<img src="/images/sam2_tracker_run_action_modal_progress.png" style="max-width: 500px; padding: 16px;">

Once the process finishes, you may close the modal and review how the objects were tracked.
If you notice that the tracked shapes deteriorate, you can adjust their
coordinates and run the tracker again from that frame (for a single object or for many objects).


## Tracker parameters

- **Target frame**: Objects will be tracked up to this frame. Must be greater than the current frame
- **Convert polygon shapes to tracks**: When enabled, all visible polygon shapes in the current frame will be converted
to tracks before tracking begins. Use this option if you need tracks as the final output but started with shapes,
produced for example by interactors (e.g. SAM2 or another one).
