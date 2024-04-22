#!/usr/bin/env python3

# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import os.path as osp
import re
import sys
from glob import glob

from inflection import underscore
from ruamel.yaml import YAML


def collect_operations(schema):
    endpoints = schema.get("paths", {})

    operations = {}

    for endpoint_name, endpoint_schema in endpoints.items():
        for method_name, method_schema in endpoint_schema.items():
            method_schema = dict(method_schema)
            method_schema["method"] = method_name
            method_schema["endpoint"] = endpoint_name
            operations[method_schema["operationId"]] = method_schema

    return operations


class Replacer:
    REPLACEMENT_TOKEN = r"%%%"
    ARGS_TOKEN = r"!!!"

    def __init__(self, schema):
        self._schema = schema
        self._operations = collect_operations(self._schema)

    def make_operation_id(self, name: str) -> str:
        operation = self._operations[name]

        new_name = name

        tokenized_path = operation["endpoint"].split("/")
        assert 3 <= len(tokenized_path)
        assert tokenized_path[0] == "" and tokenized_path[1] == "api"
        tokenized_path = tokenized_path[2:]

        prefix = tokenized_path[0] + "_"
        if new_name.startswith(prefix) and tokenized_path[0] in operation["tags"]:
            new_name = new_name[len(prefix) :]

        return new_name

    def make_api_name(self, name: str) -> str:
        return underscore(name)

    def make_type_annotation(self, type_repr: str) -> str:
        type_repr = type_repr.replace("[", "typing.List[")
        type_repr = type_repr.replace("(", "typing.Union[").replace(")", "]")
        type_repr = type_repr.replace("{", "typing.Dict[").replace(":", ",").replace("}", "]")

        ANY_pattern = "bool, date, datetime, dict, float, int, list, str"
        type_repr = type_repr.replace(ANY_pattern, "typing.Any")

        # single optional arg pattern
        type_repr = re.sub(r"^(.+, none_type)$", r"typing.Union[\1]", type_repr)

        return type_repr

    allowed_actions = {
        "make_operation_id",
        "make_api_name",
        "make_type_annotation",
    }

    def _process_file(self, contents: str):
        processor_pattern = re.compile(
            f"{self.REPLACEMENT_TOKEN}(.*?){self.ARGS_TOKEN}(.*?){self.REPLACEMENT_TOKEN}"
        )

        matches = list(processor_pattern.finditer(contents))
        for match in reversed(matches):
            action = match.group(1)
            args = match.group(2).split(self.ARGS_TOKEN)

            if action not in self.allowed_actions:
                raise Exception(f"Replacement action '{action}' is not allowed")

            replacement = getattr(self, action)(*args)
            contents = contents[: match.start(0)] + replacement + contents[match.end(0) :]

        return contents

    def process_file(self, src_path: str):
        with open(src_path, "r") as f:
            contents = f.read()

        contents = self._process_file(contents)

        with open(src_path, "w") as f:
            f.write(contents)

    def process_dir(self, dir_path: str, *, file_ext: str = ".py"):
        for filename in glob(dir_path + f"/**/*{file_ext}", recursive=True):
            try:
                self.process_file(filename)
            except Exception as e:
                raise RuntimeError(f"Failed to process file {filename!r}") from e


def parse_schema(path):
    yaml = YAML(typ="safe")
    with open(path, "r") as f:
        return yaml.load(f)


def parse_args(args=None):
    parser = argparse.ArgumentParser(
        add_help=True,
        formatter_class=argparse.RawTextHelpFormatter,
        description="""\
Processes generator output files in a custom way, saves results inplace.

Replacement token: '%(repl_token)s'.
Arg separator token: '%(args_token)s'.
Replaces the following patterns in files:
    '%(repl_token)sREPLACER%(args_token)sARG1%(args_token)sARG2...%(repl_token)s'
    ->
    REPLACER(ARG1, ARG2, ...) value

Available REPLACERs:
    %(replacers)s
        """
        % {
            "repl_token": Replacer.REPLACEMENT_TOKEN,
            "args_token": Replacer.ARGS_TOKEN,
            "replacers": "\n    ".join(Replacer.allowed_actions),
        },
    )
    parser.add_argument("--schema", required=True, help="Path to server schema yaml")
    parser.add_argument("--input-path", required=True, help="Path to target file or directory")
    parser.add_argument(
        "--file-ext",
        default=".py",
        help="If working on a directory, look for "
        "files with the specified extension (default: %(default)s)",
    )

    return parser.parse_args(args)


def main(args=None):
    args = parse_args(args)

    schema = parse_schema(args.schema)
    processor = Replacer(schema=schema)

    if osp.isdir(args.input_path):
        processor.process_dir(args.input_path, file_ext=args.file_ext)
    elif osp.isfile(args.input_path):
        processor.process_file(args.input_path)
    else:
        return f"error: input {args.input_path} is neither a file nor a directory"

    return 0


if __name__ == "__main__":
    sys.exit(main())
