---
title: 'Interface of the annotation tool'
linkTitle: 'Interface'
weight: 5
---

## Main user interface

The tool consists of:

- `Header` - pinned header used to navigate CVAT sections and account settings;

- [`Top panel`](/docs/manual/basics/top-panel/) — contains navigation buttons, main functions and menu access;

- [`Workspace`](/docs/manual/basics/workspace/) — space where images are shown;

- [`Controls sidebar`](/docs/manual/basics/controls-sidebar/) — contains tools for navigating the image, zoom,
  creating shapes and editing tracks (merge, split, group);

- [`Objects sidebar`](/docs/manual/basics/objects-sidebar/) — contains label filter, two lists:
  objects (on the frame) and labels (of objects on the frame) and appearance settings.

![](/images/image034_detrac.jpg)

## Pop-up messages

![Pop-up message](/images/pop-up_message.jpg)

In CVAT, you'll receive pop-up messages in the upper-right corner, on any page.
Pop-up messages can contain useful information, links, or error messages.

### Information message

Informational messages inform about the end of the auto-annotation process.
[Learn more about auto-annotation](/docs/manual/advanced/automatic-annotation/).

### Jump Suggestion Messages

#### Open a task

After creating a task, you can immediately open it by clicking `Open task`.
[Learn more about creating a task](/docs/manual/basics/creating_an_annotation_task/).

#### Continue to the frame on which the work on the job is finished

When you open a job that you previously worked on, you will receive pop-up messages with a proposal
to go to the frame that was visited before closing the tab.

### Error Messages

If you perform impossible actions, you may receive an error message.
The message may contain information about the error
or a prompt to open the browser console (shortcut `F12`) for information.
If you encounter a bug that you can't solve yourself,
you can [create an issue on GitHub](https://github.com/openvinotoolkit/cvat/issues/new).
