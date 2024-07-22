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
the weight (affects the order of files display on the sidebar) and description (optional):

```
---
title: "Title"
linkTitle: "Link Title"
weight: 1
description: >
    Description
---
```


### How to start the site locally

#### Installation

1. Install Hugo

Get the [v110.0-extended release of hugo](https://github.com/gohugoio/hugo/releases/tag/v0.110.0).
Expand the Assets section of the release on GitHub and and scroll down
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

4. To preview your site locally, use:

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

The documentation site includes both old and new releases. Because of this,
you will need tooling for all these releases. Currently, it means you need
in your environment:
- `hugo-0.110` - for new docs
- `hugo-0.83` - for older docs

Please download these hugo releases (both extended), and make such binaries
available in your `PATH` environment variable.

On Linux, you can install it this way:

```bash
wget https://github.com/gohugoio/hugo/releases/download/v0.110.0/hugo_extended_0.110.0_Linux-64bit.tar.gz
(mkdir hugo_extended_0.110.0_Linux-64bit && tar -xf hugo_extended_0.110.0_Linux-64bit.tar.gz -C hugo_extended_0.110.0_Linux-64bit)
cd hugo_extended_0.110.0_Linux-64bit
sudo cp hugo /usr/local/bin/hugo-0.110

wget https://github.com/gohugoio/hugo/releases/download/v0.83.0/hugo_extended_0.83.0_Linux-64bit.tar.gz
(mkdir hugo_extended_0.83.0_Linux-64bit && tar -xf hugo_extended_0.83.0_Linux-64bit.tar.gz -C hugo_extended_0.83.0_Linux-64bit)
cd hugo_extended_0.83.0_Linux-64bit
sudo cp hugo /usr/local/bin/hugo-0.83
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
