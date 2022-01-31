package analytics

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 76, "privilege": "admin"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "admin"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "user"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "worker"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 73, "privilege": "none"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "none"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "admin"}, "organization": {"id": 112, "owner": {"id": 56}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 98, "privilege": "admin"}, "organization": {"id": 114, "owner": {"id": 98}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "admin"}, "organization": {"id": 115, "owner": {"id": 244}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "admin"}, "organization": {"id": 190, "owner": {"id": 208}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "admin"}, "organization": {"id": 137, "owner": {"id": 294}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "admin"}, "organization": {"id": 193, "owner": {"id": 253}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "admin"}, "organization": {"id": 140, "owner": {"id": 257}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 29, "privilege": "admin"}, "organization": {"id": 133, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 25, "privilege": "admin"}, "organization": {"id": 185, "owner": {"id": 266}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 9, "privilege": "admin"}, "organization": {"id": 199, "owner": {"id": 225}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 40, "privilege": "business"}, "organization": {"id": 144, "owner": {"id": 40}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "business"}, "organization": {"id": 137, "owner": {"id": 275}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 105, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 45, "privilege": "business"}, "organization": {"id": 102, "owner": {"id": 291}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 66, "privilege": "business"}, "organization": {"id": 152, "owner": {"id": 255}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "business"}, "organization": {"id": 198, "owner": {"id": 227}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "business"}, "organization": {"id": 125, "owner": {"id": 208}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "business"}, "organization": {"id": 115, "owner": {"id": 276}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "business"}, "organization": {"id": 190, "owner": {"id": 253}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "user"}, "organization": {"id": 130, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 74, "privilege": "user"}, "organization": {"id": 145, "owner": {"id": 74}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 223}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "user"}, "organization": {"id": 142, "owner": {"id": 292}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "user"}, "organization": {"id": 154, "owner": {"id": 243}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": {"id": 199, "owner": {"id": 225}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 82, "privilege": "user"}, "organization": {"id": 148, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 27, "privilege": "user"}, "organization": {"id": 147, "owner": {"id": 296}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "user"}, "organization": {"id": 146, "owner": {"id": 298}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 118, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 47, "privilege": "worker"}, "organization": {"id": 149, "owner": {"id": 47}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "worker"}, "organization": {"id": 147, "owner": {"id": 277}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 52, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 233}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 58, "privilege": "worker"}, "organization": {"id": 102, "owner": {"id": 275}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 63, "privilege": "worker"}, "organization": {"id": 106, "owner": {"id": 258}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": {"id": 171, "owner": {"id": 212}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 57, "privilege": "worker"}, "organization": {"id": 150, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 62, "privilege": "worker"}, "organization": {"id": 112, "owner": {"id": 233}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "worker"}, "organization": {"id": 146, "owner": {"id": 241}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 75, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 75}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 54}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 44, "privilege": "none"}, "organization": {"id": 159, "owner": {"id": 238}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 65, "privilege": "none"}, "organization": {"id": 152, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 41, "privilege": "none"}, "organization": {"id": 188, "owner": {"id": 223}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 84, "privilege": "none"}, "organization": {"id": 132, "owner": {"id": 284}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": {"id": 136, "owner": {"id": 216}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 83, "privilege": "none"}, "organization": {"id": 106, "owner": {"id": 258}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 178, "owner": {"id": 246}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "none"}, "organization": {"id": 181, "owner": {"id": 234}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}



# analytics_test.gen.py
# # Copyright (C) 2022 Intel Corporation
# #
# # SPDX-License-Identifier: MIT
#
# import csv
# import json
# import random
# import sys
# import os
# from itertools import product
# from tkinter.messagebox import NO
#
# NAME = 'analytics'
#
# def read_rules(name):
#     rules = []
#     with open(os.path.join(sys.argv[1], f'{name}.csv')) as f:
#         reader = csv.DictReader(f)
#         for row in reader:
#             row = {k.lower():v.lower().replace('n/a','na') for k,v in row.items()}
#             row['limit'] = row['limit'].replace('none', 'None')
#             found = False
#             for col,val in row.items():
#                 if col in ["limit", "method", "url"]:
#                     continue
#                 complex_val = [v.strip() for v in val.split(',')]
#                 if len(complex_val) > 1:
#                     found = True
#                     for item in complex_val:
#                         new_row = row.copy()
#                         new_row[col] = item
#                         rules.append(new_row)
#             if not found:
#                 rules.append(row)
#
#     return rules
#
# simple_rules = read_rules(NAME)
#
# SCOPES = {rule['scope'] for rule in simple_rules}
# CONTEXTS = ['sandbox', 'organization']
# OWNERSHIPS = ['none']
# GROUPS = ['admin', 'business', 'user', 'worker', 'none']
# ORG_ROLES = ['owner', 'maintainer', 'supervisor', 'worker', None]
#
# def RESOURCES(scope):
#     if scope == 'view':
#         return [
#             {'visibility': 'public'},
#             {'visibility': 'private'},
#         ]
#
#     return [None]
#
# def eval_rule(scope, context, ownership, privilege, membership, data):
#     if privilege == 'admin':
#         return True
#
#     rules = list(filter(lambda r: scope == r['scope'], simple_rules))
#     rules = list(filter(lambda r: r['context'] == 'na' or context == r['context'], rules))
#     rules = list(filter(lambda r: r['ownership'] == 'na' or ownership == r['ownership'], rules))
#     rules = list(filter(lambda r: r['membership'] == 'na' or
#         ORG_ROLES.index(membership) <= ORG_ROLES.index(r['membership']), rules))
#     rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r['privilege']), rules))
#     resource = data['resource']
#     rules = list(filter(lambda r: eval(r['limit'], {'resource': resource}), rules))
#
#     return bool(rules)
#
# def get_data(scope, context, ownership, privilege, membership, resource):
#     data = {
#     "scope": scope,
#     "auth": {
#         "user": { "id": random.randrange(0,100), "privilege": privilege },
#         "organization": {
#             "id": random.randrange(100,200),
#             "owner": { "id": random.randrange(200, 300) },
#             "user": { "role": membership }
#         } if context == 'organization' else None
#     },
#     "resource": resource
#     }
#
#     user_id = data['auth']['user']['id']
#     if context == 'organization':
#         if data['auth']['organization']['user']['role'] == 'owner':
#             data['auth']['organization']['owner']['id'] = user_id
#
#     return data
#
# def _get_name(prefix, **kwargs):
#     name = prefix
#     for k,v in kwargs.items():
#         if k == 'resource':
#             continue
#         prefix = '_' + str(k)
#         if isinstance(v, dict):
#             if 'id' in v:
#                 v = v.copy()
#                 v.pop('id')
#             if v:
#                 name += _get_name(prefix, **v)
#         else:
#             name += ''.join(map(lambda c: c if c.isalnum() else {'@':'_IN_'}.get(c, '_'),
#                 f'{prefix}_{str(v).upper()}'))
#
#     return name
#
# def get_name(scope, context, ownership, privilege, membership, resource):
#     return _get_name('test', **locals())
#
# def is_valid(scope, context, ownership, privilege, membership, resource):
#     if context == "sandbox" and membership:
#         return False
#     if scope == 'list' and ownership != 'None':
#         return False
#
#     return True
#
# def gen_test_rego(name):
#     with open(f'{name}_test.gen.rego', 'wt') as f:
#         f.write(f'package {name}\n\n')
#         for scope, context, ownership, privilege, membership in product(
#             SCOPES, CONTEXTS, OWNERSHIPS, GROUPS, ORG_ROLES):
#             for resource in RESOURCES(scope):
#                 if not is_valid(scope, context, ownership, privilege, membership, resource):
#                     continue
#
#                 data = get_data(scope, context, ownership, privilege, membership, resource)
#                 test_name = get_name(scope, context, ownership, privilege, membership, resource)
#                 result = eval_rule(scope, context, ownership, privilege, membership, data)
#                 f.write('{test_name} {{\n    {allow} with input as {data}\n}}\n\n'.format(
#                     test_name=test_name, allow='allow' if result else 'not allow',
#                     data=json.dumps(data)))
#
#         # Write the script which is used to generate the file
#         with open(sys.argv[0]) as this_file:
#             f.write(f'\n\n# {os.path.split(sys.argv[0])[1]}\n')
#             for line in this_file:
#                 if line.strip():
#                     f.write(f'# {line}')
#                 else:
#                     f.write(f'#\n')
#
#         # Write rules which are used to generate the file
#         with open(os.path.join(sys.argv[1], f'{name}.csv')) as rego_file:
#             f.write(f'\n\n# {name}.csv\n')
#             for line in rego_file:
#                 if line.strip():
#                     f.write(f'# {line}')
#                 else:
#                     f.write(f'#\n')
#
# gen_test_rego(NAME)

# analytics.csv
# Scope,Resource,Context,Ownership,Limit,Method,URL,Privilege,Membership
# view,Analytics,N/A,N/A,resource['visibility']=='public',GET,"/analytics",business,N/A
# view,Analytics,N/A,N/A,,GET,"/analytics",admin,N/A
