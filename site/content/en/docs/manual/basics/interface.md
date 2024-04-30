---
title: 'Interface of the annotation tool'
linkTitle: 'Interface'
weight: 7
---

## Main user interface

The tool consists of:

- `Header` - pinned header used to navigate CVAT sections and account settings;

- {{< ilink "/docs/manual/basics/top-panel" "`Top panel`" >}}
  — contains navigation buttons, main functions and menu access;

- {{< ilink "/docs/manual/basics/workspace" "`Workspace`" >}} — space where images are shown;

- {{< ilink "/docs/manual/basics/controls-sidebar" "`Controls sidebar`" >}}
  — contains tools for navigating the image, zoom,
  creating shapes and editing tracks (merge, split, group);

- {{< ilink "/docs/manual/basics/objects-sidebar" "`Objects sidebar`" >}} — contains label filter, two lists:
  objects (on the frame) and labels (of objects on the frame) and appearance settings.

![](/images/image034_detrac.jpg)

## Pop-up messages

![Pop-up message](/images/pop-up_message.jpg)

In CVAT, you'll receive pop-up messages in the upper-right corner, on any page.
Pop-up messages can contain useful information, links, or error messages.

### Information message

Informational messages inform about the end of the auto-annotation process.
{{< ilink "/docs/manual/advanced/automatic-annotation" "Learn more about auto-annotation" >}}.

### Jump Suggestion Messages

#### Open a task

After creating a task, you can immediately open it by clicking `Open task`.
{{< ilink "/docs/manual/basics/create_an_annotation_task" "Learn more about creating a task" >}}.

#### Continue to the frame on which the work on the job is finished

When you open a job that you previously worked on, you will receive pop-up messages with a proposal
to go to the frame that was visited before closing the tab.

### Error Messages

If you perform impossible actions, you may receive an error message.
The message may contain information about the error
or a prompt to open the browser console (shortcut `F12`) for information.
If you encounter a bug that you can't solve yourself,
you can [create an issue on GitHub](https://github.com/cvat-ai/cvat/issues/new).
