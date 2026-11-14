## Basic manual

### How to edit or add documentation pages online

To edit and/or add documentation, you need to have a [GitHub](https://github.com/login) account.
To change documentation files or add a documentation page,
simply click `Edit this page` on the page you would like to edit.
If you need to add a child page, click `Create child page`.

If you need to edit the text that has the markup [markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet),
click on the `Fork this repository` button.

Read how to edit files for github ([GitHub docs](https://docs.github.com/en/github/managing-files-in-a-repository/editing-files-in-another-users-repository)).

Please note that files have a markup for correct display on the site: the title, the title of the link,
the weight (affects the order of files displayed on the sidebar) and description (optional):

```
---
title: "Title"
linkTitle: "Link Title"
weight: 1
description: >
    Description
---
```

### How to mark a page as product-specific

CVAT has three products: **Community** (free, self-hosted), **Online** (managed cloud,
with Solo and Team plans), and **Enterprise** (self-hosted, paid). Most documentation
applies to all three, since Online and Enterprise both build on top of Community
functionality — Enterprise in particular is a superset of Community, not a separate
product, so a page is only Community-only if Enterprise genuinely replaces it with its
own version (for example, deployment guides). When in doubt, assume a page is shared.

**Default: no tag needed.** A page with no `products` field is treated as relevant to
every product. Do not add a tag just to say "this applies everywhere" — only tag pages
that are restricted to a subset of products.

**Whole-page restriction:** if an entire page only applies to one or more products (e.g.
a paid feature, or a product-specific deployment guide that fully replaces the Community
version), add a `products` field to the front matter:

```
---
title: "Title"
products:
  - enterprise
---
```

Allowed values: `community`, `online`, `enterprise`. Use as many as apply. This renders a
"Relevant for" badge at the top of the page and adds the page to the corresponding
`/docs/products/<name>/` listing (see `layouts/shortcodes/pages-by-product.html` and
`layouts/partials/product-tags.html`).

**Partial-page restriction:** if a page is mostly shared but just one paragraph, list
item, or table cell describes a gated feature, don't tag the whole page — use the inline
badge shortcode instead, right next to the relevant text:

```
{{< product-badge "online,enterprise" >}}
```

**Solo vs. Team (within Online):** there's no separate front matter field for this — the
product-level tags don't distinguish plans within Online. If a feature differs between
Solo and Team (e.g. only Team can create organizations and invite members), call it out
with a short inline note near that section instead.

Before tagging, check the actual restriction rather than guessing from folder location
or a legacy URL alias — verify what the page's text says, and if there's no explicit
statement, confirm with the team before adding a tag.

### Writing release notes and announcements

Create an `index.md` in one of these folders, with any images or videos alongside it:

- Release notes: `site/content/release-notes/<version>/index.md`
- Announcements: `site/content/announcements/<slug>/index.md`

These paths do not include `en/`. Keep authoring guides outside `site/content/`;
Markdown files there are published as content.

#### Release notes

```markdown
---
title: "CVAT 2.81: annotation improvements"
description: "A short overview of the release."
date: 2026-11-10T12:00:00Z
version: "2.81.0"
announce: true
---

{{< release-section title="Faster annotation review" editions="all" >}}
Explain the change and how to use it.

![Annotation review](review.png)
{{< /release-section >}}

{{< release-section title="Enterprise deployment improvements" editions="enterprise" >}}
Describe the Enterprise-specific change.
{{< /release-section >}}
```

- Use a unique version in `X.Y.Z` format.
- `announce`: whether the release notes are eligible for automatic user notifications.
  Defaults to `false`.
- Put changes inside `release-section` blocks. Use `all`, `community`, `enterprise`,
  `saas`, or comma-separated editions such as `enterprise,saas`. Do not nest blocks.
- The `title` argument becomes the section heading. For example,
  `title="Faster annotation review"` creates a heading named "Faster annotation review".
- Keep section titles descriptive and concise.
- The public docs show all sections and their availability labels.

#### Announcements

```markdown
---
id: "annotation-workflow-guide"
title: "Explore the new annotation workflow"
description: "One or two sentences summarizing the announcement."
date: 2026-11-10T12:01:00Z
announce: true
image: /announcements/annotation-workflow-guide/preview.png
image_alt: "Annotation editor showing the new workflow"
video: /announcements/annotation-workflow-guide/demo.mp4
cta: "Read the guide"
---

Write the full announcement here using Markdown.
```

- Use a unique, permanent `id`: lowercase letters, numbers, hyphens, or underscores.
- The `id` does not need to match the folder name. Using the same value is recommended
  for clarity. Keep the ID unchanged when updating an existing announcement.
- Give each announcement a unique publication timestamp with a timezone.
- Omit `editions` to make the announcement available to all editions, without a
  product restriction badge. To restrict availability, specify a non-empty list using
  `community`, `enterprise`, and/or `saas` (CVAT Online), for example
  `editions: [saas, enterprise]`.
- `announce`: whether the announcement is eligible for automatic user notifications.
  Defaults to `false`.
- `image`, `image_alt`, `video`, and `cta` are optional. Images and videos can be provided
  together; the image can serve as a video poster or fallback.
- The CTA links to the announcement's own docs page.

#### Media and publishing

Use relative image links in the article body, such as `![Description](preview.png)`.
To embed a video in the published page, insert the following HTML into the body of
`index.md`, after the closing `---` of the front matter:

```html
<video controls preload="none" poster="preview.png">
  <source src="demo.mp4" type="video/mp4">
</video>
```

Preview locally using the instructions below, then submit a PR to `develop`.
After merge, the docs pipeline publishes the pages and generates the JSON feeds
automatically; do not edit generated JSON. No CVAT application deployment is required.

Keep IDs, versions, and publication timestamps unchanged when correcting existing
articles. Publish new announcements with a new ID and a current timestamp; backdated
entries can be missed by users who have already seen newer content.

### How to start the site locally

#### Installation

1. Install Hugo

Get the [v110.0-extended release of hugo](https://github.com/gohugoio/hugo/releases/tag/v0.110.0).
Expand the Assets section of the release on GitHub and scroll down
until you find a list of **Extended** versions.
[Read more](https://gohugo.io/getting-started/installing/#quick-install)

Add a path to `hugo` in the `PATH` environment variable.

2. Get the Docsy theme code

```bash
git submodule update --init --recursive
```

3. Install the Docsy theme dependencies

To build or update your site’s CSS resources, you will need several packages installed.
To install them, you must have a recent version of [NodeJS](https://nodejs.org/en/)
installed on your machine (tested with v18.0). For this, you can use
[npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) directly
or via an environment manager like [nvm](https://github.com/nvm-sh/nvm).
By default `npm` installs tools under the directory where you run `npm install`.

```bash
(cd site/ && npm ci)
```

The full documentation is available
[here](https://www.docsy.dev/docs/get-started/other-options/#for-an-existing-site).

4. Populate the SDK examples tree

Several docs pages embed scripts from `cvat-sdk/examples/` via the
`include-code` Hugo shortcode, which reads them from
`site/assets/sdk-examples/`. That directory is gitignored, so before
running `hugo server` you need to populate it — otherwise the embedded
code blocks will be empty.

Symlink the examples directory into the site tree:

```bash
ln -s ../../cvat-sdk/examples site/assets/sdk-examples
```

Edits to the example scripts are then picked up automatically on the
next `hugo server` refresh.

5. To preview your site locally, use:

```bash
(cd site/ && hugo server)
```

By default, your site will be available at <http://localhost:1313/docs/>.

#### How to build for production deployment

1. Install dependencies

```bash
cd site/
pip -m venv venv
. venv/bin/activate
pip install -r requirements.txt
```

The documentation site includes the last MAX_VERSIONS_TO_BUILD releases
(they are defined in `build_docs.py`). To build the website, you only need:
- `hugo-0.110` - for all documentation builds

Please download this hugo release (extended), and make the binary
available in your `PATH` environment variable.

On Linux, you can install it this way:

```bash
wget https://github.com/gohugoio/hugo/releases/download/v0.110.0/hugo_extended_0.110.0_Linux-64bit.tar.gz
(mkdir hugo_extended_0.110.0_Linux-64bit && tar -xf hugo_extended_0.110.0_Linux-64bit.tar.gz -C hugo_extended_0.110.0_Linux-64bit)
cd hugo_extended_0.110.0_Linux-64bit
sudo cp hugo /usr/local/bin/hugo-0.110
```

2. Use the commands that generate a static site in the `public/` folder:

Make sure to generate the SDK code first.

```bash
python process_sdk_docs.py --input-dir ../cvat-sdk/docs/ --site-root .

python build_docs.py
```

The resulting folder contains the whole site, which can be published by a server like Apache.
Read more [here](https://www.docsy.dev/docs/getting-started/)
and [here](https://gohugo.io/hosting-and-deployment/).

You can also deploy the website locally:
```bash
python -m http.server -d path/to/public
```

### How to update the submodule of the Docsy theme

To update the submodule of the docsy theme, you need to have a repository clone.
While in the repository folder, use the git command:

```bash
git submodule update --remote
```

Add and then commit the change to project:

```bash
git add themes/
git commit -m "Updating theme submodule"
```

Push the commit to project repo. For example, run:

```bash
git push
```

Make sure to update the corresponding configuration files and
theme overrides (`layouts/`, `i18n/`, etc.).
