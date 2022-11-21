---
title: 'Authorization'
linkTitle: 'Authorization'
weight: 1
---

To start to annotate in CVAT, you need to create an account or log in to the existing account.

Both options are available from the login page:

 ![](/images/image001.jpg)

See:

- [User registration and account access](#user-registration-and-account-access)
- [Register as administrator](#register-as-administrator)
- [Administration panel](#administration-panel)


## User registration and account access

To register as a non-admin user, do the following:

1. Go to the login page, and click **Create an account**.

     ![](/images/image002.jpg)

2. Fill in all blank fields, accept terms of use, and click the **Create an account** button.

  ![](/images/image003.jpg)

  <br>A username generates from the email automatically. You can edit it if needed.

  ![](/images/filling_email.gif)


> **Note**: Don't forget to modify permissions for the new user in the
  administration panel. There are several groups (aka roles): admin, user,
  annotator, and observer.


To access your account, do the following:

1. Go to the login page.
2. Enter username or email. The password field will appear.
3. Enter the password and click **Next**.

## Register as administrator

You can register a user but by default, it will not have rights even to view
the list of tasks. Thus you should create a superuser. The superuser can use
[Django administration panel](http://localhost:8080/admin) to assign correct
groups to the user. Please use the command below to create an admin account:

  ```bash
    docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

For more information, see [Installation Guide](/docs/administration/basics/installation/)

## Administration panel

Use [Django administration panel](http://localhost:8080/admin) panel, to:

- Create / edit/delete users
- Control permissions of users and access to the tool.

  ![](/images/image115.jpg)
