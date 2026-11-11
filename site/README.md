## Basic manual

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
- `announce: true` makes the release eligible for automatic notification.
  `false` keeps it available without triggering the popup.
- Put changes inside `release-section` blocks. Use `all`, `community`, `enterprise`,
  `saas`, or comma-separated editions such as `enterprise,saas`. Do not nest blocks.
- The popup shows the first **five matching headings**, extracted automatically from
  the article; no separate summary list is needed. Keep headings descriptive and concise.
- The public docs show all sections and their availability labels. The app filters
  sections by its edition and excludes releases newer than its installed CVAT version.

#### Announcements

```markdown
---
id: "annotation-workflow-guide"
title: "Explore the new annotation workflow"
description: "One or two sentences for the popup preview."
date: 2026-11-10T12:01:00Z
editions: [saas, enterprise]
popup: true
image: /announcements/annotation-workflow-guide/preview.png
image_alt: "Annotation editor showing the new workflow"
cta: "Read the guide"
---

Write the full announcement here using Markdown.
```

- Use a unique, permanent `id`: lowercase letters, numbers, hyphens, or underscores.
- Give each announcement a unique publication timestamp with a timezone.
- `editions` is required; use `community`, `enterprise`, and/or `saas` (CVAT Online).
- `popup: true` allows automatic notification. `false` keeps the announcement
  available without triggering the popup.
- `image`, `image_alt`, `video`, and `cta` are optional. For a preview video, set
  `video: /announcements/<slug>/demo.mp4`. The CTA links to the announcement's own docs page.
- The popup displays the latest five eligible announcements. SaaS can include posts
  from an additional website provider; those posts do not need a duplicate Hugo article.

#### Media and publishing

Use relative image links in the article body, such as `![Description](preview.png)`.
Videos can use standard HTML:

```html
<video controls preload="none" poster="preview.png">
  <source src="demo.mp4" type="video/mp4">
</video>
```

Preview locally using the instructions below, then submit a PR to `develop`.
After merge, the docs pipeline publishes the pages and generates the JSON feeds
automatically; do not edit generated JSON. No CVAT application deployment is required.
The app gets new content on a subsequent page load after the backend cache refreshes,
subject to notification preferences and the user's last-seen state.

Keep IDs, versions, and publication timestamps unchanged when correcting existing
articles. Publish new announcements with a new ID and a current timestamp; backdated
entries can be missed by users who have already seen newer content. No `draft` field is
needed: review happens through the PR.

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
