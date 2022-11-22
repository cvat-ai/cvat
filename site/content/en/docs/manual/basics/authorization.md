---
title: 'Authorization'
linkTitle: 'Authorization'
weight: 1
---

To start to annotate in CVAT, you need to create an account or log in to the existing account.

To do this, use [App CVAT](https://app.cvat.ai/) page or install CVAT locally.



See:

- [User registration and account access for non-admin users](#user-registration-and-account-access-for-non-admin-users)
- [Register as a superuser](#register-as-a-superuser)


## User registration and account access for non-admin users

Open the login page:

 ![](/images/image001.jpg)

To register as a non-admin user, do the following:

1. Click **Create an account**.

   ![](/images/image002.jpg)

2. Fill in all blank fields, accept terms of use, and
   click the **Create an account** button.

  ![](/images/image003.jpg)

  <br>A username generates from the email automatically. You can edit it if needed.

  ![](/images/filling_email.gif)


> **Note**: Don't forget to modify permissions for the new user in the
  administration panel. There are several groups (roles): admin, user,
  annotator, and observer.


To access your account, do the following:

1. Go to the login page.
2. Enter username or email. The password field will appear.
3. Enter the password and click **Next**.

## Register as a superuser

To register as a superuser, you need to install CVAT locally first,
see [Installation Guide](/docs/administration/basics/installation/).

The user you register by default will not have the right to view a list of
tasks or modify permissions, thus you must create a superuser.
The superuser can use [Django administration panel](http://localhost:8080/admin)
to assign groups (roles) to other users.

Use the following command, to create a superuser:

  ```bash
    docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'
  ```

Then, use [Django administration panel](http://localhost:8080/admin) panel, to:

- Create / edit/delete users
- Control permissions of users and access to the tool.

  ![](/images/image115.jpg)
