---
title: 'Superuser registration'
linkTitle: 'Superuser registration'
weight: 2
description: 'A CVAT installation guide to create a superuser.'
---

This section is for users who whant to be a bit more flexible with CVAT use.

The user you register by default does not have the right to view a list of
tasks or modify permissions, so you must create a superuser.
The superuser can use [Django administration panel](http://localhost:8080/admin)
to assign groups (roles) to other users.
<br>Available roles are: user (default), admin, worker.

### Prerequisites

Before you register an admin account (superuser), you need to install CVAT locally,
see [Installation Guide](/docs/administration/basics/installation/).

Steps of installation are partly different, depending on the type of operation system (OS).

This section starts with **Create superuser** step that is common for all OS.

### Register as a superuser

In the process of installation you need to create a superuser:

1. In the Git Bash run the following command:

```bash
  docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
```

2. Set up username, email adress, and password.
3. Go to [`localhost:8080`](http://localhost:8080), and log in with credentials from step 2.
4. (Optional) Go to [Django administration panel](http://localhost:8080/admin) panel to:
   - Create / edit/delete users
   - Control permissions of users and access to the tool.

![Django panel](/images/image115.jpg)
