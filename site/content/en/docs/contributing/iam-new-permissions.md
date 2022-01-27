<!--
 Copyright (C) 2022 Intel Corporation

 SPDX-License-Identifier: MIT
-->

---
title: 'Adding new permissions to IAM'
linkTitle: 'Adding new permissions to IAM'
weight: 100
description: 'Extending Identity and Access Management with new rules'
---

Let us look at an example scenario:

1. Go to Django IAM app and open projects.csv. It contains different rules for
   projects. CSV file is used to generate OPA tests and provide a human
   readable descriptions of permissions on the server.
1. Add corresponding lines with new permissions or change existing one. For
   example, you can have new scopes, change existing permissions.

   ```text
   update:organization,"Project, Organization",Sandbox,"None, Assignee",,PATCH,/projects/{id},Admin,N/A
   update:organization,"Project, Organization",Sandbox,Owner,,PATCH,/projects/{id},Worker,N/A
   update:organization,"Project, Organization",Organization,"None, Assignee",,PATCH,/projects/{id},User,Maintainer
   update:organization,"Project, Organization",Organization,Owner,,PATCH,/projects/{id},Worker,Worker
   ```

1. Generate OPA tests for new rules. At the end of each *.gen.rego file you
   can find a script which was used to generate the file. Copy it in a
   separate python file and run in iam/rules directory. If you run `opa test .`
   command it should show you a set of failed tests.

   ```bash
   opa test -r projects  .
   ```

   <details>

   ```text
   data.projects.test_scope_UPDATE_ORGANIZATION_context_SANDBOX_ownership_OWNER_privilege_BUSINESS_membership_NONE_resource_same_org_TRUE: FAIL (124.672µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_SANDBOX_ownership_OWNER_privilege_USER_membership_NONE_resource_same_org_TRUE: FAIL (120.834µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_OWNER_resource_same_org_TRUE: FAIL (137.214µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_MAINTAINER_resource_same_org_TRUE: FAIL (121.276µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_SUPERVISOR_resource_same_org_TRUE: FAIL (120.866µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_BUSINESS_membership_WORKER_resource_same_org_TRUE: FAIL (121.319µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_OWNER_resource_same_org_TRUE: FAIL (121.206µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_MAINTAINER_resource_same_org_TRUE: FAIL (121.113µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_SUPERVISOR_resource_same_org_TRUE: FAIL (121.275µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_OWNER_privilege_USER_membership_WORKER_resource_same_org_TRUE: FAIL (144.481µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_ASSIGNEE_privilege_BUSINESS_membership_OWNER_resource_same_org_TRUE: FAIL (120.804µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_ASSIGNEE_privilege_BUSINESS_membership_MAINTAINER_resource_same_org_TRUE: FAIL (118.605µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_ASSIGNEE_privilege_USER_membership_OWNER_resource_same_org_TRUE: FAIL (132.176µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_ASSIGNEE_privilege_USER_membership_MAINTAINER_resource_same_org_TRUE: FAIL (118.882µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER_resource_same_org_TRUE: FAIL (126.174µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER_resource_same_org_TRUE: FAIL (119.258µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER_resource_same_org_TRUE: FAIL (124.428µs)
   data.projects.test_scope_UPDATE_ORGANIZATION_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER_resource_same_org_TRUE: FAIL (127.936µs)
   --------------------------------------------------------------------------------
   PASS: 2952/2970
   FAIL: 18/2970
   ```

   </details>

1. Update corresponding rego rules to fix these issues. Look at other rules in
   in the rego file to think how the new rule corresponds to existing rules.
1. Now it is time to update `iam/permissions.py`.



