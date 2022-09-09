#!/usr/bin/env python3

# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

import git
import toml
from packaging import version

# the initial version for the documentation site
MINIMUM_VERSION = version.Version("1.5.0")


def prepare_tags(repo):
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


def git_checkout(tagname, repo, temp_dir):
    subdirs = ["site/content/en/docs", "site/content/en/images"]

    for subdir in subdirs:
        shutil.rmtree(temp_dir / subdir)

        with tempfile.TemporaryFile() as archive:
            # `git checkout` doesn't work for this, as it modifies the index.
            # `git restore` would work, but it's only available since Git 2.23.
            repo.git.archive(tagname, "--", subdir, output_stream=archive)
            archive.seek(0)
            with tarfile.open(fileobj=archive) as tar:
                tar.extractall(temp_dir)


def change_version_menu_toml(filename, version):
    data = toml.load(filename)
    data["params"]["version_menu"] = version

    with open(filename, "w") as f:
        toml.dump(data, f)


def generate_docs(repo, output_dir, tags):
    repo_root = Path(repo.working_tree_dir)

    with tempfile.TemporaryDirectory() as temp_dir:
        content_loc = Path(temp_dir, "site")
        shutil.copytree(repo_root / "site", content_loc, symlinks=True)

        def run_hugo(destination_dir):
            subprocess.run(  # nosec
                [
                    "hugo",
                    "--destination",
                    str(destination_dir),
                    "--config",
                    "config.toml,versioning.toml",
                ],
                cwd=content_loc,
                check=True,
            )

        versioning_toml_path = content_loc / "versioning.toml"

        # Handle the develop version
        generate_versioning_config(versioning_toml_path, (t.name for t in tags))
        change_version_menu_toml(versioning_toml_path, "develop")
        run_hugo(output_dir)

        generate_versioning_config(versioning_toml_path, (t.name for t in tags), "/..")
        for tag in tags:
            git_checkout(tag.name, repo, Path(temp_dir))
            change_version_menu_toml(versioning_toml_path, tag.name)
            run_hugo(output_dir / tag.name)


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    output_dir = repo_root / "public"

    with git.Repo(repo_root) as repo:
        tags = prepare_tags(repo)
        generate_docs(repo, output_dir, tags)
