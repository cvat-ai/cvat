# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import product

from django.test import TestCase

# Create your tests here.

from cvat.apps.git.git import Git


class GitUrlTest(TestCase):
    class FakeGit:
        def __init__(self, url):
            self._url = url

    def _check_correct_urls(self, samples):
        for i, (expected, url) in enumerate(samples):
            git = GitUrlTest.FakeGit(url)
            try:
                actual = Git._parse_url(git)
                self.assertEqual(expected, actual, "URL #%s: '%s'" % (i, url))
            except Exception:
                self.assertFalse(True, "URL #%s: '%s'" % (i, url))

    def test_correct_urls_can_be_parsed(self):
        hosts = ['host.zone', '1.2.3.4']
        ports = ['', ':42']
        repo_groups = ['repo', 'r4p0']
        repo_repos = ['nkjl23', 'hewj']
        git_suffixes = ['', '.git']

        samples = []

        # http samples
        protocols = ['', 'http://', 'https://']
        for protocol, host, port, repo_group, repo, git in product(
                protocols, hosts, ports, repo_groups, repo_repos, git_suffixes):
            url = '{protocol}{host}{port}/{repo_group}/{repo}{git}'.format(
                protocol=protocol, host=host, port=port,
                repo_group=repo_group, repo=repo, git=git
            )
            expected = ('git', host + port, '%s/%s.git' % (repo_group, repo))
            samples.append((expected, url))

        # git samples
        users = ['user', 'u123_.']
        for user, host, port, repo_group, repo, git in product(
                users, hosts, ports, repo_groups, repo_repos, git_suffixes):
            url = '{user}@{host}{port}:{repo_group}/{repo}{git}'.format(
                user=user, host=host, port=port,
                repo_group=repo_group, repo=repo, git=git
            )
            expected = (user, host + port, '%s/%s.git' % (repo_group, repo))
            samples.append((expected, url))

        self._check_correct_urls(samples)