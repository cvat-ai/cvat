---
title: 'Menu and Navigation Bar'
linkTitle: 'Menu and Navbar'
weight: 1
description: 'Features navigation arrows to switch between frames, provides access to main functions, and Menu.'
aliases:
  - /docs/manual/basics/CVAT-annotation-interface/navbar/
---

The navigation panel and drop-down **Menu**, allow you to switch
between frames, change the annotation mode, save your work, and more.

![CVAT Navbar](/images/cvat_job_menu.png)

See:

- [Menu](#menu)
- [Navigation bar](#navigation-bar)
  - [Save, Undo, Done](#save-undo-done)
  - [Navigation controls](#navigation-controls)
- [Job information and Annotation Mode switcher](#job-information-and-annotation-mode-switcher)

## Menu

Use the **Menu** options to upload and download annotations, change the status of the job,
and access other features listed in the table below:

| Panel Item              | Description              |
| ----------------------- | ------------------------ |
| **Upload annotations**  | Upload annotations into a task. |
| **Export as a dataset** | Download a dataset in one of the {{< ilink "/docs/dataset_management/formats" "supported formats" >}}. |
| **Remove annotations**  | Delete all annotations for the current job. <br> Use **Select range** to remove annotations for a specific range of frames.<br>Enable the **Delete only keyframe for tracks** checkbox to delete only keyframes from the tracks within the selected range. <br><br><center>![Remove annotations window with options and parameters](/images/image229.png)</center> |
| **Preload data** | Activates background preloading of job chunks. This feature loads data in advance to ensure smoother playback and navigation. <br>The progress of loaded chunks is displayed on the player slider, which fills with blue color as chunks are preloaded. <br>To stop preloading, click **Cancel preload**. |
| **Run actions** | Run annotation actions on the annotated dataset. {{< ilink "/docs/annotation/manual-annotation/utilities/shapes-converter" "Annotations action" >}} is a feature that allows you to modify a bulk of annotations on many frames. It supports only `shape` objects. |
| **Open the task**       | Opens a page with details about the task. |
| **Change job state**    | Changes the state of the job: <br><ul><li>**New**: The job is newly created and has not been started yet. It is waiting for annotation work to begin.<li> **In Progress**: The job is currently being worked on. Annotations are being added or edited.<li>**Rejected**: The job has been reviewed and deemed unsatisfactory or incorrect. It requires revisions and further work.<li>**Completed**: The job has been finished, reviewed, and approved. No further changes are necessary.<ul> |
| **Finish the job**      | Saves annotations and sets **job state** to **Completed**. |

## Navigation bar

Use the navigation bar to save annotation results, switch between frames,
and access other features listed in the tables below.

### Save, Undo, Done

Use the following buttons, to save your work, undo changes, and move tasks to done.

| Function                                            | Description                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Save work**<br><br>![Save icon](/images/image141.jpg)      | Saves annotations for the current job. The button indicates the saving process.                                                                                                                                                                                                                             |
| **Undo**/**Redo**<br><br>![Undo and redo icons](/images/image061.jpg) | Use buttons to undo actions or redo them.                                                                                                                                                                                                                                                                   |
| **Done**<br><br>![Done icon](/images/image223.jpg)           | Used to complete the creation of the object. This button appears only when the object is being created.                                                                                                                                                                                                     |
| **Block**<br><br>![Block icon](/images/image226.jpg)          | Used to pause automatic line creation when drawing a polygon with {{< ilink "/docs/annotation/auto-annotation/ai-tools#opencv-intelligent-scissors" "OpenCV Intelligent scissors" >}}. Also used to postpone server requests when creating an object using {{< ilink "/docs/annotation/auto-annotation/ai-tools" "AI Tools" >}}. |

### Navigation controls

Overview of how to navigate through frames within the interface,
with detailed descriptions provided in the table below.

![Navigation Controls](/images/navigation_controls.png)

| Function | Description |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Toggle chapter menu**<br><br> ![Chapter menu](/images/chapter_menu.png) | Presents the list of chapters stored in the metadata of the video file. Click on a chapter in the list to seek the player to the start frame of this chapter. <br><br>![Chapter list](/images/chapter_list.png)<br><br>Only available in video tasks and if the video file contains chapters. |
| **Go to the first**/**last frame**<br><br> ![First last frame controls](/images/image036.jpg) | Navigate to the first or the last frame of the sequence. |
| **Go back with a step**/**Go next with a step**<br><br>![Go to a step controls](/images/image037.jpg) | Move to the previous or next frame by a predefined step. <br><br>Shortcuts:<br><li>**C** — previous frame. <li>**V** — next frame. <br><br>Default step size is `10` frames. To modify this, navigate to **Nickname** > **Settings** > **Player Step**. |
| **Go back**/**Go next**<br><br>![Go back and go forth controls](/images/go_back_next.png) | Navigate to the neighboring frames. <br><br>Shortcuts:<br><li> **D** — previous frame. <li>**F** — next frame.<br><br>**Go back**/**Go next** buttons are customizable: <br><br>![User interface with customization options for "Go back" and "Go next" buttons](/images/go_back_custom.png)<br><br>To customize, right-click on the button and select one of the options (from left to right): <ol><li>The default setting moves to the next or previous frame (step size is 1 frame).</li><li>Move to the next or previous frame that contains objects (e.g. filtered). For more information, refer to {{< ilink "/docs/annotation/manual-annotation/utilities/filter" "Filters" >}}.</li><li>Move to the next or previous frame without annotations. Use this option to quickly locate missed frames.</li><li>Move to the next or previous chapter. Use this option to quickly locate relevant frames to annotate (e.g. a car you marked with a chapter mark while recording the video)</li></ol>. |
| **Play**/**Pause**<br><br>![Play and pause](/images/image041.jpg) | Switch between playing and pausing the sequence of frames or set of images. <br>Shortcut: **Space**. <br>To adjust the playback speed, go to **Nickname** > **Settings** > **Player Speed**. |
| **Go to the specific frame**<br><br>![Go to the specific frame](/images/image060.jpg) | Enter the number of the frame you want to go to and press **Enter**. |
| **Search frame by filename**<br><br>![Search frame by filename](/images/navigation_search_icon.png) | Click to open the search pop-up. Type a frame filename to search for it within the job. Select the filename and press **Enter** to navigate to the selected frame. |
| **Copy frame name**<br><br>![Copy frame name](/images/navigation_icons_copy_filename.png) | Click to copy frame name to the clipboard. |
| **Copy frame link**<br><br>![Delete frame](/images/navigation_icons_copy_link.png) | Click to copy link to the frame. |
| **Delete frame**<br><br>![Delete frame](/images/navigation_icons_delete_frame.png) | Click to delete or restore current frame. |

## Job information and Annotation Mode switcher

This section outlines various functionalities, including how to switch to the
fullscreen player mode, access job information, and use the Workspace Switcher to
toggle between different annotation and QA modes.

| Function                                                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fullscreen**<br><br>![Fullscreen](/images/image143.jpg) | The fullscreen player mode. The keyboard shortcut is **F11**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Info**<br><br>![Info](/images/image143_2.png)           | Open the job info. <br><br>![Example of a job information shown in interface](/images/image144_detrac.png)<br><br>Overview:<ul><li>**Assignee** - the individual to whom the job is assigned.</li> <li>**Reviewer**– the user tasked with conducting the review. For more information, see {{< ilink "/docs/qa-analytics/manual-qa" "**Manual QA**" >}}</li><li>**Start frame** - the number of the first frame in this job.</li><li>**Stop frame** - the number of the last frame in this job.</li><li>**Frames** - the total number of frames in the job.</li></ul><br>**Annotations Statistics** table displays the number of created shapes, categorized by labels (e.g. vehicle, person) and the type of annotation (shape, track), as well as the count of manual and interpolated frames.     |
| **Filters**<br><br>![Filters icon](/images/image143_3.png) | Switches on {{< ilink "/docs/annotation/manual-annotation/utilities/filter" "**Filters**" >}}.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Workplace Switcher**                                    | The drop-down list to switch between different annotation modes: <br><br>![User interface with opened menu for switching annotation mode](/images/ui-swithcer.png)<br><br>Overview:<ul><li>**Standard** -- default mode.</li><li>**Attribute** -- annotation with {{< ilink "/docs/annotation/manual-annotation/modes/attribute-annotation-mode-basics" "**Attributes**" >}}</li><li>**Single Shape** -- {{< ilink "/docs/annotation/manual-annotation/modes/single-shape" "**Single shape**" >}} annotation mode.</li><li>**Tag annotation**- annotation with {{< ilink "/docs/annotation/manual-annotation/modes/annotation-with-tags" "Tags" >}}</li><li>**Review** -- {{< ilink "/docs/qa-analytics/manual-qa" "**Manual QA**" >}} mode.                                                                                                                                                                               |
