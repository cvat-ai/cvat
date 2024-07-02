---
title: 'CVAT User roles'
linkTitle: 'CVAT User roles'
weight: 4
---

CVAT offers two distinct types of roles:

- **Global Roles**: These are universal roles that apply to the entire system. Anyone who logs into the CVAT.ai
  platform is automatically assigned a global role. It sets the basic permissions that every registered user
  has across CVAT.ai, regardless of their specific tasks or responsibilities.
- **Organization Roles**: These roles determine what a user can do within the Organization,
  allowing for more tailored access based on the user’s specific duties and responsibilities.

Organization roles complement global roles by determining the
visibility of different resources for example, tasks or jobs.

**Limits**: Limits are applicable to all users of the CVAT.ai Cloud Platform
using the [**Free plan**](https://www.cvat.ai/pricing/cloud) and can be lifted upon
{{< ilink "/docs/enterprise/subscription-management" "**choosing a subscription**" >}}.

All roles are predefined and cannot be modified through the user interface.
However, within the _self-hosted solution_, roles can be adjusted using `.rego`
files stored in `cvat/apps/*/rules/`.
Rego is a declarative language employed for defining
OPA (Open Policy Agent) policies, and its syntax is detailed
in the [**OPA documentation**](https://www.openpolicyagent.org/docs/latest/policy-language/).

> Note: Once you've made changes to the `.rego` files, you must
> rebuild and restart the Docker Compose for those changes to be applied.
> In this scenario, be sure to include the `docker-compose.dev.yml` compose
> configuration file when executing the Docker Compose command.

See:

- [Global roles in CVAT.ai](#global-roles-in-cvatai)
- [Organization roles in CVAT.ai](#organization-roles-in-cvatai)
- [Job Stage](#job-stage)

## Global roles in CVAT.ai

> **Note:** Global roles can be adjusted only on self-hosted solution.

CVAT has implemented three Global roles, categorized as user Groups. These roles are:

<!--lint disable maximum-line-length-->

| Role                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Administrator**           | An administrator possesses unrestricted access to the CVAT instance and all activities within this instance. The administrator has visibility over all tasks and projects, with the ability to modify or manage each comprehensively. This role is exclusive to self-hosted instances, ensuring comprehensive oversight and control.                                                                                                                                                                                            |
| **User <br>(default role)** | A User is a default role who is assigned to any user who is registered in CVAT*. Users can view and manage all tasks and projects within their registered accounts, but their activities are subject to specific limitations, see Free plan. <br><br>* If a user, that did not have a CVAT account, has been invited to the organization by the organization owner or maintainer, it will be automatically assigned the Organization role and will be subject to the role's limitations when operating within the Organization. |
| **Worker**                  | Workers are limited to specific functionalities and do not have the permissions to create tasks, assign roles, or perform other administrative actions. Their activities are primarily focused on viewing and interacting with the content within the boundaries of their designated roles (validation or annotation of the jobs).                                                                                                                                                                                              |

<!--lint enable maximum-line-length-->

## Organization roles in CVAT.ai

Organization Roles are available only within the
{{< ilink "/docs/manual/advanced/organization" "**CVAT Organization**" >}}.

![Organization Roles](/images/user-roles.png)

Organization roles are assigned when users are invited to the Organization.

![Organization Roles](/images/org-roles.png)

There are the following roles available in CVAT:

<!--lint disable maximum-line-length-->

| Role           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**      | The Owner is the person who created the Organization. The Owner role is assigned to the creator of the organization by default. This role has maximum capabilities and cannot be changed or assigned to the other user. <br><br>The Owner has no extra restrictions in the organization and is only limited by the chosen organization plan (see [Free and Team](https://www.cvat.ai/pricing/cloud) plans). <br><br>Owners can invite other users to the Organization and assign roles to the invited users so the team can collaborate. |
| **Maintainer** | The maintainer is the person who can invite users to organization, create and update tasks and jobs, and see all tasks within the organization. Maintainer has complete access to Cloud Storages, and the ability to modify members and their roles.                                                                                                                                                                                                                                                                                     |
| **Supervisor** | The supervisor is a manager role. Supervisor can create and assign jobs, tasks, and projects to the Organization members. Supervisor cannot invite new members and modify members roles.                                                                                                                                                                                                                                                                                                                                                 |
| **Worker**     | Workers' primary focus is actual annotation and reviews. They are limited to specific functionalities and has access only to the jobs assigned to them.                                                                                                                                                                                                                                                                                                                                                                                  |

<!--lint enable maximum-line-length-->

## Job Stage

Job **Stage** can be assigned to any team member.

**Stages** are not roles.

Jobs can have an assigned user (with any role) and that **Assignee**
will perform a **Stage** specific work which is to annotate,
validate, or accept the job.

![Job stage](/images/job-stage.png)

Job **Stage** can be:

<!--lint disable maximum-line-length-->

| Stage          | Description                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Annotation** | Provides access to annotation tools. Assignees will be able to see their assigned jobs and annotate them. By default, assignees with the **Annotation** stage cannot report annotation errors or issues.             |
| **Validation** | Grants access to QA tools. Assignees will see their assigned jobs and can validate them while also reporting issues. By default, assignees with the **Validation** stage cannot correct errors or annotate datasets. |
| **Acceptance** | Does not grant any additional access or change the annotator’s interface. It just marks the job as done.                                                                                                             |

<!--lint enable maximum-line-length-->

Any **Assignee** can modify their assigned **Stage** specific
functions via the annotation interface toolbar:

![Job stage change](/images/change-stage.png)

- **Standard**: switches interface to **Annotation** mode.
- **Review**: switches interface to the **Validation** mode.
