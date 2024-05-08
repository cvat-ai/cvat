#!/usr/bin/env python3
#
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import subprocess
import sys
from argparse import ArgumentParser, Namespace
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional, Sequence
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[5]

def create_arg_parser() -> ArgumentParser:
    parser = ArgumentParser(add_help=True)
    parser.add_argument(
        "-a",
        "--apps-dir",
        type=Path,
        default=REPO_ROOT / "cvat/apps",
        help="The directory with Django apps (default: cvat/apps)",
    )
    return parser


def parse_args(args: Optional[Sequence[str]] = None) -> Namespace:
    parser = create_arg_parser()
    parsed_args = parser.parse_args(args)
    return parsed_args


def call_generator(generator_path: Path, gen_params: Namespace) -> None:
    rules_dir = generator_path.parents[2]
    subprocess.check_call(
        [sys.executable, generator_path.relative_to(rules_dir), 'tests/configs'], cwd=rules_dir
    )


def main(args: Optional[Sequence[str]] = None) -> int:
    args = parse_args(args)

    generator_paths = list(args.apps_dir.glob("*/rules/tests/generators/*_test.gen.rego.py"))

    if not generator_paths:
        sys.exit("error: no generators found")

    with ThreadPoolExecutor() as pool:
        for _ in pool.map(
            partial(call_generator, gen_params=args),
            generator_paths,
        ):
            pass # consume all results in order to propagate exceptions


if __name__ == "__main__":
    sys.exit(main())
