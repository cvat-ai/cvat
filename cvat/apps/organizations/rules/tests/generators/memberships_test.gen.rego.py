# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
import os
import random
import sys
from itertools import product

NAME = "memberships"


def read_rules(name):
    rules = []
    with open(os.path.join(sys.argv[1], f"{name}.csv")) as f:
        reader = csv.DictReader(f)
        for row in reader:
            row = {k.lower(): v.lower().replace("n/a", "na") for k, v in row.items()}
            row["limit"] = row["limit"].replace("none", "None")
            found = False
            for col, val in row.items():
                if col in ["limit", "method", "url"]:
                    continue
                complex_val = [v.strip() for v in val.split(",")]
                if len(complex_val) > 1:
                    found = True
                    for item in complex_val:
                        new_row = row.copy()
                        new_row[col] = item
                        rules.append(new_row)
            if not found:
                rules.append(row)

    return rules


simple_rules = read_rules(NAME)

SCOPES = {rule["scope"] for rule in simple_rules}
CONTEXTS = ["sandbox", "organization"]
OWNERSHIPS = ["self", "none"]
GROUPS = ["admin", "user", "worker", "none"]
ORG_ROLES = ["owner", "maintainer", "supervisor", "worker", None]
SAME_ORG = [False, True]


def RESOURCES(scope):
    if scope == "list":
        return [None]
    else:
        return [
            {
                "user": {"id": random.randrange(300, 400)},
                "is_active": active,
                "role": role,
                "organization": {"id": random.randrange(500, 600)},
            }
            for role in ORG_ROLES
            if role is not None
            for active in [False, True]
        ]


def is_same_org(org1, org2):
    if org1 is not None and org2 is not None:
        return org1["id"] == org2["id"]
    elif org1 is None and org2 is None:
        return True
    else:
        return False


def eval_rule(scope, context, ownership, privilege, membership, data):
    if privilege == "admin":
        return True

    rules = list(filter(lambda r: scope == r["scope"], simple_rules))
    rules = list(filter(lambda r: r["context"] == "na" or context == r["context"], rules))
    rules = list(filter(lambda r: r["ownership"] == "na" or ownership == r["ownership"], rules))
    rules = list(
        filter(
            lambda r: r["membership"] == "na"
            or ORG_ROLES.index(membership) <= ORG_ROLES.index(r["membership"]),
            rules,
        )
    )
    rules = list(filter(lambda r: GROUPS.index(privilege) <= GROUPS.index(r["privilege"]), rules))
    resource = data["resource"]
    rules = list(
        filter(lambda r: not r["limit"] or eval(r["limit"], {"resource": resource}), rules)
    )
    if (
        not is_same_org(data["auth"]["organization"], data["resource"]["organization"])
        and context != "sandbox"
    ):
        return False

    if scope != "create" and not data["resource"]["is_active"]:
        is_staff = membership == "owner" or membership == "maintainer"
        if is_staff:
            if scope != "view":
                if ORG_ROLES.index(membership) >= ORG_ROLES.index(resource["role"]):
                    return False
                if GROUPS.index(privilege) > GROUPS.index("user"):
                    return False
                if resource["user"]["id"] == data["auth"]["user"]["id"]:
                    return False
            return True
        return False

    return bool(rules)


def get_data(scope, context, ownership, privilege, membership, resource, same_org):
    data = {
        "scope": scope,
        "auth": {
            "user": {"id": random.randrange(0, 100), "privilege": privilege},
            "organization": (
                {
                    "id": random.randrange(100, 200),
                    "owner": {"id": random.randrange(200, 300)},
                    "user": {"role": membership},
                }
                if context == "organization"
                else None
            ),
        },
        "resource": resource,
    }

    user_id = data["auth"]["user"]["id"]
    if context == "organization":
        org_id = data["auth"]["organization"]["id"]
        if data["auth"]["organization"]["user"]["role"] == "owner":
            data["auth"]["organization"]["owner"]["id"] = user_id

        if same_org:
            data["resource"]["organization"]["id"] = org_id

    if ownership == "self":
        data["resource"]["user"]["id"] = user_id

    return data


def _get_name(prefix, **kwargs):
    name = prefix
    for k, v in kwargs.items():
        prefix = "_" + str(k)
        if isinstance(v, dict):
            if "id" not in v:
                name += _get_name(prefix, **v)
        else:
            name += f'{prefix}_{str(v).upper().replace(":", "_")}'

    return name


def get_name(scope, context, ownership, privilege, membership, resource, same_org):
    return _get_name("test", **locals())


def is_valid(scope, context, ownership, privilege, membership, resource, same_org):
    if context == "sandbox" and membership:
        return False
    if scope == "list" and ownership != "None":
        return False
    if context == "sandbox" and same_org is False:
        return False

    return True


def gen_test_rego(name):
    with open(f"{name}_test.gen.rego", "wt") as f:
        f.write(f"package {name}\nimport rego.v1\n\n")
        for scope, context, ownership, privilege, membership, same_org in product(
            SCOPES, CONTEXTS, OWNERSHIPS, GROUPS, ORG_ROLES, SAME_ORG
        ):
            for resource in RESOURCES(scope):
                if not is_valid(
                    scope, context, ownership, privilege, membership, resource, same_org
                ):
                    continue

                data = get_data(
                    scope, context, ownership, privilege, membership, resource, same_org
                )
                test_name = get_name(
                    scope, context, ownership, privilege, membership, resource, same_org
                )
                result = eval_rule(scope, context, ownership, privilege, membership, data)
                f.write(
                    "{test_name} if {{\n    {allow} with input as {data}\n}}\n\n".format(
                        test_name=test_name,
                        allow="allow" if result else "not allow",
                        data=json.dumps(data),
                    )
                )

        # Write the script which is used to generate the file
        with open(sys.argv[0]) as this_file:
            f.write(f"\n\n# {os.path.split(sys.argv[0])[1]}\n")
            for line in this_file:
                if line.strip():
                    f.write(f"# {line}")
                else:
                    f.write(f"#\n")

        # Write rules which are used to generate the file
        with open(os.path.join(sys.argv[1], f"{name}.csv")) as rego_file:
            f.write(f"\n\n# {name}.csv\n")
            for line in rego_file:
                if line.strip():
                    f.write(f"# {line}")
                else:
                    f.write(f"#\n")


gen_test_rego(NAME)
