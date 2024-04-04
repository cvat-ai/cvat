---
title: 'Superuser registration'
linkTitle: 'Superuser registration'
weight: 2
description: 'A CVAT installation guide to create a superuser.'
---

This section is for users who want to be a bit more flexible with CVAT use.

The user you register by default does not have full permissions on the instance,
so you must create a superuser.
The superuser can use [Django administration panel](http://localhost:8080/admin)
to assign groups (roles) to other users.
<br>Available roles are: user (default), admin, business, worker.

### Prerequisites

Before you register an admin account (superuser), you need to install CVAT locally,
see {{< ilink "/docs/administration/basics/installation" "Installation Guide" >}}.

Steps of installation are partly different, depending on the type of operation system (OS).

This section starts with **Create superuser** step that is common for all OS.

### Register as a superuser

In the process of installation you need to create a superuser:

1. In a terminal run the following command:

```bash
  docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
```

2. Set up username, email address, and password.
3. Go to [`localhost:8080`](http://localhost:8080), and log in with credentials from step 2.
4. (Optional) Go to [Django administration panel](http://localhost:8080/admin) panel to:
   - Create/edit/delete users
   - Control permissions of users and access to the tool.

![Django panel](/images/image115.jpg)

To manage users' permission, in the [Django administration panel](http://localhost:8080/admin):

1. On the left menu click **Users**.
2. On the main pane click **Admin** and scroll down to **Permissions** section.
3. Select user groups and add/remove permissions.
