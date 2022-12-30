# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import json
import os
import sys
import textwrap
from enum import Enum
from itertools import product

NAME = "limits"


class TestKinds(str, Enum):
    single = "single"
    multi = "multi"

    def __str__(self) -> str:
        return self.value.lower()


class CapKinds(str, Enum):
    max = "max"

    def __str__(self) -> str:
        return self.value.lower()


def read_test_table(name):
    # The table describes positive cases and test configurations
    table = []
    with open(os.path.join(sys.argv[1], f"{name}.csv")) as f:
        for row in csv.DictReader(f):
            table.append(row)

    return table


test_table = read_test_table(NAME)

CAPABILITIES = {
    entry["Capability"]: entry["CapKind"]
    for entry in test_table
    if entry["TestKind"] == TestKinds.single
}
ROLES = ["user", "admin"]

MAX_CAPABILITY_LIMIT_VALUES = [None, 5]
MAX_CAPABILITY_USED_VALUES = [2, 7]


def eval_rule(test_kind, role, capabilities, *, data):
    if role == "admin":
        return {
            "allow": True,
            "messages": 0,
        }

    allow = True
    messages = 0
    for capability in capabilities:
        cap_name = capability["name"]
        cap_kind = CAPABILITIES[cap_name]
        cap_data = data["resource"]["limits"][cap_name]
        if cap_kind == CapKinds.max:
            cap_allow = (cap_data["max"] is None) or (cap_data["used"] < cap_data["max"])
            messages += not cap_allow
            allow &= cap_allow
        else:
            raise ValueError(f"Unknown capability kind {cap_kind}")

    if not capabilities:
        allow = False
        messages = 0

    return {
        "allow": allow,
        "messages": messages,
    }


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


def get_name(*args, **kwargs):
    return _get_name("test", *args, **kwargs)


def generate_capability_cases(capability: str):
    capability_kind = CAPABILITIES[capability]
    if capability_kind == CapKinds.max:
        for used, maximum in product(MAX_CAPABILITY_USED_VALUES, MAX_CAPABILITY_LIMIT_VALUES):
            yield {"name": capability, "used": used, "max": maximum}
    else:
        raise ValueError(f"Unknown capability kind {capability_kind}")


def generate_test_data(test_kind, role, capabilities):
    data = {
        "auth": {"user": {"privilege": role}},
        "resource": {
            "limits": {},
        },
    }

    for cap_case in capabilities:
        cap_name = cap_case["name"]
        cap_kind = CAPABILITIES[cap_case["name"]]
        if cap_kind == CapKinds.max:
            data["resource"]["limits"][cap_name] = {
                "used": cap_case["used"],
                "max": cap_case["max"],
            }
        else:
            raise ValueError(f"Unknown capability type {cap_kind}")

    return data


def generate_test_cases():
    for config in test_table:
        test_kind = config["TestKind"]
        if test_kind == TestKinds.single:
            capability = config["Capability"]

            for role, cap_case in product(ROLES, generate_capability_cases(capability)):
                yield dict(test_kind=test_kind, role=role, capabilities=[cap_case])

        elif test_kind == TestKinds.multi:
            if config["Capability"]:
                capabilities = config["Capability"].split(",")
            else:
                capabilities = []

            capability_cases = [
                generate_capability_cases(capability) for capability in capabilities
            ]

            for params in product(ROLES, *capability_cases):
                role = params[0]
                cap_case = params[1:]
                yield dict(test_kind=test_kind, role=role, capabilities=cap_case)
        else:
            raise ValueError(f"Unknown test kind {test_kind}")


def gen_test_rego(name):
    with open(f"{name}_test.gen.rego", "wt") as f:
        f.write(f"package {name}\n\n")

        for test_params in generate_test_cases():
            test_data = generate_test_data(**test_params)
            test_result = eval_rule(**test_params, data=test_data)
            test_name = get_name(**test_params)
            f.write(
                textwrap.dedent(
                    """
                {test_name} {{
                    r := result with input as {data}
                    r.allow == {allow}
                    count(r.reasons) == {messages}
                }}
                """
                ).format(
                    test_name=test_name,
                    allow=str(test_result["allow"]).lower(),
                    messages=test_result["messages"],
                    data=json.dumps(test_data),
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
