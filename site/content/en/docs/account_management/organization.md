---
title: 'Organization'
linkTitle: 'Organization'
weight: 3
description: 'Using organization in CVAT.'
aliases:
  - /docs/manual/advanced/organization/
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

![User menu with selected "Personal workspace" in "Organization" option](/images/user_menu_organization.png)

## Create new organization

To create an organization, do the following:

1. Log in to the CVAT.
2. On the top menu, click your **Username** > **Organization** > **+ Create**.

   ![User menu with highlighted "Create" button for creating organization](/images/user_menu_organization_create.png)

3. Fill in the following fields and click **Submit**.

   !["Create a new organization" window with options and parameters](/images/create_organization_form.png)

| Field            | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| **Short name**   | A name of the organization that will be displayed in the CVAT menu. |
| **Full name**    | Optional. Full name of the organization.                            |
| **Description**  | Optional. Description of organization.                              |
| **Email**        | Optional. Your email.                                               |
| **Phone number** | Optional. Your phone number.                                        |
| **Location**     | Optional. Organization address.                                     |

Upon creation, the organization page will open automatically.

For future access to your organization,
navigate to **Username** > **Organization**

### Switching between organizations

If you have more than one **Organization**,
it is possible to switch between these **Organizations** at any given time.

Follow these steps:

1. In the top menu, select your **Username** > **Organization**.
2. From the drop-down menu, under the **Personal space** section,
   choose the desired **Organization**.

![Example of user menu with available organizations](/images/user_menu_select_org.png)

{{% alert title="Note" color="primary" %}}
If you've created more than 10 organizations,
a **Switch organization** line will appear in the drop-down menu.
{{% /alert %}}

![Part of user menu with highlighted "Switch organization" button](/images/switch_org.png)

Click on it to see the **Select organization** dialog, and select organization
from drop-down list.

!["Select organization" window](/images/select_org.png)

### Transfer tasks and projects between organizations

You can move high-level resources (projects and individual tasks) between organizations and the personal workspace.

To transfer a resource:

1. Open the **Actions** menu of the corresponding task or project.
2. In the **Actions** menu, select **Organization** (only visible if the resource can be transferred).
3. Choose the destination workspace in the selector.
4. A dialog will open. Confirm the transfer.
5. If the resource has attached to a cloud storage, choose how CVAT should handle it:
   - The current cloud storages will be detached anyway as they are not available in another workspace.
   - **Move & Detach**: After transferring, you can set a new cloud storage manually
   (only applicable for data source cloud storage in a task).
   Source and target cloud storages cannot be setup this way.
   - **Move & Auto Match**: During the transfer, CVAT will try finding a
   cloud storage, matching similar parameters in the target workspace.
   This option is only available if the resource has source or target cloud storage configured.


<img src="/images/project_org_transfer_1.png" style="max-width: 600px; padding: 16px;">
<br />
<img src="/images/project_org_transfer_2.png" style="max-width: 250px; padding: 16px;">

<img src="/images/project_org_transfer_3.png" style="max-width: 350px; padding: 16px;">


## Organization page

**Organization page** is a place, where you can edit the **Organization** information
and manage **Organization** members.

![Example of organization page interface](/images/org_page.png)

{{% alert title="Note" color="primary" %}}
In order to access the organization page, you must first activate
the organization (see [Switching between organizations](#switching-between-organizations)).
Without activation, the organization page will remain inaccessible.
<br>An organization is considered activated when it's ticked in the drop-down menu
and its name is visible in the top-right corner under the username.
{{% /alert %}}

To go to the **Organization page**, do the following:

1. On the top menu, click your **Username** > **Organization**.
2. In the drop-down menu, select **Organization**.
3. In the drop-down menu, click **Settings**.

![User menu with highlighted steps to open organization settings](/images/org_page_steps.png)

## Invite members into organization: menu and roles

Invite members form is available from [Organization page](#organization-page).

It has the following fields:

![Form for inviting users to organization](/images/invite_org_members.png)

| Field               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email**           | Specifies the email address of the user who is being added to the **Organization**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Role drop-down list | Defines the role of the user which sets the level of access within the **Organization**: <br><li>**Worker**: Has access only to the tasks, projects, and jobs assigned to them. <li>**Supervisor**: Can create and assign jobs, tasks, and projects to the **Organization** members. <li>**Maintainer**: Has the same capabilities as the **Supervisor**, but with additional visibility over all tasks and projects created by other members, complete access to **Cloud Storages**, and the ability to modify members and their roles. <li>**Owner**: role assigned to the creator of the organization by default. Has maximum capabilities and cannot be changed or assigned to the other user. |
| **Invite more**     | Button to add another user to the **Organization**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Members of **Organization** will appear on the **Organization page**:

![Organization page with opened menu for organization member roles](/images/org_members.png)

The member of the organization can leave the organization
by going to **Organization page** > **Leave organization**.

The organization owner can remove members, by clicking on the **Bin** icon.

### Inviting members to Organization

To invite members to **Organization** do the following:

1. Go to the [**Organization page**](#organization-page), and click **Invite members**.
2. Fill in the form (see below).

   ![Invite user form with options and parameters](/images/org_invite_form.png)

3. Click **OK**.
4. The person being invited will receive an email with the link.

   ![Invitation to organization email example](/images/invitation_to_org.png)

5. Person must click the link and:
   1. If the invitee does not have the CVAT account, then
      {{< ilink "/docs/account_management/registration#user-registration" "**set up an account**" >}}.
   2. If the invitee has a CVAT account, then log in to the account.

### Invitations list

User can see the list of active invitations.

To see the list, Go to **Username** > **Organization** > **Invitations**.

![User menu with highlighted "Invitations" section](/images/invitations_list.png)

You will see the page with the list of invitations.


You will also see pop-up notification the link to the page with
invitations list.

### Resending and removing invitations

The organization owner and maintainers can remove members, by
clicking on the three dots, and selecting **Remove invitation**

![Organization page with opened menu for resending and removing invitations](/images/resend_remove_invitation.png)

## Delete organization

You can remove an organization that you created.

{{% alert title="Note" color="primary" %}}
Removing an organization will delete all related resources (annotations,
jobs, tasks, projects, cloud storage, and so on).
{{% /alert %}}

To remove an organization, do the following:

1. Go to the **Organization page**.
2. In the top-right corner click **Actions** > **Remove organization**.
3. Enter the short name of the organization in the dialog field.
4. Click **Remove**.
