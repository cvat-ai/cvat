#!/usr/bin/env python3

import argparse
import functools
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from re import Match, Pattern
from typing import Callable

SUCCESS_CHAR = "\u2714"
FAIL_CHAR = "\u2716"

CVAT_VERSION_PATTERN = re.compile(
    r"VERSION\s*=\s*\((\d+),\s*(\d*),\s*(\d+),\s*[\',\"](\w+)[\',\"],\s*(\d+)\)"
)

REPO_ROOT_DIR = Path(__file__).resolve().parents[1]

CVAT_INIT_PY_REL_PATH = "cvat/__init__.py"
CVAT_INIT_PY_PATH = REPO_ROOT_DIR / CVAT_INIT_PY_REL_PATH


@dataclass()
class Version:
    major: int = 0
    minor: int = 0
    patch: int = 0
    prerelease: str = ""
    prerelease_number: int = 0

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}-{self.prerelease}.{self.prerelease_number}"

    def cvat_repr(self):
        return f'({self.major}, {self.minor}, {self.patch}, "{self.prerelease}", {self.prerelease_number})'

    def compose_repr(self):
        if self.prerelease != "final":
            return "dev"
        return f"v{self.major}.{self.minor}.{self.patch}"

    def increment_prerelease_number(self) -> None:
        self.prerelease_number += 1

    def increment_prerelease(self) -> None:
        flow = ("alpha", "beta", "rc", "final")
        idx = flow.index(self.prerelease)
        if idx == len(flow) - 1:
            raise ValueError(f"Cannot increment current '{self.prerelease}' prerelease version")

        self.prerelease = flow[idx + 1]
        self._set_default_prerelease_number()

    def set_prerelease(self, value: str) -> None:
        values = ("alpha", "beta", "rc", "final")
        if value not in values:
            raise ValueError(f"{value} is a wrong, must be one of {values}")

        self.prerelease = value
        self._set_default_prerelease_number()

    def increment_patch(self) -> None:
        self.patch += 1
        self._set_default_prerelease()

    def increment_minor(self) -> None:
        self.minor += 1
        self._set_default_patch()

    def increment_major(self) -> None:
        self.major += 1
        self._set_default_minor()

    def set(self, v: str) -> None:
        self.major, self.minor, self.patch = map(int, v.split("."))
        self.prerelease = "final"
        self.prerelease_number = 0

    def _set_default_prerelease_number(self) -> None:
        self.prerelease_number = 0

    def _set_default_prerelease(self) -> None:
        self.prerelease = "alpha"
        self._set_default_prerelease_number()

    def _set_default_patch(self) -> None:
        self.patch = 0
        self._set_default_prerelease()

    def _set_default_minor(self) -> None:
        self.minor = 0
        self._set_default_patch()


@dataclass(frozen=True)
class ReplacementRule:
    rel_path: str
    pattern: Pattern[str]
    replacement: Callable[[Version, Match[str]], str]

    def apply(self, new_version: Version, *, verify_only: bool) -> bool:
        path = REPO_ROOT_DIR / self.rel_path
        text = path.read_text()

        new_text, num_replacements = self.pattern.subn(
            functools.partial(self.replacement, new_version), text
        )

        if not num_replacements:
            print(f"{FAIL_CHAR} {self.rel_path}: failed to match version pattern.")
            return False

        if text == new_text:
            if verify_only:
                print(f"{SUCCESS_CHAR} {self.rel_path}: verified.")
            else:
                print(f"{SUCCESS_CHAR} {self.rel_path}: no need to update.")
        else:
            if verify_only:
                print(f"{FAIL_CHAR} {self.rel_path}: verification failed.")
                return False
            else:
                path.write_text(new_text)
                print(f"{SUCCESS_CHAR} {self.rel_path}: updated.")

        return True


