---
title: 'Organization'
linkTitle: 'Organization'
weight: 2
description: 'Using organization in CVAT.'
---

## Personal workspace

Your `Personal workspace` will display tasks you can access, and the tasks and projects you've created.

## Create a new organization

To create an organization, open the user menu, go to `Organization` and click `Create`.

![](/images/image233.jpg)

Fill in the required information to create your organization.
You need to enter a `Short name` of the organization, which will be displayed in the menu.
You can enter the `Full Name`, the `Description` and the contact details
of them will be visible on the organization settings page.

![](/images/image234.jpg)

## Organization page

To go to the organization page, open the user menu, go to `Organization` and click `Settings`.

![](/images/image235.jpg)

### Invite members into organization

To add members, click `Invite members`. In the window that appears,
enter the email of the user you want to add and select the role (set of rules):

- `Worker` - role for workers.
- `Supervisor` - role for supervisors.
- `Maintainer` - role for maintainers.
- `Owner` - a role assigned to the creator of the organization with maximum capabilities.

Read more about the roles in [IAM system roles section](/docs/administration/advanced/iam_system_roles).

![](/images/image236.jpg)

After you add members, they appear on your organization settings page,
with each member listed and information on when and which member added them.
You can change a member's role or remove a member at any time.

![](/images/image237.jpg)

The member can leave the organization on his own by clicking `Leave organization` on the organization settings page.

### Remove organization

You can delete an organization that you created. In order to delete an organization,
click `Remove organization`, you will be asked to confirm the deletion by entering the short name of the organization.
