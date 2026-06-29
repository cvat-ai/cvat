
# Clone repo at root

# install and activate

Check : https://docs.cvat.ai/docs/contributing/development-environment/

```bash
cd ~
cd cvat && mkdir logs keys
python3 -m venv .env
. .env/bin/activate
pip install -U pip wheel setuptools
pip install --no-binary lxml,xmlsec -r cvat/requirements/development.txt -r dev/requirements.txt
```

```bash
cd ~/cvat
source .env/bin/activate
code .
```


# Edit in VS Code and start
In VS Code:
* Left sidebar → Run & Debug (▶️ icon)
* Top dropdown → select:server: debug


# Start Frontend (UI)

## Prerequisites - Node.js Setup

Make sure Node.js is properly configured. If you encounter `/usr/bin/env: 'node': No such file or directory` error:

### Using nvm (Node Version Manager)

```bash
# Activate nvm in your current shell
source ~/.nvm/nvm.sh

# Use the default Node.js version
nvm use default

# Verify Node.js is working
node --version
```

### Alternative: Add Node.js to PATH permanently

Add these lines to your `~/.bashrc` or `~/.bash_profile`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
```

Then reload: `source ~/.bashrc`

## Starting Development Server

### Option 1: From cvat-ui directory (recommended for UI development)

```bash
cd cvat-ui
yarn install
yarn run start
```

The dev server will start at http://localhost:3000 with API proxy to http://localhost:7000

### Option 2: From project root

```bash
# Ensure nvm is loaded
source ~/.nvm/nvm.sh && nvm use default

