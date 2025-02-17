---
title: 'Organization'
linkTitle: 'Organization'
weight: 2
description: 'Using organization in CVAT.'
---

**Organization** is a feature for teams of several users
who work together on projects and share tasks.

Create an **Organization**, invite your team members, and assign
roles to make the team work better on shared tasks.

See:

- [Personal workspace](#personal-workspace)
- [Create new organization](#create-new-organization)
  - [Switching between organizations](#switching-between-organizations)
- [Organization page](#organization-page)
- [Invite members into organization: menu and roles](#invite-members-into-organization-menu-and-roles)
  - [Inviting members to Organization](#inviting-members-to-organization)
  - [Invitations list](#invitations-list)
  - [Resending and removing invitations](#resending-and-removing-invitations)
- [Delete organization](#delete-organization)

## Personal workspace

The account's default state is activated when no **Organization** is selected.

If you do not select an **Organization**, the system links all new resources directly
to your personal account, that inhibits resource sharing with others.

When **Personal workspace** is selected, it will be marked with a tick in the menu.

![](/images/personal_account.jpg)

## Create new organization

To create an organization, do the following:

1. Log in to the CVAT.
2. On the top menu, click your **Username** > **Organization** > **+ Create**.

   ![](/images/image233.jpg)

3. Fill in the following fields and click **Submit**.

   ![](/images/image234.jpg)

<!--lint disable maximum-line-length-->

| Field            | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| **Short name**   | A name of the organization that will be displayed in the CVAT menu. |
| **Full Name**    | Optional. Full name of the organization.                            |
| **Description**  | Optional. Description of organization.                              |
| **Email**        | Optional. Your email.                                               |
| **Phone number** | Optional. Your phone number.                                        |
| **Location**     | Optional. Organization address.                                     |

<!--lint enable maximum-line-length-->

Upon creation, the organization page will open automatically.

For future access to your organization,
navigate to **Username** > **Organization**

> **Note**, that if you've created more than 10 organizations,
> a **Switch organization** line will appear in the drop-down menu.

### Switching between organizations

If you have more than one **Organization**,
it is possible to switch between these **Organizations** at any given time.

Follow these steps:

1. In the top menu, select your **Username** > **Organization**.
2. From the drop-down menu, under the **Personal space** section,
   choose the desired **Organization**.

![](/images/image233_1.jpg)

> **Note**, that if you've created more than 10 organizations,
> a **Switch organization** line will appear in the drop-down menu.

![](/images/switch_org.png)

Click on it to see the **Select organization** dialog, and select organization
from drop-down list.

![](/images/select_org.png)

## Organization page

**Organization page** is a place, where you can edit the **Organization** information
and manage **Organization** members.

![](/images/orgpage.jpg)

> **Note** that in order to access the organization page, you must first activate
> the organization (see [Switching between organizations](#switching-between-organizations)).
> Without activation, the organization page will remain inaccessible.
> <br>An organization is considered activated when it's ticked in the drop-down menu
> and its name is visible in the top-right corner under the username.

To go to the **Organization page**, do the following:

1. On the top menu, click your **Username** > **Organization**.
2. In the drop-down menu, select **Organization**.
3. In the drop-down menu, click **Settings**.

![](/images/image235.jpg)

## Invite members into organization: menu and roles

Invite members form is available from [Organization page](#organization-page).

It has the following fields:

![](/images/invitemembers.jpg)

<!--lint disable maximum-line-length-->

| Field               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email**           | Specifies the email address of the user who is being added to the **Organization**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Role drop-down list | Defines the role of the user which sets the level of access within the **Organization**: <br><li>**Worker**: Has access only to the tasks, projects, and jobs assigned to them. <li>**Supervisor**: Can create and assign jobs, tasks, and projects to the **Organization** members. <li>**Maintainer**: Has the same capabilities as the **Supervisor**, but with additional visibility over all tasks and projects created by other members, complete access to **Cloud Storages**, and the ability to modify members and their roles. <li>**Owner**: role assigned to the creator of the organization by default. Has maximum capabilities and cannot be changed or assigned to the other user. |
| **Invite more**     | Button to add another user to the **Organization**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

<!--lint enable maximum-line-length-->

Members of **Organization** will appear on the **Organization page**:

![](/images/image237.jpg)

The member of the organization can leave the organization
by going to **Organization page** > **Leave organization**.

### Inviting members to Organization

To invite members to **Organization** do the following:

1. Go to the [**Organization page**](#organization-page), and click **Invite members**.
2. Fill in the form (see below).

   ![](/images/image236.jpg)

3. Click **Ok**.
4. The person being invited will receive an email with the link.

   ![](/images/invitation_to_org.jpg)

5. Person must click the link and:
   1. If the invitee does not have the CVAT account, then
      {{< ilink "/docs/manual/basics/registration#user-registration" "**set up an account**" >}}.
   2. If the invitee has a CVAT account, then log in to the account.

### Invitations list

User can see the list of active invitations.

To see the list, Go to **Username** > **Organization** > **Invitations**.

![](/images/invitations_list.jpg)

You will see the page with the list of invitations.


You will also see pop-up notification the link to the page with
invitations list.

### Resending and removing invitations

The organization owner and maintainers can remove members, by
clicking on the three dots, and selecting **Remove invitation**

![](/images/resend-remove-invitation.jpg)

The organization owner can remove members, by
clicking on the **Bin** icon.

## Delete organization

You can remove an organization that you created.

> **Note**: Removing an organization will delete all related resources (annotations,
> jobs, tasks, projects, cloud storage, and so on).

To remove an organization, do the following:

1. Go to the **Organization page**.
2. In the top-right corner click **Actions** > **Remove organization**.
3. Enter the short name of the organization in the dialog field.
4. Click **Remove**.
