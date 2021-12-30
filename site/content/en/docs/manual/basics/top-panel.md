---
title: 'Top Panel'
linkTitle: 'Top Panel'
weight: 7
description: 'Overview of controls available on the top panel of the annotation tool.'
---

![](/images/image035.jpg)

---

## Menu button

It is the main menu of the annotation tool. It can be used to download, upload and remove annotations.

![](/images/image051.jpg)

Button assignment:

- `Upload Annotations` — uploads annotations into a task.
- `Export as a dataset` — download a data set from a task in one of the [supported formats](/docs/manual/advanced/formats/).
  You can also enter a `Custom name` and enable the `Save images` checkbox if you want the dataset to contain images.
- `Remove Annotations` — calls the confirmation window if you click `Delete`, the annotation of the current job
  will be removed, if you click `Select range` you can remove annotation on range frames, if you activate checkbox
  `Delete only keyframe for tracks` then only keyframes will be deleted from the tracks, on the selected range.

  ![](/images/image229.jpg)

- `Open the task` — opens a page with details about the task.
- `Change job state` - changes the state of the job (`new`, `in progress`, `rejected`, `completed`).
- `Finish the job`/`Renew the job` - changes the job stage and state
  to `acceptance` and `completed` / `annotation` and `new` correspondingly.

## Save Work

Saves annotations for the current job. The button has an indication of the saving process.

![](/images/image141.jpg)

## Undo-redo buttons

Use buttons to undo actions or redo them.

![](/images/image061.jpg)

---

## Done

![](/images/image223.jpg)

Used to complete the creation of the object. This button appears only when the object is being created.

---

## Block

![](/images/image226.jpg)

Used to pause automatic line creation when drawing a polygon with 
[OpenCV Intelligent scissors](/docs/manual/advanced/opencv-tools/#intelligent-scissors).
Also used to postpone server requests when creating an object using [AI Tools](/docs/manual/advanced/ai-tools/).
When blocking is activated, the button turns blue.

---

## Player

Go to the first /the latest frames.

![](/images/image036.jpg)

Go to the next/previous frame with a predefined step. Shortcuts:
`V` — step backward, `C` — step forward. By default the step is `10` frames
(change at `Account Menu` —> `Settings` —> `Player Step`).

![](/images/image037.jpg)

The button to go to the next / previous frame has the customization possibility.
To customize, right-click on the button and select one of three options:

1. The default option - go to the next / previous frame (the step is 1 frame).
2. Go to the next / previous frame that has any objects (in particular filtered).
   Read the [filter](/docs/manual/advanced/filter/) section to know the details how to use it.
3. Go to the next / previous frame without annotation at all.
   Use this option in cases when you need to find missed frames quickly.

Shortcuts: `D` - previous, `F` - next.

![](/images/image040.jpg)

Play the sequence of frames or the set of images.
Shortcut: `Space` (change at `Account Menu` —> `Settings` —> `Player Speed`).

![](/images/image041.jpg)

Go to a specific frame. Press `~` to focus on the element.

![](/images/image060.jpg)

---

## Fullscreen Player

The fullscreen player mode. The keyboard shortcut is `F11`.

![](/images/image143.jpg)

## Info

Open the job info.

![](/images/image144_detrac.jpg)

_Overview_:

- `Assignee` - the one to whom the job is assigned.
- `Reviewer` – a user assigned to carry out the review,
  read more in the [review](/docs/manual/advanced/review) section.
- `Start Frame` - the number of the first frame in this job.
- `End Frame` - the number of the last frame in this job.
- `Frames` - the total number of all frames in the job.

_Annotations statistics_:

This is a table number of created shapes, sorted by labels (e.g. vehicle, person)
and type of annotation (shape, track). As well as the number of manual and interpolated frames.

## UI switcher

Switching between user interface modes.

![](/images/image145.jpg)
