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
Of them will be visible on the organization settings page.

![](/images/image234.jpg)

## Organization page

To go to the organization page, open the user menu, go to `Organization` and click `Settings`.

![](/images/image235.jpg)

### Invite members into organization

To add members, click `Invite members`. In the window that appears,
enter the email of the user you want to add and select the role (the role defines a set of rules):

- `Worker` - workers have only access to tasks, projects, and jobs, assigned to them.
- `Supervisor` - this role allows you to create and assign jobs, tasks and projects to members of the organization.
- `Maintainer` - a member with this role has all the capabilities of the role supervisor,
  sees all the tasks and the projects created by other members of the organization,
  has full access to the `Cloud Storages` feature, and can modify members and their roles.
- `Owner` - a role assigned to the creator of the organization with maximum capabilities.

In addition to roles, there are groups of users that are configured on the `Admin page`.
Read more about the roles in [IAM system roles section](/docs/administration/advanced/iam_system_roles).

![](/images/image236.jpg)

After you add members, they will appear on your organization settings page,
with each member listed and information about invitation details.
You can change a member's role or remove a member at any time.

![](/images/image237.jpg)

The member can leave the organization on his own by clicking `Leave organization` on the organization settings page.

### Remove organization

You can remove an organization that you created.
Deleting an organization will delete all related resources (annotations, jobs, tasks, projects, cloud storages, ..).
In order to remove an organization, click `Remove organization`,
you will be asked to confirm the deletion by entering the short name of the organization.
