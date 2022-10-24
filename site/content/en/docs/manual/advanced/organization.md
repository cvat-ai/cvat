---
title: 'Organization'
linkTitle: 'Organization'
weight: 2
description: 'Using organization in CVAT.'
---

## Personal workspace

Your `Personal workspace` will display the tasks and projects you've created.

## Create a new organization

To create an organization, open the user menu, go to `Organization` and click `Create`.

![](/images/image233.jpg)

Fill in the required information to create your organization.
You need to enter a `Short name` of the organization, which will be displayed in the menu.
You can specify other fields: `Full Name`, `Description` and the organization contacts.
All of those will be visible on the organization settings page.

![](/images/image234.jpg)

## Organization page

To go to the organization page, open the user menu, go to `Organization` and click `Settings`.

![](/images/image235.jpg)

### Invite members into organization

To add members, click `Invite members`. In the window that appears,
enter the email of an already registered user that you want to add and select the role you want to assign (each role has a different set of rights):

- `Worker` - workers only have access to tasks, projects, and jobs assigned to them.
- `Supervisor` - this role allows users to create jobs, tasks, and projects and assign them to members of the organization.
- `Maintainer` - a member with this role has all the permissions of the supervisor role,
  can view all the tasks and projects created by other members of the organization,
  has full access to the `Cloud Storages` feature, and can delete or add members and assign roles to them.
- `Owner` - this role is assigned only to the creator of the organization and has maximum capabilities.

In addition to roles, there are groups of users that are configured on the `Admin page`.
Read more about the roles in [IAM system roles section](/docs/administration/advanced/iam_system_roles).

![](/images/image236.jpg)

After you add new members, they will appear on your organization settings page.
This list contains usernames, names and roles of all the members, as well as additional info on when were they invited and who has sent an invitation.
You, as an Owner, can change a member's role or remove a member at any time. This may also be done by Maintainers to any member with Worker/Supervisor role.

![](/images/image237.jpg)

Any member other than the Owner can leave the organization on his own by clicking `Leave organization` on the organization settings page.

### Remove organization

You can remove an organization that you have created.
Removing an organization will delete all related resources (annotations, jobs, tasks, projects, cloud storages, etc.).
In order to remove an organization, click `Remove organization` on its settings page.
After that you will be asked to confirm this action by entering the short name of the organization.