REPLACEMENT_RULES = [
    ReplacementRule(
        CVAT_INIT_PY_REL_PATH, CVAT_VERSION_PATTERN, lambda v, m: f"VERSION = {v.cvat_repr()}"
    ),
    ReplacementRule(
        "docker-compose.yml",
        re.compile(r"(\$\{CVAT_VERSION:-)([\w.]+)(\})"),
        lambda v, m: m[1] + v.compose_repr() + m[3],
    ),
    ReplacementRule(
        "helm-chart/values.yaml",
        re.compile(r"(^    image: cvat/(?:ui|server)\n    tag: )([\w.]+)", re.M),
        lambda v, m: m[1] + v.compose_repr(),
    ),
    ReplacementRule(
        "cvat-sdk/gen/generate.sh",
        re.compile(r'^VERSION="[\d.]+"$', re.M),
        lambda v, m: f'VERSION="{v.major}.{v.minor}.{v.patch}"',
    ),
    ReplacementRule(
        "cvat/schema.yml",
        re.compile(r"^  version: [\d.]+$", re.M),
        lambda v, m: f"  version: {v.major}.{v.minor}.{v.patch}",
    ),
    ReplacementRule(
        "cvat-cli/src/cvat_cli/version.py",
        re.compile(r'^VERSION = "[\d.]+"$', re.M),
        lambda v, m: f'VERSION = "{v.major}.{v.minor}.{v.patch}"',
    ),
    ReplacementRule(
        "cvat-cli/requirements/base.txt",
        re.compile(r"^cvat-sdk==[\d.]+$", re.M),
        lambda v, m: f"cvat-sdk=={v.major}.{v.minor}.{v.patch}",
    ),
    ReplacementRule(
        "cvat-ui/package.json",
        re.compile(r'^  "version": "[\d.]+",$', re.M),
        lambda v, m: f'  "version": "{v.major}.{v.minor}.{v.patch}",',
    ),
]


def get_current_version() -> Version:
    version_text = CVAT_INIT_PY_PATH.read_text()

    match = re.search(CVAT_VERSION_PATTERN, version_text)
    if not match:
        raise RuntimeError(f"Failed to find version in {CVAT_INIT_PY_PATH}")

    return Version(int(match[1]), int(match[2]), int(match[3]), match[4], int(match[5]))


def main() -> None:
    parser = argparse.ArgumentParser(description="Bump CVAT version")

    action_group = parser.add_mutually_exclusive_group(required=True)

    action_group.add_argument(
        "--major", action="store_true", help="Increment the existing major version by 1"
    )
    action_group.add_argument(
        "--minor", action="store_true", help="Increment the existing minor version by 1"
    )
    action_group.add_argument(
        "--patch", action="store_true", help="Increment the existing patch version by 1"
    )
    action_group.add_argument(
        "--prerelease",
        nargs="?",
        const="increment",
        help="""Increment prerelease version alpha->beta->rc->final,
                Also it's possible to pass value explicitly""",
    )
    action_group.add_argument(
        "--prerelease_number", action="store_true", help="Increment prerelease number by 1"
    )

    action_group.add_argument(
        "--current", "--show-current", action="store_true", help="Display current version"
    )
    action_group.add_argument(
        "--verify-current",
        action="store_true",
        help="Check that all version numbers are consistent",
    )

    action_group.add_argument(
        "--set", metavar="X.Y.Z", help="Set the version to the specified version"
    )

    args = parser.parse_args()

    version = get_current_version()
    verify_only = False

    if args.current:
        print(version)
        return

    elif args.verify_current:
        verify_only = True

    elif args.prerelease_number:
        version.increment_prerelease_number()

    elif args.prerelease:
        if args.prerelease == "increment":
            version.increment_prerelease()
        else:
            version.set_prerelease(args.prerelease)

    elif args.patch:
        version.increment_patch()

    elif args.minor:
        version.increment_minor()

    elif args.major:
        version.increment_major()

    elif args.set is not None:
        version.set(args.set)

    else:
        assert False, "Unreachable code"

    if verify_only:
        print(f"Verifying that version is {version}...")
    else:
        print(f"Bumping version to {version}...")
    print()

    success = True

    for rule in REPLACEMENT_RULES:
        if not rule.apply(version, verify_only=verify_only):
            success = False

    if not success:
        if verify_only:
            sys.exit("\nFailed to verify one or more files!")
        else:
            sys.exit("\nFailed to update one or more files!")


if __name__ == "__main__":
    main()
