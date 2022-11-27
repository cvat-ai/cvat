---
title: 'IAM: system roles'
linkTitle: 'System roles'
weight: 22
description: 'This guide explains how to use IAM system roles to configure user rights in CVAT.'
---

## System roles

### Open Policy Agent

CVAT system roles are based on the [Open Policy Agent](https://www.openpolicyagent.org/)(OPA) microservice having [REST API](https://www.openpolicyagent.org/docs/latest/rest-api/).
Thus, CVAT sends HTTP requests (Query) to OPA that replies with "allow" or "deny" in the simplest case (Decision).
OPA is the Policy Decision Point (PDP) -— it makes decisions, and CVAT is the Policy Enforcement Point (PEP),
that enforces these decisions by providing information about requested resources or responding with an error.

OPA provides a high-level declarative language that lets specify the policy as code and simple APIs to offload
policy decision-making from software. CVAT controls what queries look like and implements policies to handle them.
After a query is processed by OPA in accordance with implemented policies, OPA replies CVAT with its decision.

### Rules

In the {{< repolink text="CVAT repository" path="/cvat/apps/iam/rules/" >}} for each resource, there is a CSV file
which describes all permissions in a simple and readable form.
For example, the {{< repolink text="users.csv" path="/cvat/apps/iam/rules/users.csv" >}} file describes permissions
for working with information about users. Every line in the file is a primitive rule which tells us who has the rights
to perform a specific action.

{{< get-csv url="../../cvat/cvat/apps/iam/rules/users.csv" >}}

All CSV files which describe permissions have the same set of columns:

- `Scope` is the action which is performed on the resource. For example, `list` - get the list of users,
  `update` - change information about a user, `view` - get information about a user and so on.

- `Resource` describes the object on which the action is performed.

- `Context` can take one of two values: `sandbox` or `organization`. An object is in the `sandbox`
  if it is created outside of any `organization`. In theory it is possible to make an object in the `sandbox` visible
 An `organization` can have users with different roles and resources.
  Resources are shared between members of the `organization`, but each member has permissions in accordance with their
  role and ownership. If a user creates an object inside an `organization`, he/she delegates some rights for the object
  to members with maintainer and owner roles in the `organization`.

- `Ownership` describes how the user and the specific resource are connected together.
  For example, the `N/A` value means that the property isn't applicable to the query.
  Some possible values can be self, owner, assignee, etc.
  None value means that the user who is making the query doesn't have any relationships with the resource.

- `Limit` covers constraints for the query. They can look not user-friendly in the table above to make
  it easy for the code generation. This will probably be solved in future releases. Typical constrains are the number
  of tasks and projects which a regular user can create.

- `Method` and URL contain data for information purposes only and are not used.
  They help to connect rules with the REST API. If a user makes a `GET /api/users/1` call,
  it is easy to locate corresponding permissions in the table. Thus, the scope is the view,
  the resource is the user, and the context is the sandbox.

- `Privilege` corresponds to the group for the current user with the maximum level of permissions.
  It can be empty if the user doesn't belong to any groups or equal to a worker, user, business, or admin.
  The primary idea is to delimit the fundamental rights of the user on the platform.
  For example, users with the privilege less than or equal to the worker cannot create tasks and projects.
  At the same time, a user with the maximum privilege admin doesn't have any restrictions.

- `Membership` is the user's role inside the organization like worker, supervisor, maintainer, or owner.
  The column makes sense only if a request is made in the context of an organization and allows
  to delimit access to resources of the organization.
  For example, if a user has the maintainer role in an organization,
  but the privilege is worker, he/she will be able to see all resources in the organization
  but not be able to create tasks and projects in the organization.

If somebody needs to change the default behavior,
it is possible to modify the policies defined in the `.rego` files and restart the OPA microservice.

### Example of changing rules

By default, CVAT has a system of rules described in the organization section.
But you can change them by editing the CSV files in the CVAT repository.

#### Example 1

For example, if you want users with the supervisor role to be able to update in organization's
cloud storage, edit cloudstorages.csv

{{< get-csv url="../../cvat/cvat/apps/iam/rules/cloudstorages.csv" >}}

#### Example 2

If you want to disable the ability to register new users on your server, edit auth.csv

{{< get-csv url="../../cvat/cvat/apps/iam/rules/auth.csv" >}}

#### Example 3

Prohibit invitations to the organization for everyone except the creator of the organization edit Invitations

{{< get-csv url="../../cvat/cvat/apps/iam/rules/invitations.csv" >}}

### Rules for other resources

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
