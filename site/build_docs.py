# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import shutil
import subprocess

from packaging import version
import git
import toml

MINIMUM_VERSION='1.5.0'

def prepare_tags(repo):
    tags = {}
    for tag in repo.tags:
        tag_version = version.parse(tag.name)
        if tag_version >= version.Version(MINIMUM_VERSION) and not tag_version.is_prerelease:
            release_version = (tag_version.major, tag_version.minor)
            if not release_version in tags or tag_version > version.parse(tags[release_version].name):
                tags[release_version] = tag

    return tags.values()

def generate_versioning_config(filename, versions, url_prefix=''):
    def write_version_item(file_object, version, url):
        file_object.write('[[params.versions]]\n')
        file_object.write('version = "{}"\n'.format(version))
        file_object.write('url = "{}"\n\n'.format(url))

    with open(filename, 'w') as f:
        write_version_item(f, 'Latest version', '{}/'.format(url_prefix))
        for v in versions:
            write_version_item(f, v, '{}/{}'.format(url_prefix, v))

def git_checkout(tagname, cwd):
    docs_dir = os.path.join(cwd, 'site', 'content', 'en', 'docs')
    shutil.rmtree(docs_dir)
    repo.git.checkout(tagname, '--', 'site/content/en/docs')
    images_dir = os.path.join(cwd, 'site', 'content', 'en', 'images')
    shutil.rmtree(images_dir)
    repo.git.checkout(tagname, '--', 'site/content/en/images')

def change_version_menu_toml(filename, version):
    data = toml.load(filename)
    data['params']['version_menu'] = version

    with open(filename,'w') as f:
        toml.dump(data, f)

def generate_docs(repo, output_dir, tags):
    def run_hugo(content_loc, destination_dir):
        subprocess.run([ # nosec
                'hugo',
                '--destination',
                destination_dir,
                '--config',
                'config.toml,versioning.toml',
            ],
            cwd=content_loc,
        )

    cwd = repo.working_tree_dir
    content_loc = os.path.join(cwd, 'site')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    generate_versioning_config(os.path.join(cwd, 'site', 'versioning.toml'), (t.name for t in tags))
    change_version_menu_toml(os.path.join(cwd, 'site', 'versioning.toml'), 'Latest version')
    run_hugo(content_loc, output_dir)

    generate_versioning_config(os.path.join(cwd, 'site', 'versioning.toml'), (t.name for t in tags), '/..')
    for tag in tags:
        git_checkout(tag.name, cwd)
        destination_dir = os.path.join(output_dir, tag.name)
        change_version_menu_toml(os.path.join(cwd, 'site', 'versioning.toml'), tag.name)
        os.makedirs(destination_dir)
        run_hugo(content_loc, destination_dir)

if __name__ == "__main__":
    repo_root = os.getcwd()
    repo = git.Repo(repo_root)
    output_dir = os.path.join(repo_root, 'public')

    tags = prepare_tags(repo)
    generate_docs(repo, output_dir, tags)
