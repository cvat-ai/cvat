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
from typing import Optional

import git
import toml
from packaging import version

# the initial version for the documentation site
MINIMUM_VERSION = version.Version("1.5.0")

# apply new hugo version starting from release 2.9.2
UPDATED_HUGO_FROM = version.Version("2.9.2")

# Start the name with HUGO_ for Hugo default security checks
VERSION_URL_ENV_VAR = "HUGO_VERSION_REL_URL"

# Hugo binaries for different versions
hugo110 = "hugo-0.110"  # required for new docs
hugo83 = "hugo-0.83"  # required for older docs


def prepare_tags(repo: git.Repo):
    tags = {}
    for tag in repo.tags:
        tag_version = version.parse(tag.name)
        if tag_version >= MINIMUM_VERSION and not tag_version.is_prerelease:
            release_version = (tag_version.major, tag_version.minor)
            if release_version not in tags or tag_version > version.parse(
                tags[release_version].name
            ):
                tags[release_version] = tag

    return tags.values()


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
        "site/layouts/partials",
        "site/layouts/shortcodes",
        "site/themes",
    ]

    temp_repo.git.checkout(ref, recurse_submodules=True, force=True)
    temp_repo.git.submodule("update", "--init", "--recursive")
    tmp_repo_root = Path(temp_repo.working_tree_dir)

    for subdir in subdirs:
        dst_dir = temp_dir / subdir
        shutil.rmtree(dst_dir)
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
            destination_dir: os.PathLike,
            *,
            extra_env_vars: dict[str, str] = None,
            executable: Optional[str] = "hugo",
        ):
            extra_kwargs = {}

            if extra_env_vars:
                extra_kwargs["env"] = os.environ.copy()
                extra_kwargs["env"].update(extra_env_vars)

            subprocess.run(  # nosec
                [
                    executable,
                    "--destination",
                    str(destination_dir),
                    "--config",
                    "config.toml,versioning.toml",
                ],
                cwd=content_loc,
                check=True,
                **extra_kwargs,
            )

        versioning_toml_path = content_loc / "versioning.toml"

        # Process the develop version
        generate_versioning_config(versioning_toml_path, (t.name for t in tags))
        change_version_menu_toml(versioning_toml_path, "develop")
        run_hugo(output_dir, executable=hugo110)

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

            # find correct hugo version
            hugo = hugo110 if version.parse(tag.name) >= UPDATED_HUGO_FROM else hugo83

            run_hugo(
                output_dir / tag.name,
                # This variable is no longer needed by the current version,
                # but it was required in v2.11.2 and older.
                extra_env_vars={VERSION_URL_ENV_VAR: f"/{tag.name}/docs"},
                executable=hugo,
            )


def validate_env():
    for hugo in [hugo83, hugo110]:
        try:
            subprocess.run([hugo, "version"], capture_output=True)  # nosec
        except (subprocess.CalledProcessError, FileNotFoundError) as ex:
            raise Exception(f"Failed to run '{hugo}', please make sure it exists.") from ex


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    output_dir = repo_root / "public"

    validate_env()

    with git.Repo(repo_root) as repo:
        tags = prepare_tags(repo)
        generate_docs(repo, output_dir, tags)
