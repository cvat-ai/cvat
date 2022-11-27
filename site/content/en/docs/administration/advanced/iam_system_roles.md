---
title: 'IAM: System roles'
linkTitle: 'System roles'
weight: 22
description: 'This guide explains how to use IAM system roles to configure users rights in CVAT.'
---

System roles are a part of Identity and Access Management (IAM).
Configure system roles to ensure, that users have the correct level of access to resources.

See:

- [Open Policy Agent](#open-policy-agent)
- [Rules](#rules)
- [Example of changing rules](#example-of-changing-rules)
- [Rules for other resources](#rules-for-other-resources)

## Open Policy Agent

CVAT system roles are based on the [Open Policy Agent](https://www.openpolicyagent.org/) (OPA)
and use [REST API](https://www.openpolicyagent.org/docs/latest/rest-api/)
to exchange queries.

OPA is the Policy Decision Point (PDP) that makes decisions.

CVAT is the Policy Enforcement Point (PEP),
that enforces these decisions by providing information about
requested resources.

OPA has [Policy Language](https://www.openpolicyagent.org/docs/latest/policy-language/)
that transform policies into code and simple APIs to offload policy decision-making from CVAT.

CVAT controls what queries look like and implements policies to handle them.
After a query is processed by OPA following implemented policies,
OPA returns the descision to CVAT.

The general flow is the following:

1. CVAT receives some event or request. Based on this request it needs to make a policy decision.
2. To make a policy decision, CVAT sends a query (with attributes) to OPA, asking: should this request be allowed/ mutated/ modified?
3. OPA receives these attributes and evaluates them against policies that it has access to.
4. OPA produces the decision, and replies with `allow` or `deny` (in the simplest case).

## Rules

In the CVAT repository > [Rules](https://github.com/opencv/cvat/tree/develop/cvat/apps/iam/rules)
the folder you will find several CSV files for different resources.
Each of them displays permissions in a form of a table.

For example, the [Users.csv](https://github.com/opencv/cvat/blob/develop/cvat/apps/iam/rules/users.csv)
the table shows permissions you need, to have access to or to change the users' information

Every line in the table is a primitive rule that describes who has the right
to perform a specific action:

| Scope  | Resource | Context      | Ownership | Limit                                  | Method | URL         | Privilege | Membership |
| ------ | -------- | ------------ | --------- | -------------------------------------- | ------ | ----------- | --------- | ---------- |
| list   | User     | N/A          | N/A       |                                        | GET    | /users      | None      | N/A        |
| view   | User     | Organization | None      | resource["membership"]["role"] != None | GET    | /users/{id} | None      | Worker     |
| delete | User     | N/A          | None      |                                        | DELETE | /users/{id} | Admin     | N/A        |

All CSV files have the following columns:

- **Scope** is the action that is performed on the resource. For example, `list` gets the list of users,
  `update` changes information about a user, `view` gets information about a user, and so on.

- **Resource** describes the object on which the action is performed.

- **Context** can take one of two values: `sandbox` or `organization`:

  - If the created object does not belong to any `organization`, it will be in the `sandbox`.
  - An `organization` can have users with different roles and resources.
  - Resources are shared between members of the `organization`,
    but each member has permissions in accordance with their role and ownership.
  - If a user creates an object inside an `organization`, the user delegates some rights for the object
    to members with maintainer and owner roles in the `organization`.

- **Ownership** describes how the user and the specific resource are connected.
  <br>For example, the `N/A` value means that the property doesn't apply to the query.
  Some possible values can be `self`, `owner`, `assignee`, and so on.
  <br>The `None` value means that the user who is making the query doesn't have any relationships with the resource.

- **Limit** covers constraints for the query.
  Typical constraints are the number
  of tasks and projects which a regular user can create.

- **Method** and **URL** contain data for information purposes only and are not used.
  They help to connect rules with the REST API. If a user makes a `GET /api/users/1` call,
  it is easy to locate corresponding permissions in the table. Thus, the scope is the view,
  the resource is the user, and the context is the sandbox.

- **Privilege** corresponds to the group for the current user with the maximum level of permissions.
  It can be empty if the user doesn't belong to any group or is equal to a worker, user, business, or admin.
  The primary idea is to delimit the fundamental rights of the user on the platform.
  For example, users with the privilege of less than or equal to the worker cannot create tasks and projects.
  At the same time, a user with the maximum privilege admin doesn't have any restrictions.

- **Membership** is the user's role inside the organization like worker, supervisor, maintainer, or owner.
  The column makes sense only if a request is made in the context of an organization and allows
  to delimit access to resources of the organization.
  <br>For example, if a user has the `maintainer` role in an organization,
  but the privilege is `worker`, the user will be able to see all resources in the organization
  but not be able to create tasks and projects in the organization.

If somebody needs to change the default behavior,
it is possible to modify the policies defined in the `.rego` files and restart the OPA microservice.

## Example of changing rules

By default, CVAT has a system of rules described in the organization section.
But you can change them by editing the CSV files in the CVAT repository.

For example, if you want users with the supervisor role to be able to update an organization's
cloud storage, edit cloudstorages.csv

{{< get-csv url="../../cvat/cvat/apps/iam/rules/cloudstorages.csv" >}}

If you want to disable the ability to register new users on your server, edit auth.csv

{{< get-csv url="../../cvat/cvat/apps/iam/rules/auth.csv" >}}

Prohibit invitations to the organization for everyone except the creator of the organization and edit Invitations

{{< get-csv url="../../cvat/cvat/apps/iam/rules/invitations.csv" >}}

## Rules for other resources

{{< get-csv url="../../cvat/cvat/apps/iam/rules/analytics.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/comments.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/issues.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/jobs.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/lambda.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/memberships.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/organizations.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/projects.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/restrictions.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/server.csv" >}}

{{< get-csv url="../../cvat/cvat/apps/iam/rules/tasks.csv" >}}
