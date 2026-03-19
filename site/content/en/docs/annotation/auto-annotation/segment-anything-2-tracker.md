---
title: 'Segment Anything 2 Tracker'
linkTitle: 'Segment Anything 2 Tracker'
weight: 2
description: 'Accelerating video labeling using SAM2 model'
aliases:
  - /docs/enterprise/segment-anything-2-tracker/
---

## Overview

Segment Anything 2 is a segmentation model that allows fast and precise selection of any object in videos or images.
SAM2 tracking is available in two implementations:

1. **Nuclio SAM2 Tracker**: Available only for Enterprise deployments.
This is implemented as a serverless function deployed via Nuclio framework.

1. **AI Agent SAM2 Tracker**: Available for CVAT Online and Enterprise via auto-annotation (AA) functions
that run on user-side agents. This brings SAM2 tracking capabilities to CVAT Online users who previously
couldn't access this feature.

It is strongly recommended to deploy the model using a GPU. Although it is possible to use a CPU-based version,
it generally performs much slower and is suitable only for handling a single parallel request.
The AI agent variant runs on user hardware, providing flexibility for GPU usage without
server configuration requirements.

Unlike a regular tracking model, both SAM2 tracker implementations are designed to be applied
to existing objects (polygons and masks) to track them forward for a specified number of frames.

## How to install

Choose the installation method based on your platform and deployment needs.

{{% alert title="Note" color="primary" %}}
Nuclio SAM2 Tracker is only available in the Enterprise version.
The AI agent variant brings SAM2 tracking to CVAT Online and Enterprise.
{{% /alert %}}

{{% alert title="Note" color="primary" %}}
Both tracker implementations require the enhanced actions UI plugin, which is enabled by default.
Usually, no additional steps are necessary on this.
{{% /alert %}}

### Nuclio SAM2 Tracker (CVAT Enterprise)

#### Docker

You can use existing scripts from the community repository
(`./serverless/deploy_cpu.sh` or `./serverless/deploy_gpu.sh`).
To deploy the feature, simply run:

```sh
./serverless/deploy_gpu.sh "path/to/the/function"
```

#### Kubernetes

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

### AI Agent SAM2 Tracker (CVAT Online + Enterprise)

The AI agent implementation enables SAM2 tracking for CVAT Online users and provides an alternative deployment method
for Enterprise customers. This approach runs the tracking model on user hardware via auto-annotation (AA) functions.

#### Prerequisites

- Python 3.10 or later
- Git
- CVAT Online account or Enterprise instance
- Optional: NVIDIA GPU with CUDA support for faster inference

#### Setup Instructions

1. Clone the CVAT repository:
   ```sh
   git clone https://github.com/cvat-ai/cvat.git <CVAT_DIR>
   ```

