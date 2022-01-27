package analytics

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 26, "privilege": "admin"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 7, "privilege": "admin"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "business"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 19, "privilege": "business"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 72, "privilege": "user"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "user"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 11, "privilege": "worker"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 81, "privilege": "worker"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 15, "privilege": "none"}, "organization": null}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_SANDBOX_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 0, "privilege": "none"}, "organization": null}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "admin"}, "organization": {"id": 141, "owner": {"id": 39}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 79, "privilege": "admin"}, "organization": {"id": 198, "owner": {"id": 79}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 67, "privilege": "admin"}, "organization": {"id": 145, "owner": {"id": 213}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 17, "privilege": "admin"}, "organization": {"id": 156, "owner": {"id": 268}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 99, "privilege": "admin"}, "organization": {"id": 146, "owner": {"id": 249}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 49, "privilege": "admin"}, "organization": {"id": 136, "owner": {"id": 268}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 51, "privilege": "admin"}, "organization": {"id": 171, "owner": {"id": 291}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 20, "privilege": "admin"}, "organization": {"id": 135, "owner": {"id": 255}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "admin"}, "organization": {"id": 129, "owner": {"id": 283}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_ADMIN_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 90, "privilege": "admin"}, "organization": {"id": 153, "owner": {"id": 257}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 85, "privilege": "business"}, "organization": {"id": 117, "owner": {"id": 85}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 4, "privilege": "business"}, "organization": {"id": 131, "owner": {"id": 4}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 54, "privilege": "business"}, "organization": {"id": 122, "owner": {"id": 209}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 30, "privilege": "business"}, "organization": {"id": 101, "owner": {"id": 295}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    allow with input as {"scope": "view", "auth": {"user": {"id": 3, "privilege": "business"}, "organization": {"id": 132, "owner": {"id": 224}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 56, "privilege": "business"}, "organization": {"id": 141, "owner": {"id": 269}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "business"}, "organization": {"id": 194, "owner": {"id": 271}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 43, "privilege": "business"}, "organization": {"id": 118, "owner": {"id": 249}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    allow with input as {"scope": "view", "auth": {"user": {"id": 94, "privilege": "business"}, "organization": {"id": 182, "owner": {"id": 247}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_BUSINESS_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "business"}, "organization": {"id": 110, "owner": {"id": 262}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 50, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 50}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "user"}, "organization": {"id": 134, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 48, "privilege": "user"}, "organization": {"id": 128, "owner": {"id": 248}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 111, "owner": {"id": 282}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 10, "privilege": "user"}, "organization": {"id": 187, "owner": {"id": 209}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 92, "privilege": "user"}, "organization": {"id": 158, "owner": {"id": 278}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "user"}, "organization": {"id": 177, "owner": {"id": 221}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "user"}, "organization": {"id": 166, "owner": {"id": 207}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "user"}, "organization": {"id": 157, "owner": {"id": 218}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_USER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 70, "privilege": "user"}, "organization": {"id": 163, "owner": {"id": 217}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 34, "privilege": "worker"}, "organization": {"id": 137, "owner": {"id": 34}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 38, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 38}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 1, "privilege": "worker"}, "organization": {"id": 101, "owner": {"id": 296}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 5, "privilege": "worker"}, "organization": {"id": 103, "owner": {"id": 288}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 53, "privilege": "worker"}, "organization": {"id": 178, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 55, "privilege": "worker"}, "organization": {"id": 144, "owner": {"id": 261}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 8, "privilege": "worker"}, "organization": {"id": 126, "owner": {"id": 205}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 21, "privilege": "worker"}, "organization": {"id": 186, "owner": {"id": 241}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 77, "privilege": "worker"}, "organization": {"id": 172, "owner": {"id": 225}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_WORKER_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "worker"}, "organization": {"id": 133, "owner": {"id": 239}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 31, "privilege": "none"}, "organization": {"id": 155, "owner": {"id": 31}, "user": {"role": "owner"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_OWNER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 139, "owner": {"id": 93}, "user": {"role": "owner"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 39, "privilege": "none"}, "organization": {"id": 176, "owner": {"id": 285}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_MAINTAINER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 35, "privilege": "none"}, "organization": {"id": 161, "owner": {"id": 259}, "user": {"role": "maintainer"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 88, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 265}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_SUPERVISOR {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 87, "privilege": "none"}, "organization": {"id": 143, "owner": {"id": 202}, "user": {"role": "supervisor"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 95, "privilege": "none"}, "organization": {"id": 153, "owner": {"id": 289}, "user": {"role": "worker"}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_WORKER {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 71, "privilege": "none"}, "organization": {"id": 122, "owner": {"id": 273}, "user": {"role": "worker"}}}, "resource": {"visibility": "private"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 18, "privilege": "none"}, "organization": {"id": 148, "owner": {"id": 206}, "user": {"role": null}}}, "resource": {"visibility": "public"}}
}

test_scope_VIEW_context_ORGANIZATION_ownership_NONE_privilege_NONE_membership_NONE {
    not allow with input as {"scope": "view", "auth": {"user": {"id": 93, "privilege": "none"}, "organization": {"id": 141, "owner": {"id": 213}, "user": {"role": null}}}, "resource": {"visibility": "private"}}
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
# view,Analytics,N/A,N/A,resource['visibility']=='public',GET,"/analytics/access",Business,N/A
