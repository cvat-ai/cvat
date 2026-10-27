# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import html
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urljoin, urlparse


HUGO = shutil.which("hugo-0.110")
ROOT = Path(__file__).resolve().parents[2]


@unittest.skipUnless(HUGO, "Install Hugo 0.110 extended to verify the docs exports")
class ReleaseNotesPublicationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix="cvat-release-notes-test-")
        cls.addClassCleanup(cls.directory.cleanup)
        cls.output = Path(cls.directory.name)
        subprocess.run(
            [HUGO, "--destination", str(cls.output), "--baseURL", "https://docs.cvat.ai/"],
            cwd=ROOT / "site",
            check=True,
            capture_output=True,
            text=True,
        )
        cls.feed = json.loads((cls.output / "release-notes/index.json").read_text())
        cls.versioned_output = cls.output / "versioned"
        subprocess.run(
            [
                HUGO,
                "--destination",
                str(cls.versioned_output),
                "--baseURL",
                "https://docs.cvat.ai/v2.79.0/",
            ],
            cwd=ROOT / "site",
            check=True,
            capture_output=True,
            text=True,
        )

    def test_index_matches_publication_contract(self):
        self.assertEqual(self.feed["schemaVersion"], 1)
        self.assertTrue(self.feed["entries"])
        versions = []
        for note in self.feed["entries"]:
            self.assertRegex(note["version"], r"^\d+\.\d+\.\d+$")
            self.assertIsInstance(note["announce"], bool)
            self.assertNotIn("minVersion", note)
            self.assertNotIn("products", note)
            self.assertTrue(note["title"])
            self.assertTrue(note["description"])
            for key in ["url", "markdownURL"]:
                self.assertEqual(urlparse(note[key]).netloc, "docs.cvat.ai")
            versions.append(note["version"])
        self.assertEqual(len(versions), len(set(versions)))

    def test_markdown_export_contains_authored_body_without_front_matter(self):
        for note in self.feed["entries"]:
            exported = self.output / urlparse(note["markdownURL"]).path.lstrip("/")
            source = ROOT / "site/content/en/release-notes" / note["version"] / "index.md"
            body = source.read_text().split("---", 2)[2].strip()
            self.assertEqual(exported.read_text().strip(), body)
            html_page = self.output / urlparse(note["url"]).path.lstrip("/") / "index.html"
            self.assertIn("<h1>", html_page.read_text())

    def test_relative_media_urls_resolve_to_published_assets(self):
        for note in self.feed["entries"]:
            body = (self.output / urlparse(note["markdownURL"]).path.lstrip("/")).read_text()
            media = re.findall(r'(?:src|poster)="([^"]+)"|!\[[^\]]*\]\(([^)]+)\)', body)
            for html_url, image_url in media:
                media_url = urljoin(note["markdownURL"], html_url or image_url)
                asset = self.output / urlparse(media_url).path.lstrip("/")
                self.assertTrue(asset.is_file(), media_url)
                self.assertGreater(asset.stat().st_size, 0)

    def test_docs_header_links_to_history(self):
        page = (self.output / "docs/index.html").read_text()
        navbar = page.split("<nav", 1)[1].split("</nav>", 1)[0]
        self.assertIn('href="/release-notes/"', navbar)
        history = (self.output / "release-notes/index.html").read_text()
        for note in self.feed["entries"]:
            self.assertIn(html.escape(note["title"]), history)

    def test_versioned_docs_link_to_the_shared_history(self):
        page = (self.versioned_output / "docs/index.html").read_text()
        navbar = page.split("<nav", 1)[1].split("</nav>", 1)[0]
        self.assertIn('href="/release-notes/"', navbar)
        self.assertNotIn('href="/v2.79.0/release-notes/"', navbar)


if __name__ == "__main__":
    unittest.main()