1. Install required dependencies:
   ```sh
   pip install cvat-cli -r <CVAT_DIR>/ai-models/tracker/sam2/requirements.txt
   ```

   {{% alert title="Note" color="info" %}}
   If you encounter issues installing SAM2, refer to the
   [SAM2 installation guide](https://github.com/facebookresearch/sam2/blob/main/INSTALL.md#common-installation-issues)
   for solutions to common problems.
   {{% /alert %}}

1. Register the SAM2 function with CVAT:
   ```sh
   cvat-cli --server-host <CVAT_BASE_URL> --auth <USERNAME>:<PASSWORD> \
       function create-native "SAM2" \
       --function-file=<CVAT_DIR>/ai-models/tracker/sam2/func.py -p model_id=str:<MODEL_ID>
   ```

1. Run the AI agent:
   ```sh
   cvat-cli --server-host <CVAT_BASE_URL> --auth <USERNAME>:<PASSWORD> \
       function run-agent <FUNCTION_ID> \
       --function-file=<CVAT_DIR>/ai-models/tracker/sam2/func.py -p model_id=str:<MODEL_ID>
   ```

#### Parameter Reference

- `<CVAT_BASE_URL>`: Your CVAT instance URL (e.g., `https://app.cvat.ai`)
- `<USERNAME>` and `<PASSWORD>`: Your CVAT credentials
- `<FUNCTION_ID>`: The ID returned by the `function create-native` command
- `<MODEL_ID>`: A [SAM2 model ID](https://huggingface.co/models?search=facebook%2Fsam2) from Hugging Face Hub (e.g., `facebook/sam2.1-hiera-tiny`)

#### Optional Parameters

- **GPU Support**: Add `-p device=str:cuda` to the agent command to use NVIDIA GPU acceleration
- **Organization Sharing**: Add `--org <ORG_SLUG>` to both commands to share the function with your organization

#### Agent Behavior and Resilience

The AI agent runs as a persistent process on your hardware, providing several advantages:

- **Hardware Independence**: Runs outside the CVAT server, enabling tracking without server-side GPU/Nuclio installation
- **Isolation**: Agent crashes don't affect the server; requests are retried or reassigned automatically
- **Resource Control**: You control the computational resources (CPU/GPU) used for tracking

{{% alert title="Important" color="warning" %}}
Keep the agent process running to handle tracking requests.
If the agent stops, active tracking operations will fail and need to be restarted.
{{% /alert %}}

## Version Requirements

- **AI Agent SAM2 Tracker**: Requires CVAT version 2.42.0 or later
- **Classic SAM2 Tracker**: Available in all Enterprise versions
- **Python**: Version 3.10 or later for AI agent setup
- **GPU Support**: Optional but recommended for both implementations

## Usage

Both SAM2 tracker implementations provide similar user experiences with slight differences in the UI labels.

### Running the Nuclio SAM2 Tracker

The nuclio tracker can be applied to any polygons and masks.
To run the tracker on an object, open the object menu and click
**Run annotation action**.

<img src="/images/sam2_tracker_run_shape_action.png" style="max-width: 200px; padding: 16px;">

Alternatively, you can use a hotkey: select the object and press **Ctrl + E** (default shortcut).
When the modal opened, in "Select action" list, choose **Segment Anything 2: Tracker**:

<img src="/images/sam2_tracker_run_shape_action_modal.png" style="max-width: 500px; padding: 16px;">

### Running the AI Agent SAM2 Tracker

Once you have registered the SAM2 AI agent and it's running,
you'll see **"AI Tracker: SAM2"** as an available action in the annotation UI for video shape tracking.

To use the AI agent tracker:

1. Create or open a CVAT task from a video file or video-like sequence of images
(all images must have the same dimensions)
1. Open one of the jobs from the task
1. Draw a mask or polygon around an object
1. Right-click the object and choose "Run annotation action"
1. Select **"AI Tracker: SAM2"** from the action list
1. Specify the target frame and click **Run**

The usage flow parallels the existing annotation action interface but utilizes the remote AI agent
rather than built-in serverless functions.

### Tracking Process

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
(polygons and masks). In the action list of the opened modal, select either:

- **Segment Anything 2: Tracker** (for the nuclio implementation)
- **AI Tracker: SAM2** (for the AI agent implementation)

<img src="/images/sam2_tracker_run_action_modal.png" style="max-width: 500px; padding: 16px;">

Specify the **target frame** until which you want the objects to be tracked,
then click the **Run** button to start tracking. The process begins and may take some time to complete.
The duration depends on the inference device, the number of simultaneously tracked objects,
and the number of frames where the objects will be tracked.

<img src="/images/sam2_tracker_run_action_modal_progress.png" style="max-width: 500px; padding: 16px;">

Once the process finishes, you may close the modal and review how the objects were tracked.
If you notice that the tracked shapes deteriorate, you can adjust their
coordinates and run the tracker again from that frame (for a single object or for many objects).

## Limitations and Considerations

### AI Agent Limitations

When using the AI agent implementation, keep in mind:

- **Single Agent Constraint**: Only one agent can run at a time for any given tracking function.
Running multiple agents may cause random failures as they compete for tracking states.
- **Memory-based State**: Tracking states are kept in agent memory.
If the agent crashes or is shut down, all tracking states are lost and active tracking processes will fail.
- **Agent-only Usage**: Tracking functions can only be used via agents.
There is no equivalent of the `cvat-cli task auto-annotate` command for tracking.
- **Rectangle Limitation**: When using the AI Tools dialog (sidebar),
only tracking functions that support rectangles will be selectable.
The SAM2 tracker supports polygons and masks but not rectangles.
- **Skeleton Tracking**: Skeletons cannot currently be tracked by either implementation.


## Tracker parameters

- **Target frame**: Objects will be tracked up to this frame. Must be greater than the current frame
- **Convert polygon shapes to tracks**: When enabled, all visible polygon shapes in the current frame will be converted
to tracks before tracking begins. Use this option if you need tracks as the final output but started with shapes,
produced for example by interactors (e.g. SAM2 or another one).

## See Also

- [SAM2 Object Tracking via AI Agent (Blog, July 31, 2025)](https://www.cvat.ai/resources/blog/sam2-ai-agent-tracking) -
Detailed implementation and background information
- [Auto-annotation Functions Documentation](https://docs.cvat.ai/docs/api_sdk/sdk/auto-annotation/) -
Reference for creating custom tracking functions
- [CVAT CLI Examples](https://docs.cvat.ai/docs/api_sdk/cli/#examples---functions) - Additional CLI usage examples
