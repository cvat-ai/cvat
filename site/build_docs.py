#!/usr/bin/env python3

# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urljoin

import git
import toml
from packaging import version

# Number of most recent tags to build documentation for
MAX_VERSIONS_TO_BUILD = 6

# Base URL for the documentation site
BASE_URL = os.getenv("BASE_URL", "/")

# Hugo binary for documentation builds
hugo110 = "hugo-0.110"  # used for all documentation builds


def prepare_tags(repo: git.Repo):
    # Group tags by minor version (major.minor) and keep only the latest patch for each
    minor_versions = {}
    for tag in repo.tags:
        tag_version = version.parse(tag.name)
        if not tag_version.is_prerelease:
            minor_key = (tag_version.major, tag_version.minor)
            if minor_key not in minor_versions or tag_version > version.parse(
                minor_versions[minor_key].name
            ):
                minor_versions[minor_key] = tag

    # Sort minor versions by version in descending order (newest first)
    sorted_tags = sorted(minor_versions.values(), key=lambda t: version.parse(t.name), reverse=True)

    # Return only the configured number of most recent minor versions
    return sorted_tags[:MAX_VERSIONS_TO_BUILD]


def generate_versioning_config(filename, versions, url_prefix=""):
    def write_version_item(file_object, version, url):
        file_object.write("[[params.versions]]\n")
        file_object.write('version = "{}"\n'.format(version))
        file_object.write('url = "{}"\n\n'.format(url))

    with open(filename, "w") as f:
        write_version_item(f, "Latest version", "{}/".format(url_prefix))
        for v in versions:
            write_version_item(f, v, "{}/{}".format(url_prefix, v))


def git_checkout(ref: str, temp_repo: git.Repo, temp_dir: Path):
    # We need to checkout with submodules, recursively

    subdirs = [
        "site/content",
        "site/assets",
        "site/layouts/docs",
        "site/layouts/partials",
        "site/layouts/shortcodes",
        "site/themes",
    ]

    temp_repo.git.checkout(ref, recurse_submodules=True, force=True)
    temp_repo.git.submodule("update", "--init", "--recursive")
    tmp_repo_root = Path(temp_repo.working_tree_dir)

    for subdir in subdirs:
        dst_dir = temp_dir / subdir

        if dst_dir.exists():
            shutil.rmtree(dst_dir)

        if (tmp_repo_root / subdir).is_dir():
            shutil.copytree(tmp_repo_root / subdir, dst_dir, symlinks=True)


def change_version_menu_toml(filename, version):
    data = toml.load(filename)
    data["params"]["version_menu"] = version

    with open(filename, "w") as f:
        toml.dump(data, f)


def generate_docs(repo: git.Repo, output_dir: os.PathLike, tags):
    repo_root = Path(repo.working_tree_dir)

    with tempfile.TemporaryDirectory() as temp_dir:
        content_loc = Path(temp_dir, "site")
        shutil.copytree(repo_root / "site", content_loc, symlinks=True)

        def run_npm_install():
            subprocess.run(["npm", "install"], cwd=content_loc)  # nosec

        def run_hugo(
            *,
            executable: str = "hugo",
            rel_dest_dir: str = ".",
        ):
            # Construct the full destination path
            full_destination = Path(output_dir) / rel_dest_dir

            subprocess.run(  # nosec
                [
                    executable,
                    "--destination",
                    str(full_destination),
                    "--baseURL",
                    urljoin(BASE_URL, rel_dest_dir),
                    "--config",
                    "config.toml,versioning.toml",
                ],
                cwd=content_loc,
                check=True,
            )

        versioning_toml_path = content_loc / "versioning.toml"

        # Process the develop version
        generate_versioning_config(versioning_toml_path, (t.name for t in tags))
        change_version_menu_toml(versioning_toml_path, "develop")
        run_hugo(executable=hugo110)

        # Create a temp repo for checkouts
        temp_repo_path = Path(temp_dir) / "tmp_repo"
        shutil.copytree(repo_root, temp_repo_path, symlinks=True)
        temp_repo = git.Repo(temp_repo_path)
        temp_repo.git.reset(hard=True, recurse_submodules=True)

        # Process older versions
        generate_versioning_config(versioning_toml_path, (t.name for t in tags), "/..")
        for tag in tags:
            git_checkout(tag.name, temp_repo, Path(temp_dir))
            change_version_menu_toml(versioning_toml_path, tag.name)
            run_npm_install()

            # Use hugo110 for all recent versions (since we only build the last MAX_VERSIONS_TO_BUILD tags)
            run_hugo(
                executable=hugo110,
                rel_dest_dir=tag.name,
            )


def validate_env():
    try:
        subprocess.run([hugo110, "version"], capture_output=True)  # nosec
    except (subprocess.CalledProcessError, FileNotFoundError) as ex:
        raise Exception(f"Failed to run '{hugo110}', please make sure it exists.") from ex


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    output_dir = repo_root / "public"

    validate_env()

    with git.Repo(repo_root) as repo:
        tags = prepare_tags(repo)
        generate_docs(repo, output_dir, tags)
