# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
import os
import random
import sys
from itertools import product

NAME = "analytics"


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
OWNERSHIPS = ["none"]
GROUPS = ["admin", "business", "user", "worker", "none"]
ORG_ROLES = ["owner", "maintainer", "supervisor", "worker", None]


def RESOURCES(scope):
    if scope == "view":
        return [
            {"visibility": "public"},
            {"visibility": "private"},
        ]

    return [None]


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
    rules = list(filter(lambda r: eval(r["limit"], {"resource": resource}), rules))

    return bool(rules)


def get_data(scope, context, ownership, privilege, membership, resource):
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
        if data["auth"]["organization"]["user"]["role"] == "owner":
            data["auth"]["organization"]["owner"]["id"] = user_id

    return data


def _get_name(prefix, **kwargs):
    name = prefix
    for k, v in kwargs.items():
        if k == "resource":
            continue
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


def get_name(scope, context, ownership, privilege, membership, resource):
    return _get_name("test", **locals())


def is_valid(scope, context, ownership, privilege, membership, resource):
    if context == "sandbox" and membership:
        return False
    if scope == "list" and ownership != "None":
        return False

    return True


def gen_test_rego(name):
    with open(f"{name}_test.gen.rego", "wt") as f:
        f.write(f"package {name}\nimport rego.v1\n\n")
        for scope, context, ownership, privilege, membership in product(
            SCOPES, CONTEXTS, OWNERSHIPS, GROUPS, ORG_ROLES
        ):
            for resource in RESOURCES(scope):
                if not is_valid(scope, context, ownership, privilege, membership, resource):
                    continue

                data = get_data(scope, context, ownership, privilege, membership, resource)
                test_name = get_name(scope, context, ownership, privilege, membership, resource)
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
