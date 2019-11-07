# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

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
            except Exception as e:
                self.assertFalse(True, "URL #%s: '%s'" % (i, url))

    def test_http_url(self):
        hosts = ['host.zone', '1.2.3.4']
        ports = ['', ':42']
        repo_groups = ['repo', 'r4p0']
        repo_repos = ['nkjl23', 'hewj']
        git_suffixes = ['', '.git']

        samples = []

        # http samples
        protocols = ['', 'http://', 'https://']
        for prot in protocols:
            for h in hosts:
                for p in ports:
                    for rg in repo_groups:
                        for repo in repo_repos:
                            for suffix in git_suffixes:
                                url = '{prot}{host}{port}/{rg}/{repo}{git}'.format(
                                    prot=prot, host=h, port=p, rg=rg, repo=repo, git=suffix
                                )
                                expected = ('git', h + p, '%s/%s.git' % (rg, repo))
                                samples.append((expected, url))

        # git samples
        users = ['user', 'u123_.']
        for u in users:
            for h in hosts:
                for p in ports:
                    for rg in repo_groups:
                        for repo in repo_repos:
                            for suffix in git_suffixes:
                                url = '{user}@{host}{port}:{rg}/{repo}{git}'.format(
                                    user=u, host=h, port=p, rg=rg, repo=repo, git=suffix
                                )
                                expected = (u, h + p, '%s/%s.git' % (rg, repo))
                                samples.append((expected, url))

        self._check_correct_urls(samples)