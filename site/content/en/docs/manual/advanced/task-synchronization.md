---
title: 'Task synchronization with a repository'
linkTitle: 'Task synchronization'
weight: 19
---

> Notice: this feature works only if a git repository was specified when the task was created.

1. At the end of the annotation process, a task is synchronized by clicking
   `Synchronized` on the task page.

   ![](/images/image110.jpg)

1. The annotation is now in the repository in a temporary branch.
   The next step is to go to the repository and manually create a pull request to the main branch.

1. After confirming the PR, when the annotation is saved in the main branch,
   the button changes to `Merged` and is highlighted in green.

   ![](/images/image109.jpg)

If synchronization fails, the `Synchronize` button will turn red:

   ![](/images/image106.jpg)
