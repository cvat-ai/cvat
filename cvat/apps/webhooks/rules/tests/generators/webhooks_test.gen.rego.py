# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
import os
import random
import sys
from itertools import product

NAME = "webhooks"


def read_rules(name):
    rules = []
    with open(os.path.join(sys.argv[1], f"{name}.csv")) as f:
        reader = csv.DictReader(f)
        for row in reader:
            row = {k.lower(): v.lower().replace("n/a", "na") for k, v in row.items()}
            row["limit"] = row["limit"].replace("none", "None")
            found = False
            for col, val in row.items():
                if col in ["limit", "method", "url", "resource"]:
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


random.seed(42)
simple_rules = read_rules(NAME)
SCOPES = list({rule["scope"] for rule in simple_rules})
CONTEXTS = ["sandbox", "organization"]
OWNERSHIPS = ["project:owner", "owner", "none"]
GROUPS = ["admin", "business", "user", "worker", "none"]
ORG_ROLES = ["owner", "maintainer", "supervisor", "worker", None]
SAME_ORG = [True, False]


def RESOURCES(scope):
    if scope == "list":
        return [None]
    elif scope == "create@project":
        return [
            {
                "owner": {"id": random.randrange(100, 200)},
                "assignee": {"id": random.randrange(200, 300)},
                "organization": {"id": random.randrange(300, 400)},
                "project": {"owner": {"id": random.randrange(400, 500)}},
                "num_resources": count,
            }
            for count in (0, 3, 10)
        ]
    elif scope == "create@organization":
        return [
            {
                "owner": {"id": random.randrange(100, 200)},
                "assignee": {"id": random.randrange(200, 300)},
                "organization": {"id": random.randrange(300, 400)},
                "project": None,
                "num_resources": count,
            }
            for count in (0, 3, 10)
        ]
    else:
        return [
            {
                "id": random.randrange(100, 200),
                "owner": {"id": random.randrange(200, 300)},
                "organization": {"id": random.randrange(300, 400)},
                "project": {"owner": {"id": random.randrange(400, 500)}},
            }
        ]


def is_same_org(org1, org2):
    if org1 is not None and org2 is not None:
        return org1["id"] == org2["id"]
    elif org1 is None and org2 is None:
        return True
    return False


def eval_rule(scope, context, ownership, privilege, membership, data):
    if privilege == "admin":
        return True

    rules = list(
        filter(
            lambda r: scope == r["scope"]
            and (r["context"] == "na" or context == r["context"])
            and (r["ownership"] == "na" or ownership == r["ownership"])
            and (
                r["membership"] == "na"
                or ORG_ROLES.index(membership) <= ORG_ROLES.index(r["membership"])
            )
            and GROUPS.index(privilege) <= GROUPS.index(r["privilege"]),
            simple_rules,
        )
    )

    resource = data["resource"]

    rules = list(
        filter(lambda r: not r["limit"] or eval(r["limit"], {"resource": resource}), rules)
    )
    if (
        not is_same_org(data["auth"]["organization"], data["resource"]["organization"])
        and context != "sandbox"
    ):
        return False
    return bool(rules)


def get_data(scope, context, ownership, privilege, membership, resource, same_org):
    data = {
        "scope": scope,
        "auth": {
            "user": {"id": random.randrange(0, 100), "privilege": privilege},
            "organization": {
                "id": random.randrange(100, 200),
                "owner": {"id": random.randrange(200, 300)},
                "user": {"role": membership},
            }
            if context == "organization"
            else None,
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

    if ownership == "owner":
        data["resource"]["owner"]["id"] = user_id

    if ownership == "project:owner":
        data["resource"]["project"]["owner"]["id"] = user_id

    return data


def _get_name(prefix, **kwargs):
    name = prefix
    for k, v in kwargs.items():
        prefix = "_" + str(k)
        if isinstance(v, dict):
            if "id" in v:
                v = v.copy()
                v.pop("id")
            if v:
                name += _get_name(prefix, **v)
        else:
            name += "".join(
                map(
                    lambda c: c if c.isalnum() else {"@": "_IN_"}.get(c, "_"),
                    f"{prefix}_{str(v).upper()}",
                )
            )
    return name


def get_name(scope, context, ownership, privilege, membership, resource, same_org):
    return _get_name("test", **locals())


def is_valid(scope, context, ownership, privilege, membership, resource, same_org):
    if context == "sandbox" and membership:
        return False
    if scope == "list" and ownership != "None":
        return False
    if context == "sandbox" and not same_org:
        return False
    if scope.startswith("create") and ownership != "None":
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


gen_test_rego(NAME)
