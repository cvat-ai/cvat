---
title: 'Navigation bar & Menu'
linkTitle: 'Navigation bar & Menu'
weight: 1
description: 'Features navigation arrows to switch between frames, provides access to main functions, and Menu.'
---

The navigation panel and drop-down **Menu**, allow you to switch
between frames, change the annotation mode, save your work, and more.

![CVAT Navbar](/images/image035.png)

See:

- [Menu](#menu)
- [Navigation bar](#navigation-bar)
  - [Save, Undo, Done](#save-undo-done)
  - [Navigation controls](#navigation-controls)
- [Job information and Annotation Mode switcher](#job-information-and-annotation-mode-switcher)

## Menu

Use the **Menu** options to upload and download annotations, change the status of the job,
and access other features listed in the table below:

<!--lint disable maximum-line-length-->

| Panel Item                             | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Upload annotations**                 | Upload annotations into a task.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Export as a dataset**                | Download a dataset in one of the {{< ilink "/docs/manual/advanced/formats" "supported formats" >}}.                                                                                                                                                                                                                                                                                                                                                                                            |
| **Remove annotations**                 | Delete all annotations for the current job. <br> Use **Select range** to remove annotations for a specific range of frames.<br>Enable the **Delete only keyframe for tracks** checkbox to delete only keyframes from the tracks within the selected range. <br><br><center>![](/images/image229.png)</center>                                                                                                                                                                                  |
| **Run actions**                        | Run annotation actions on the annotated dataset. [Annotations action](/docs/enterprise/shapes-converter/) is a feature that allows you to modify a bulk of annotations on many frames. It supports only `shape` objects.                                                                                                                                                                                                                                                                       |
| **Open the task**                      | Opens a page with details about the task.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Change job state**                   | Changes the state of the job: <br><ul><li>**New**: The job is newly created and has not been started yet. It is waiting for annotation work to begin.<li> **In Progress**: The job is currently being worked on. Annotations are being added or edited.<li>**Rejected**: The job has been reviewed and deemed unsatisfactory or incorrect. It requires revisions and further work.<li>**Completed**: The job has been finished, reviewed, and approved. No further changes are necessary.<ul>  |
| **Finish the job** | Saves annotations and sets **job state** to **Completed**. |

<!--lint enable maximum-line-length-->

## Navigation bar

Use the navigation bar to save annotation results, switch between frames,
and access other features listed in the tables below.

<!--lint disable maximum-line-length-->

### Save, Undo, Done

Use the following buttons, to save your work, undo changes, and move tasks to done.

| Function                                            | Description                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Save work**<br><br>![](/images/image141.jpg)      | Saves annotations for the current job. The button indicates the saving process.                                                                                                                                                                                                                             |
| **Undo**/**Redo**<br><br>![](/images/image061.jpg)  | Use buttons to undo actions or redo them.                                                                                                                                                                                                                                                                   |
| **Done**<br><br>![](/images/image223.jpg)           | Used to complete the creation of the object. This button appears only when the object is being created.                                                                                                                                                                                                     |
| **Block**<br><br>![](/images/image226.jpg)          | Used to pause automatic line creation when drawing a polygon with {{< ilink "/docs/manual/advanced/ai-tools#opencv-intelligent-scissors" "OpenCV Intelligent scissors" >}}. Also used to postpone server requests when creating an object using {{< ilink "/docs/manual/advanced/ai-tools" "AI Tools" >}}.  |

### Navigation controls

Overview of how to navigate through frames within the interface,
with detailed descriptions provided in the table below.

![Navigation Controls](/images/navigation_controls.png)

| Function | Description |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Go to the first**/**last frame**<br><br> ![First last frame controls](/images/image036.jpg) | Navigate to the first or the last frame of the sequence. |
| **Go back with a step**/**Go next with a step**<br><br>![Go to a step controls](/images/image037.jpg) | Move to the previous or next frame by a predefined step. <br><br>Shortcuts:<br><li>**C** — previous frame. <li>**V** — next frame. <br><br>Default step size is `10` frames. To modify this, navigate to **Nickname** > **Settings** > **Player Step**. |
| **Go back**/**Go next**<br><br>![Go back and go forth controls](/images/go_back_next.png) | Navigate to the neighboring frames. <br><br>Shortcuts:<br><li> **D** — previous frame. <li>**F** — next frame.<br><br>**Go back**/**Go next** buttons are customizable: <br><br>![](/images/go_back_custom.png)<br><br>To customize, right-click on the button and select one of three options (left to right): <ol><li>The default setting moves to the next or previous frame (step size is 1 frame).</li><li>Move to the next or previous frame that contains objects (e.g., filtered). For more information, refer to [Filters](/docs/manual/advanced/filter).</li><li>Move to the next or previous frame without annotations. Use this option to quickly locate missed frames.</li></ol>. |
| **Play**/**Pause**<br><br>![Play and pause](/images/image041.jpg) | Switch between playing and pausing the sequence of frames or set of images. <br>Shortcut: **Space**. <br>To adjust the playback speed, go to **Nickname** > **Settings** > **Player Speed**. |
| **Go to the specific frame**<br><br>![Go to the specific frame](/images/image060.jpg) | Enter the number of the frame you want to go to and press **Enter**. |
| **Copy frame name**<br><br>![Copy frame name](/images/navigation_icons_copy_filename.png) | Click to copy frame name to the clipboard. |
| **Copy frame link**<br><br>![Delete frame](/images/navigation_icons_copy_link.png) | Click to copy link to the frame. |
| **Delete frame**<br><br>![Delete frame](/images/navigation_icons_delete_frame.png) | Click to delete or restore current frame. |

## Job information and Annotation Mode switcher

This section outlines various functionalities, including how to switch to the
fullscreen player mode, access job information, and use the Workspace Switcher to
toggle between different annotation and QA modes.

| Function                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fullscreen**<br><br>![Fullscreen](/images/image143.jpg) | The fullscreen player mode. The keyboard shortcut is **F11**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Info**<br><br>![Info](/images/image143_2.png)           | Open the job info. <br><br>![](/images/image144_detrac.png)<br><br>Overview:<ul><li>**Assignee** - the individual to whom the job is assigned.</li> <li>**Reviewer**– the user tasked with conducting the review. For more information, see [**Manual QA**](/docs/manual/advanced/analytics-and-monitoring/manual-qa")</li><li>**Start frame** - the number of the first frame in this job.</li><li>**Stop frame** - the number of the last frame in this job.</li><li>**Frames** - the total number of frames in the job.</li></ul><br>**Annotations Statistics** table displays the number of created shapes, categorized by labels (e.g., vehicle, person) and the type of annotation (shape, track), as well as the count of manual and interpolated frames.     |
| **Filters**<br><br>![](/images/image143_3.png)            | Switches on [**Filters**](/docs/manual/advanced/filter/).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Workplace Switcher**                                           | The drop-down list to switch between different annotation modes: <br><br>![](/images/ui-swithcer.png)<br><br>Overview:<ul><li>**Standard** -- default mode.</li><li>**Attribute** -- annotation with [**Attributes**](docs/manual/advanced/attribute-annotation-mode-advanced/)</li><li>**Single Shape** -- [**Single shape**](/docs/manual/advanced/single-shape/) annotation mode.</li><li>**Tag annotation**- annotation with [Tags](/docs/manual/advanced/annotation-with-tags/)</li><li>**Review** -- [**Manual QA**](/manual/advanced/analytics-and-monitoring/manual-qa/) mode.                                                                                                                                                                               |

<!--lint enable maximum-line-length-->
