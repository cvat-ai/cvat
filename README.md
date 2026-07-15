# SustAInLivWork Annotation Tool

A self-hosted, rebranded fork of [CVAT](https://github.com/cvat-ai/cvat) (Computer Vision Annotation
Tool), tracking CVAT's `develop` branch.

This fork is meant to be built and hosted on your own premises. It is trimmed down accordingly: no
DICOM tooling, no SSO/Keycloak documentation, no Let's Encrypt HTTPS overlay, and no CI jobs that
publish to registries we don't own.

Everything else is stock CVAT. For how to actually _use_ the annotation tool — tasks, jobs,
annotation formats, the API, automatic annotation — refer to the
[upstream CVAT documentation](https://docs.cvat.ai/docs/). It all applies here.

---

## Quick start

> **Read this first.** A plain `docker compose up` will **not** run this fork.
>
> CVAT's base `docker-compose.yml` has no `build:` section — it pulls the published `cvat/server`
> and `cvat/ui` images from Docker Hub. Run it on its own and you get **stock CVAT**, not your
> branding and not your changes. Building from source requires the `docker-compose.dev.yml` overlay,
> which is what supplies the `build:` sections.

Build the images from this source tree and start the stack:

```bash
./serverless.sh up --build
```

`serverless.sh` is the default launcher for this fork. It runs `docker compose` with the base file,
the dev overlay (which builds the branded images from source), and the Nuclio serverless overlay that
powers semi-automatic annotation. The first build takes a while. When it finishes, CVAT is on
**<http://localhost:8080>**.

Create an administrator:

```bash
./serverless.sh exec cvat_server \
    python3 /home/django/manage.py createsuperuser
```

Then sign in at <http://localhost:8080>.

Stop the stack (add `-v` to also delete the database volume — this destroys all users and
annotations):

```bash
./serverless.sh down
```

### Subsequent runs

Once the images are built and tagged locally, `./serverless.sh up` (no `--build`) starts what you
already built. Re-run with `--build` whenever you change the source.

To run **without** the AI subsystem — plain CVAT, no Nuclio — skip the launcher:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Ports

The base compose file binds only **8080** (the app) and **8090** (Traefik). The `docker-compose.dev.yml`
overlay additionally exposes Postgres (5432), Redis (6379, 6666), ClickHouse (8123), OPA (8181),
Vector (8282) and the worker debug ports (9090–9096). Use the overlay for building; you don't need
those ports published in production.

## Semi-automatic annotation

`./serverless.sh up` launches CVAT with the [Nuclio](https://nuclio.io/) serverless subsystem
enabled — the infrastructure CVAT uses for AI-assisted (semi-automatic) annotation such as
Segment Anything. The server runs with `CVAT_SERVERLESS=1`, so the AI-tools controls appear in the
annotation UI.

**No models are deployed by default.** The subsystem comes up empty: the AI-tools menu will show an
empty model list until you deploy a function. This is intentional — model images are large (several
GB each) and the interactive segmentation models expect a CUDA GPU, so deploying one is a deliberate,
separate step for when you have suitable hardware. To deploy a model, use CVAT's own tooling
(`serverless/deploy_gpu.sh` on a CUDA host, or `serverless/deploy_cpu.sh` for slow CPU inference) —
see the [upstream serverless tutorial](https://docs.cvat.ai/docs/manual/advanced/serverless-tutorial/).

> **Apple Silicon note:** Nuclio's dashboard image is `amd64`-only, so on an ARM Mac it runs under
> emulation — it starts, just slowly, and Docker may warn about the platform mismatch. On an
> `amd64` Linux host it runs natively.

## Deploying on-premises

### TLS

The upstream Traefik + Let's Encrypt (`docker-compose.https.yml`) overlay has been **removed**.
Traefik still fronts the app and serves plain HTTP on `:80`/`:8080`.

**Terminate TLS yourself**, with your own reverse proxy (nginx, Traefik, a load balancer, an ingress
controller) in front of CVAT. Do not expose the HTTP port directly to an untrusted network.

Set `CVAT_HOST` to the hostname users will reach the instance on — Traefik's routing rules and the
Grafana root URL both depend on it:

```bash
export CVAT_HOST=annotate.example.com
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Authentication

Standard email/password registration and login, provided by `django-allauth`.

SSO (OIDC/SAML) is an **enterprise-only CVAT feature and is not implemented in the open-source
codebase** — there was never anything to configure here. Its documentation has been removed to avoid
implying otherwise.

## Branding

The logo is generated from `sustainlivework_transparent.png` by a checked-in script:

```bash
brew install potrace      # one-time; or: pip install potracer
python3 tools/branding/trace_logo.py
```

It traces the source PNG and writes three assets:

| Asset | Used for |
| --- | --- |
| `cvat/apps/engine/static/logo.svg` | App header — a one-line horizontal wordmark, derived by re-laying the source's three stacked lines onto a single baseline (the header slot is only 32px tall, where the stacked lockup would be illegible). Served via the `LOGO_FILENAME` Django setting. |
| `cvat-ui/src/assets/sustainlivwork-stacked.svg` | Login/register page — the full stacked lockup. |
| `cvat-ui/src/assets/favicon.svg` | Browser tab — the teal `AI` mark alone. |

Brand colours: black `#000000`, teal `#00B394`.

> **If you regenerate the assets:** the script groups paths by colour and tags them
> `class="brand-ink"` / `class="brand-teal"`. The login page stylesheet
> (`cvat-ui/src/components/signing-common/styles.scss`) recolours the glyphs by selecting on
> `.brand-teal`. Keep those class names, or the teal "AI" will silently render the wrong colour with
> no build error.

To replace the logo entirely, drop in a new source PNG, update `SRC` and the `BANDS` pixel
coordinates in `tools/branding/trace_logo.py`, and re-run it.

## Staying current with upstream CVAT

This repo is a fork of `cvat-ai/cvat` and carries CVAT's full history, so upstream changes merge in
normally. Add the upstream remote once:

```bash
git remote add upstream https://github.com/cvat-ai/cvat.git
```

Then pull in new work:

```bash
git fetch upstream --tags
git merge upstream/develop   # or a release tag, e.g. `git merge v2.71.0`
```

Our changes are deliberately kept to small, isolated commits to keep that merge cheap. Expect
occasional conflicts in the files we touched: the CI workflows, the docs pages we pruned, and
`cvat-ui/src/components/signing-common/`.

## What was changed from upstream

| Area | Change |
| --- | --- |
| DICOM | `utils/dicom_converter/` removed. It was a standalone offline script, not wired into the server. |
| SSO / Keycloak | Enterprise-only SSO and social-auth docs removed, along with three orphaned social-provider logo assets. **`django-allauth` is retained** — it powers ordinary email/password login, and removing it would break authentication. |
| HTTPS | `docker-compose.https.yml` (Traefik + Let's Encrypt ACME) removed; TLS is terminated on-premises. |
| CI | Jobs requiring credentials this repo doesn't have are removed: Docker Hub publish, S3/Allure reports, Codecov, PyPI, and cvat.ai cross-repo triggers. Build, unit / REST / e2e / Helm tests and linters are all retained. |
| Branding | SustAInLivWork logo in the app header, on the login page, and as the favicon. Light login page. |

## Licence & attribution

CVAT is developed by [CVAT.ai](https://www.cvat.ai/) and contributors, and is licensed under the
[MIT License](LICENSE). This fork inherits that licence. Upstream:
<https://github.com/cvat-ai/cvat>
