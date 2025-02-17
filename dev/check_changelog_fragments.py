#!/usr/bin/env python3

import configparser
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def main():
    scriv_config = configparser.ConfigParser()
    scriv_config.read(REPO_ROOT / "changelog.d/scriv.ini")

    scriv_section = scriv_config["scriv"]
    assert scriv_section["format"] == "md"

    md_header_level = int(scriv_section["md_header_level"])
    md_header_prefix = "#" * md_header_level + "# "

    categories = {s.strip() for s in scriv_section["categories"].split(",")}

    success = True

    def complain(message):
        nonlocal success
        success = False
        print(f"{fragment_path.relative_to(REPO_ROOT)}:{line_index+1}: {message}", file=sys.stderr)

    for fragment_path in REPO_ROOT.glob("changelog.d/*.md"):
        with open(fragment_path) as fragment_file:
            for line_index, line in enumerate(fragment_file):
                line = line.rstrip("\n")

                if line_index == 0:
                    # The first line should always be a header.
                    if not line.startswith("#"):
                        complain("line should be a header")
                elif (
                    line
                    and not line.startswith("#")
                    and not line.startswith("-")
                    and not line.startswith("  ")
                ):
                    complain("line should be a header, a list item, or indented")

                if line.startswith("#"):
                    if line.startswith(md_header_prefix):
                        category = line.removeprefix(md_header_prefix).strip()
                        if category not in categories:
                            complain(f"unknown category: {category}")
                    else:
                        # All headers should be of the same level.
                        complain(f"header should start with {md_header_prefix!r}")

    sys.exit(0 if success else 1)


main()