# Start from root directory
cd ~/cvat
yarn run start:cvat-ui
```

**Note:** Do NOT use `sudo` with yarn commands - it breaks nvm's Node.js PATH configuration.

### Dev Server Features

- **Hot Module Replacement (HMR)**: Changes to React components automatically update in the browser
- **Source Maps**: Enabled for easier debugging
- **API Proxy**: Automatically proxies `/api/*`, `/static/*`, `/admin/*` etc. to backend at localhost:7000
- **Port**: Frontend runs on `http://localhost:3000`
- **Backend API**: Should be running on `http://localhost:7000`

---

# Update with upstream

Example with cvat stable version v2.67.0
```bash
git fetch upstream tag v2.67.0
git switch dev
git branch backup/dev-before-cvat-v2.67.0
git merge v2.67.0
git push origin dev
```

# UI Customization Guide

## Project Structure

```
cvat-ui/
├── src/
│   ├── components/          # React components
│   │   ├── annotation-page/ # Annotation interface
│   │   ├── projects-page/   # Projects list
│   │   ├── tasks-page/      # Tasks management
│   │   └── ...
│   ├── containers/          # Redux-connected containers
│   ├── reducers/            # Redux state management
│   ├── actions/             # Redux actions
│   ├── styles/              # SCSS stylesheets
│   └── utils/               # Utility functions
├── public/
│   ├── catalogue/           # Custom catalogues (e.g., road_signs.json)
│   └── assets/              # Static assets
├── plugins/                 # UI plugins (e.g., SAM)
└── webpack.config.js        # Webpack configuration
```

## Common Customization Tasks

### 1. Adding Custom Catalogues

Create JSON files in `cvat-ui/public/catalogue/`:

```json
{
  "name": "My Custom Catalogue",
  "description": "Custom reference catalogue",
  "items": [
    {
      "id": "item1",
      "name": "Item Name",
      "icon": "/catalogue/icons/item1.png",
      "description": "Item description"
    }
  ]
}
```

See: `cvat-ui/public/catalogue/road_signs.json` as an example.

### 2. Modifying Components

Key component locations:
- **Annotation UI**: `cvat-ui/src/components/annotation-page/`
- **Objects Sidebar**: `cvat-ui/src/components/annotation-page/standard-workspace/objects-side-bar/`
- **Project/Task Lists**: `cvat-ui/src/components/projects-page/`, `cvat-ui/src/components/tasks-page/`
- **Canvas Controls**: `cvat-ui/src/components/annotation-page/standard-workspace/controls-side-bar/`

### 3. Styling Changes

CVAT UI uses:
- **Ant Design** components (customizable via theme)
- **SCSS** for custom styles in `cvat-ui/src/styles/`
- **CSS Modules** for component-scoped styles

To modify global styles:
```bash
# Edit base styles
vim cvat-ui/src/styles/base.scss

# Edit component-specific styles
vim cvat-ui/src/components/annotation-page/annotation-page.scss
```

### 4. Adding Environment Variables

Create or edit `.env` files:

```bash
# Development environment
vim cvat-ui/.env.development

# Example variables:
REACT_APP_API_URL=http://localhost:7000
REACT_APP_CUSTOM_FEATURE=enabled
```

Variables must be prefixed with `REACT_APP_` to be accessible in the app.

### 5. Webpack Configuration

Edit `cvat-ui/webpack.config.js` for:
- Custom loaders
- Plugin configuration
- Build optimization
- Proxy settings

Current proxy config forwards these patterns to backend:
- `/api/*`
- `/analytics/*`
- `/static/*`
- `/admin/*`
- `/documentation/*`

### 6. Creating Custom Plugins

Plugins directory: `cvat-ui/plugins/`

Example plugin structure:
```
plugins/
└── my-plugin/
    ├── src/
    │   └── ts/
    │       └── index.tsx    # Plugin entry point
    └── package.json
```

Plugins are automatically loaded by webpack if properly configured.

## Development Workflow

1. **Make changes** to source files in `cvat-ui/src/`
2. **Save** - Webpack dev server will auto-reload
3. **Test** in browser at http://localhost:3000
4. **Debug** using browser DevTools with source maps
5. **Lint** your changes: `yarn run lint:fix`
6. **Type check**: `yarn run type-check`

## Building for Production

```bash
cd cvat-ui
yarn run build
```

Production build output: `cvat-ui/dist/`

## Useful Commands

```bash
# Lint TypeScript/React code
yarn run lint

# Auto-fix linting issues
yarn run lint:fix

# Type checking without emitting
yarn run type-check

# Type checking in watch mode
yarn run type-check:watch

# Build production bundle
yarn run build

# Start dev server
yarn run start
```

## Troubleshooting

### Port already in use
If port 3000 is busy:
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

### Node.js not found
See "Prerequisites - Node.js Setup" section above

### Module not found errors
```bash
# Clean install dependencies
rm -rf node_modules
yarn install
```

### Build errors after pulling changes
```bash
# Reinstall dependencies
yarn install

# Rebuild all workspaces
cd ~/cvat
yarn run build:cvat-data
yarn run build:cvat-core
yarn run build:cvat-canvas
yarn run build:cvat-canvas3d
yarn run build:cvat-ui
```

---

# Container Management

## How OPA Rules Work (Important!)

CVAT uses [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) for access control.
The Django server (`cvat_server`) bundles all `.rego` files and serves them at `/api/auth/rules`.
OPA polls this endpoint every 5–15 seconds to update its rules.

The bundle is built by `cvat/apps/iam/utils.py::get_opa_bundle()`, which uses
`@functools.lru_cache(maxsize=None)` — the bundle is cached in memory **forever** until
the Django process restarts. This means:

- Copying `.rego` files into the container does **not** automatically refresh OPA.
- You must restart `cvat_server` so the cache is cleared and the new rules are served.

**Symptom of stale OPA rules:**
```
FieldError at /api/projects
Cannot resolve keyword 'org_filter_proof' into field.
```
This happens because the old cached bundle doesn't include `"org_filter_proof"` in filter
expressions, so the required queryset alias is never added.

## Restart cvat_server (after changing .rego files)

This is the quickest fix — no rebuild needed:

```bash
docker restart cvat_server
```

After ~15 seconds OPA will re-poll and pick up the new rules.
Then re-attach the VS Code debugger (Run & Debug → server: debug).

## Rebuild and Restart All Containers

Do a full rebuild when you change:
- `Dockerfile` or `Dockerfile.ui`
- `cvat/requirements/*.txt` (Python dependencies)
- `package.json` / `yarn.lock` (JS dependencies)
- After a major upstream merge (`git merge upstream/dev`)

```bash
cd ~/cvat

# 1. Stop all running services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# 2. Rebuild images that have a build: section (cvat_server, cvat_ui, workers)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# 3. Start everything again
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

To also force-recreate containers that were not rebuilt (e.g. OPA, Redis):
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --force-recreate
```

> ⚠️ `down` without `-v` keeps your database volume intact.
> Add `-v` only if you want to wipe all data and start fresh:
> `docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v`

## Apply Database Migrations (after Python model changes)

```bash
docker exec cvat_server python manage.py migrate
```

## Rebuild Only cvat_server (faster, skips UI)

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build cvat_server \
  cvat_worker_export cvat_worker_import cvat_worker_quality_reports \
  cvat_worker_consensus cvat_worker_annotation

docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps \
  cvat_server cvat_worker_export cvat_worker_import cvat_worker_quality_reports \
  cvat_worker_consensus cvat_worker_annotation
```
