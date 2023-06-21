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
  - [Invite members into organization](#invite-members-into-organization)
  - [Delete organization](#delete-organization)

## Personal workspace

The account's default state is activated when no **Organization** is selected.

It means that a personal account is used.

  ![](/images/personal_account.jpg)

## Create new organization

To create an organization, do the following:

1. Log in to the CVAT.
2. On the top menu, click your **Username** > **Organization** > **+ Create**.

   ![](/images/image233.jpg)

3. Fill in the following fields and click **Submit**.

   ![](/images/image234.jpg)

<!--lint disable maximum-line-length-->
|Field|Description|
|---|---|
|**Short name**|A name of the organization that will be displayed in the CVAT menu|
|**Full Name**|Optional. Full name of the organization.|
|**Description**|Optional. Description of organization|
|**Email**|Optional. Your email|
|**Phone number**|Optional. Your phone number|
|**Location**|Optional. Organization address.|

<!--lint enable maximum-line-length-->

The created organization will be available
at you **nickname** > **Organization**


### Switching between organizations

If you have more than one **Organization**,
it is possible to switch between these **Organizations** at any given time.

Follow these steps:

1. In the top menu, select your **Username** > **Organization**.
2. From the drop-down menu, under the **Personal space** section,
   choose the desired **Organization**.

 ![](/images/image233_1.jpg)


## Organization page

**Organization page** is a place, where you can edit the **Organization** information
and invite users to **Organization**.

 ![](/images/orgpage.jpg)

To go to the O**rganization page**, do the following:

1. On the top menu, click your **Username** > **Organization**.
2. In the drop-down menu, select **Organization**.
3. In the drop-down menu, click **Settings**.

![](/images/image235.jpg)

### Invite members into organization

To add members to **Organization** do the following:

1. Go to the [**Organization page**](#organization-page), and click **Invite members**.
2. Fill in the form (see below).

   ![](/images/image236.jpg)

3. Click **Ok**.

The **Invite Members** form has the following fields:

![](/images/invitemembers.jpg)

<!--lint disable maximum-line-length-->

|Field| Description|
|---|---|
|**Email**|Specifies the email address of the user who is being added to the **Organization**.|
|Role drop-down list|Defines the role of the user which sets the level of access within the **Organization**: <br><li>**Worker**: Has access only to the tasks, projects, and jobs assigned to them. <li>**Supervisor**: Can create and assign jobs, tasks, and projects to the **Organization** members. <li>**Maintainer**: Has the same capabilities as the **Supervisor**, but with additional visibility over all tasks and projects created by other members, complete access to **Cloud Storages**, and the ability to modify members and their roles. <li>**Owner**: role assigned to the creator of the organization by default. Has maximum capabilities and cannot be changed or assigned to the other user.|
|**Invite more**|Button to add another user to the **Organization**.|
<!--lint enable maximum-line-length-->



Members of **Organization** will appear on the **Organization page**.


![](/images/image237.jpg)


The member of the organization can leave the organization
by going to **Organization page** > **Leave organization**.

### Delete organization

You can remove an organization that you created.

> **Note**:  Removing an organization will delete all related resources (annotations,
jobs, tasks, projects, cloud storage, and so on).

To remove an organization, do the following:

1. Go to the **Organization page**.
2. In the top-right corner click **Actions** > **Remove organization**.
3.  Enter the short name of the organization in the dialog field.
4.  Click **Remove**.
