# CLAUDE.md - AI Assistant Guide for CVAT Development

This document provides comprehensive guidance for AI assistants working with the CVAT (Computer Vision Annotation Tool) codebase. It covers the architecture, development workflows, coding conventions, and common tasks.

**Last Updated**: 2025-11-21
**CVAT Version**: Latest (based on develop branch)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Repository Structure](#repository-structure)
5. [Development Environment Setup](#development-environment-setup)
6. [Build System](#build-system)
7. [Testing](#testing)
8. [Coding Standards](#coding-standards)
9. [Common Development Tasks](#common-development-tasks)
10. [API Structure](#api-structure)
11. [Key Patterns and Conventions](#key-patterns-and-conventions)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**CVAT** (Computer Vision Annotation Tool) is an open-source, web-based tool for annotating images and videos for computer vision applications. It supports multiple annotation formats and includes features for:

- Image and video annotation (2D and 3D)
- Multiple annotation types (bounding boxes, polygons, polylines, points, cuboids, skeletons)
- Organization and project management
- Quality control and consensus annotations
- Serverless ML functions for auto-annotation
- Cloud storage integration (AWS S3, Azure Blob, Google Cloud Storage)
- REST API and Python SDK for programmatic access

**Repository**: https://github.com/cvat-ai/cvat
**License**: MIT
**Primary Language**: Python (backend), TypeScript/JavaScript (frontend)

---

## Technology Stack

### Backend
- **Framework**: Django 4.2.26 (Python 3.10+)
- **API**: Django REST Framework 3.16.0
- **Database**: PostgreSQL 15
- **Caching**:
  - Redis 7.2.11 (in-memory cache)
  - Apache Kvrocks 2.12.1 (on-disk cache)
- **Task Queue**: RQ (Redis Queue) with django-rq 2.8.1
- **Authentication**: Django Allauth (supports Token, Session, Basic, LDAP, SAML)
- **Authorization**: Open Policy Agent (OPA) 0.63.0 with Rego policies
- **API Documentation**: drf-spectacular (OpenAPI 3.0)
- **Analytics**: ClickHouse 23.11 + Grafana 10.1.2
- **Data Processing**: Datumaro (custom fork), NumPy, Pandas, SciPy
- **Video Processing**: FFmpeg 8.0, PyAV 12.0.0
- **Cloud Storage**: boto3 (AWS), azure-storage-blob, google-cloud-storage
- **Process Manager**: Supervisor

### Frontend
- **Framework**: React 18.2.0 + TypeScript 5.0.2
- **State Management**: Redux 4.1.1 with Redux-Thunk
- **Routing**: React Router 5.1.0
- **UI Framework**: Ant Design 5.17.1
- **Canvas**: Custom cvat-canvas (SVG.js 2.7.1, Fabric.js 5.2.1) and cvat-canvas3d
- **Build Tool**: Webpack 5.94.0
- **Package Manager**: Yarn 4.9.2 (with workspaces)
- **Styling**: SASS 1.42.1
- **Charting**: Chart.js 4.4.8

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (Helm Charts)
- **Reverse Proxy**: Traefik v3.6
- **Web Server**: Nginx (serves static frontend)

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Traefik (Port 8080)                     │
│                    Reverse Proxy / Router                    │
└──────────────────┬──────────────────────┬───────────────────┘
                   │                      │
          ┌────────▼────────┐    ┌───────▼────────┐
          │   CVAT UI       │    │  CVAT Server   │
          │   (Nginx)       │    │   (Django)     │
          │   Port 80       │    │   Port 8080    │
          └─────────────────┘    └───────┬────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
           ┌────────▼─────────┐  ┌──────▼──────┐   ┌────────▼────────┐
           │   PostgreSQL     │  │   Redis     │   │   RQ Workers    │
           │   (Port 5432)    │  │  (6379/     │   │   (Background   │
           │                  │  │   6666)     │   │    Tasks)       │
           └──────────────────┘  └─────────────┘   └────────┬────────┘
                                                              │
                    ┌─────────────────────────────────────────┤
                    │ Worker Types:                           │
                    │ - import (data import)                  │
                    │ - export (annotation export)            │
                    │ - annotation (quality reports)          │
                    │ - webhooks (webhook delivery)           │
                    │ - quality_reports (quality analysis)    │
                    │ - chunks (media processing)             │
                    │ - consensus (consensus calculation)     │
                    │ - utils (cleanup jobs)                  │
                    └─────────────────────────────────────────┘

           ┌────────────────┐    ┌──────────────┐
           │  ClickHouse    │───▶│   Grafana    │
           │  (Analytics)   │    │ (Dashboard)  │
           └────────────────┘    └──────────────┘
                    ▲
                    │
           ┌────────┴────────┐
           │     Vector      │
           │  (Log Router)   │
           └─────────────────┘
```

### Component Interaction Flow

1. **User Request** → Traefik → CVAT UI (static files) or CVAT Server (API)
2. **API Request** → Django View → Business Logic → Database/Cache
3. **Background Tasks** → RQ Queue → Worker → Processing → Update Database
4. **Authorization** → OPA evaluates Rego policies → Allow/Deny
5. **Analytics** → Application logs → Vector → ClickHouse → Grafana

### Frontend Architecture (Monorepo)

```
cvat-data (Data Layer)
    ↓
cvat-core (API Client)
    ↓
cvat-canvas & cvat-canvas3d (Rendering)
    ↓
cvat-ui (React Application)
```

**Important**: Changes to lower-level packages require rebuilding dependent packages.

---

## Repository Structure

### Root Directory Overview

```
cvat/
├── .github/              # GitHub Actions CI/CD workflows
├── .vscode/              # VS Code debug configurations
├── cvat/                 # Django backend (main server code)
├── cvat-ui/              # React frontend application
├── cvat-core/            # TypeScript API client library
├── cvat-canvas/          # 2D canvas library for annotation
├── cvat-canvas3d/        # 3D canvas library (point clouds)
├── cvat-data/            # Data fetching and caching layer
├── cvat-sdk/             # Python SDK
├── cvat-cli/             # Command-line interface
├── serverless/           # Auto-annotation serverless functions
├── tests/                # Test suites
│   ├── cypress/         # E2E tests (UI)
│   └── python/          # Backend, SDK, CLI tests
├── helm-chart/           # Kubernetes Helm charts
├── site/                 # Documentation website (Hugo)
├── components/           # Optional services (analytics)
├── utils/                # Utility scripts
├── dev/                  # Development tools
├── docker-compose*.yml   # Docker orchestration files
├── Dockerfile*           # Container image definitions
└── manage.py             # Django management CLI
```

### Backend Structure (`cvat/`)

```
cvat/
├── apps/                           # Django applications
│   ├── engine/                    # Core: tasks, jobs, projects, annotations
│   │   ├── models.py              # Database models
│   │   ├── serializers.py         # DRF serializers
│   │   ├── views.py               # API endpoints (ViewSets)
│   │   ├── permissions.py         # Permission checks
│   │   ├── urls.py                # URL routing
│   │   ├── rules/                 # OPA Rego policies
│   │   └── tests/                 # Unit tests
│   ├── iam/                       # Identity & Access Management
│   ├── organizations/             # Multi-tenancy
│   ├── dataset_manager/           # Import/export formats
│   ├── lambda_manager/            # Serverless function integration
│   ├── webhooks/                  # Webhook management
│   ├── quality_control/           # Quality metrics
│   ├── consensus/                 # Consensus annotations
│   ├── events/                    # Event tracking
│   └── analytics/                 # Analytics reporting
├── settings/
│   ├── base.py                    # Base Django settings
│   ├── production.py              # Production config
│   ├── development.py             # Development config
│   └── testing.py                 # Test config
├── requirements/                   # Python dependencies
│   ├── base.in / base.txt         # Core dependencies
│   ├── production.in / .txt       # Production-only
│   ├── development.in / .txt      # Development tools
│   └── testing.in / .txt          # Testing frameworks
└── schema.yml                     # OpenAPI 3.0 API schema
```

### Frontend Structure (`cvat-ui/src/`)

```
cvat-ui/src/
├── actions/                       # Redux actions
│   ├── annotation-actions.ts
│   ├── tasks-actions.ts
│   └── ...
├── reducers/                      # Redux reducers
│   ├── annotation-reducer.ts
│   ├── tasks-reducer.ts
│   └── root-reducer.ts
├── components/                    # React components (55+ modules)
│   ├── annotation-page/          # Main annotation interface
│   │   ├── annotation-page.tsx
│   │   ├── top-bar/
│   │   ├── canvas/
│   │   └── ...
│   ├── tasks-page/
│   ├── projects-page/
│   ├── models-page/
│   └── ...
├── containers/                    # Redux-connected containers
├── utils/                         # Utility functions
├── cvat-core-wrapper.ts          # API client wrapper
└── index.tsx                     # Application entry point
```

---

## Development Environment Setup

### Prerequisites

- **OS**: Ubuntu 22.04, macOS 10.15+, or WSL2 (Windows)
- **Python**: 3.10 or higher
- **Node.js**: 20.x
- **Yarn**: 4.9.2 (via corepack)
- **Docker**: Latest version + Docker Compose
- **Git**: Latest version

### Quick Setup (Docker-based - Recommended)

This is the fastest way to get CVAT running for development:

```bash
# 1. Clone repository
git clone https://github.com/cvat-ai/cvat.git
cd cvat

# 2. Start development environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 3. Access CVAT
# Frontend: http://localhost:8080
# API: http://localhost:8080/api
# Swagger: http://localhost:8080/api/swagger
```

### Full Local Development Setup

For active development with hot-reload and debugging:

```bash
# 1. Install system dependencies (Ubuntu)
sudo apt-get update && sudo apt-get install -y \
    build-essential curl git python3-dev python3-pip python3-venv \
    libldap2-dev libsasl2-dev libgeos-dev cargo

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
sudo npm install -g corepack

# 2. Clone and setup Python environment
git clone https://github.com/cvat-ai/cvat.git
cd cvat
mkdir logs keys

python3 -m venv .env
source .env/bin/activate
pip install -U pip wheel setuptools
pip install -r cvat/requirements/development.txt -r dev/requirements.txt

# 3. Start service dependencies (PostgreSQL, Redis, OPA)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d \
    cvat_opa cvat_db cvat_redis_inmem cvat_redis_ondisk cvat_server

# 4. Run Django migrations
python manage.py migrate
python manage.py migrateredis
python manage.py collectstatic
python manage.py syncperiodicjobs
python manage.py createsuperuser

# 5. Install frontend dependencies
corepack enable yarn
yarn --immutable

# 6. Start frontend dev server
yarn run start:cvat-ui
# UI will be available at http://localhost:3000

# 7. In VS Code, run "server: debug" configuration (F5)
# This starts the Django server with debugging enabled
```

### Environment Variables

Key environment variables (see `docker-compose.dev.yml` for full list):

- `CVAT_HOST` - Hostname (default: localhost)
- `CVAT_DEBUG_ENABLED` - Enable debug mode (yes/no)
- `CVAT_ANALYTICS` - Enable analytics (1/0)
- `DJANGO_SETTINGS_MODULE` - Settings file (cvat.settings.development)
- `DJANGO_LOG_SERVER_HOST` - Analytics host (localhost)
- `DJANGO_LOG_SERVER_PORT` - Analytics port (8282)

---

## Build System

### Frontend Build Process

The frontend is a monorepo managed by Yarn workspaces. **Build order matters**:

```bash
# Build all packages in correct order
yarn build:cvat-data      # 1. Data layer
yarn build:cvat-core      # 2. API client
yarn build:cvat-canvas    # 3. 2D canvas
yarn build:cvat-canvas3d  # 4. 3D canvas
yarn build:cvat-ui        # 5. Main UI

# Or build a specific workspace
yarn workspace cvat-core run build
```

**Build outputs**:
- `cvat-data/dist/` - Compiled JS/TS
- `cvat-core/dist/` - Compiled JS/TS + TypeScript definitions
- `cvat-canvas/dist/` - Compiled JS/TS
- `cvat-canvas3d/dist/` - Compiled JS/TS
- `cvat-ui/dist/` - Production static files (HTML, JS, CSS, assets)

### Backend Build Process

Backend is built using Docker multi-stage builds:

```bash
# Build backend image
docker compose build cvat_server

# For development with hot-reload, no build needed
# Just run: python manage.py runserver
```

---

## Testing

### Frontend E2E Tests (Cypress)

**Location**: `tests/cypress/`

```bash
# 1. Start CVAT with test dependencies
docker compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    -f components/serverless/docker-compose.serverless.yml \
    -f tests/docker-compose.minio.yml \
    -f tests/docker-compose.file_share.yml up -d

# 2. Create test user
docker exec -i cvat_server bash -c \
    "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python3 ~/manage.py shell"

# 3. Install test dependencies
cd tests
yarn --immutable

# 4. Run tests
yarn run cypress:run:chrome          # 2D tests
yarn run cypress:run:chrome:canvas3d # 3D tests

# Or open interactive Cypress UI
yarn run cypress:open
```

**Test coverage**:
```bash
# Instrument code for coverage
yarn run coverage

# Run tests (coverage automatically collected)
yarn run cypress:run:chrome

# View coverage report
open coverage/index.html
```

### Backend Python Tests

**Location**: `tests/python/`

```bash
# Install test dependencies
pip install -e ./cvat-sdk -e ./cvat-cli -r ./tests/python/requirements.txt

# Run all tests (automatically starts Docker containers)
pytest ./tests/python

# Run specific test file
pytest tests/python/rest_api/test_tasks.py

# Run with coverage
COVERAGE_PROCESS_START=.coveragerc pytest ./tests/python --cov --cov-report xml

# Rebuild images before testing
pytest ./tests/python --rebuild

# Start/stop services without running tests
pytest ./tests/python --start-services
pytest ./tests/python --stop-services
```

### Backend Unit Tests

**Location**: `cvat/apps/*/tests/`

```bash
# Install dependencies
pip install -r cvat/requirements/testing.txt

# Start OPA container
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d cvat_opa

# Run all Django unit tests
python manage.py test --settings cvat.settings.testing cvat/apps -v 2

# Run tests for specific app
python manage.py test --settings cvat.settings.testing cvat/apps/engine -v 2

# With coverage
coverage run manage.py test --settings cvat.settings.testing cvat/apps -v 2
coverage report
```

### OPA Policy Tests

**Location**: `cvat/apps/*/rules/tests/`

```bash
# Generate tests
python cvat/apps/iam/rules/tests/generate_tests.py

# Run OPA tests
docker compose run --rm -v "$PWD:/mnt/src:ro" -w /mnt/src \
    cvat_opa test -v cvat/apps/*/rules

# Lint Rego policies
docker run --rm -v ${PWD}:/mnt/src:ro -w /mnt/src \
    ghcr.io/styrainc/regal:0.11.0 lint cvat/apps/*/rules
```

---

## Coding Standards

### Python

**Style Guide**: [Black](https://black.readthedocs.io/) + [isort](https://pycqa.github.io/isort/)

```bash
# Auto-format Python code
dev/format_python_code.sh

# Or manually
black cvat/
isort cvat/

# Linting
pylint cvat/apps/engine  # Uses .pylintrc configuration

# Security checks
bandit -r cvat/apps/  # Uses .bandit configuration
```

**Key conventions**:
- 4 spaces for indentation
- Maximum line length: 100 characters (Black default)
- Import order: stdlib → third-party → local (enforced by isort)
- Type hints encouraged for new code
- Docstrings for public APIs (Google style preferred)

### JavaScript/TypeScript

**Style Guide**: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) with modifications

```bash
# Auto-format code
yarn workspace cvat-ui run lint --fix

# Or from root
cd cvat-ui && eslint --fix src/

# Linting (all workspaces)
yarn run precommit:cvat-ui
yarn run precommit:cvat-core
yarn run precommit:cvat-canvas
```

**Key conventions**:
- 4 spaces for indentation (exception to Airbnb's 2 spaces)
- Semicolons required
- Single quotes for strings
- Trailing commas in multi-line structures
- React: Functional components with hooks (avoid class components)
- Redux: Use Redux Toolkit patterns where possible
- Async operations: Redux-Thunk middleware

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(engine): add support for video frame interpolation

fix(ui): resolve annotation save issue in Safari

docs(contributing): update development environment setup

refactor(dataset_manager): simplify COCO export logic
```

### Pre-commit Hooks

CVAT uses Husky + lint-staged for pre-commit checks:

```bash
# Enable hooks (automatic on yarn install)
yarn run setup:husky

# Manual execution
npx lint-staged
```

**Checks performed**:
- ESLint (JS/TS files)
- Stylelint (CSS/SCSS files)
- Prettier (formatting)
- Remark (Markdown linting)

---

## Common Development Tasks

### Adding a New Django App

```bash
# 1. Create app
cd cvat/apps
python ../../manage.py startapp myapp

# 2. Add to INSTALLED_APPS in cvat/settings/base.py
INSTALLED_APPS += ['cvat.apps.myapp']

# 3. Create models (myapp/models.py)
# 4. Create serializers (myapp/serializers.py)
# 5. Create views (myapp/views.py)
# 6. Create URLs (myapp/urls.py)
# 7. Add to main URLs (cvat/urls.py)

# 8. Create and run migrations
python manage.py makemigrations
python manage.py migrate

# 9. Add OPA policies (myapp/rules/)
# 10. Add tests (myapp/tests/)
```

### Adding a New API Endpoint

```python
# cvat/apps/myapp/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class MyViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MySerializer

    @action(detail=True, methods=['post'])
    def custom_action(self, request, pk=None):
        """Custom endpoint: POST /api/myapp/{id}/custom_action/"""
        obj = self.get_object()
        # Process request
        return Response({'status': 'success'})

# cvat/apps/myapp/urls.py
from rest_framework.routers import DefaultRouter
from .views import MyViewSet

router = DefaultRouter(trailing_slash=False)
router.register('myapp', MyViewSet)
urlpatterns = router.urls

# cvat/urls.py
urlpatterns = [
    path('api/', include('cvat.apps.myapp.urls')),
]
```

### Adding a New React Component

```bash
# 1. Create component directory
mkdir cvat-ui/src/components/my-feature

# 2. Create component files
touch cvat-ui/src/components/my-feature/my-feature.tsx
touch cvat-ui/src/components/my-feature/styles.scss

# 3. Define component
# cvat-ui/src/components/my-feature/my-feature.tsx
import React from 'react';
import './styles.scss';

export default function MyFeature(): JSX.Element {
    return <div className="cvat-my-feature">Content</div>;
}

# 4. Export from index (if needed)
# cvat-ui/src/components/my-feature/index.ts
export { default as MyFeature } from './my-feature';

# 5. Add Redux actions/reducers if needed
# 6. Connect component in containers/
```

### Running Database Migrations

```bash
# Create migration after model changes
python manage.py makemigrations

# Review migration file
cat cvat/apps/engine/migrations/XXXX_migration_name.py

# Apply migrations
python manage.py migrate

# Rollback migration
python manage.py migrate engine 0042  # Rollback to specific migration

# Show migration status
python manage.py showmigrations
```

### Adding a Worker Queue Task

```python
# cvat/apps/myapp/tasks.py
import django_rq
from rq import get_current_job

@django_rq.job('myqueue', timeout=600)
def my_background_task(arg1, arg2):
    """Background task executed by RQ worker"""
    job = get_current_job()
    job.meta['progress'] = 0
    job.save_meta()

    # Do work
    process_data(arg1, arg2)

    job.meta['progress'] = 100
    job.save_meta()

# Enqueue task
from cvat.apps.myapp.tasks import my_background_task
job = my_background_task.delay(arg1='value', arg2='value')

# Register queue in cvat/settings/base.py
RQ_QUEUES = {
    'myqueue': {
        'HOST': REDIS_HOST,
        'PORT': REDIS_PORT,
        'DB': 0,
    },
}
```

### Updating API Schema

```bash
# Generate OpenAPI schema
python manage.py spectacular --file cvat/schema.yml

# Validate schema
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli validate \
    -i /local/cvat/schema.yml

# Generate client SDK (example)
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
    -i /local/cvat/schema.yml \
    -g python \
    -o /local/generated-client
```

### Debugging Backend

**VS Code Debug Configurations** (`.vscode/launch.json`):

- `server: debug` - Attach to Django server
- `server: tests` - Debug unit tests
- `REST API tests: Attach to server` - Debug REST API tests

```bash
# Start server in debug mode
source .env/bin/activate
python manage.py runserver 0.0.0.0:7000

# In VS Code: F5 → Select "server: debug"
# Set breakpoints in Python code
```

### Debugging Frontend

```bash
# Start dev server with source maps
yarn run start:cvat-ui

# Open Chrome DevTools
# Set breakpoints in TypeScript source files (not compiled JS)

# Or use VS Code debugger
# F5 → Select "client: chrome"
```

---

## API Structure

### Base URL and Versioning

- **Base URL**: `/api/`
- **Versioning**: Accept header (`application/vnd.cvat+json; version=2.0`)
- **Default**: v2.0 (latest)

### Authentication Methods

1. **Token Authentication** (Recommended for API clients)
   ```bash
   curl -H "Authorization: Token <your-token>" http://localhost:8080/api/tasks
   ```

2. **Session Authentication** (Used by frontend)
   - Login: `POST /api/auth/login`
   - Logout: `POST /api/auth/logout`

3. **Basic Authentication** (Simple testing)
   ```bash
   curl -u username:password http://localhost:8080/api/tasks
   ```

### Main Endpoints

| Endpoint | ViewSet | Description |
|----------|---------|-------------|
| `/api/projects` | `ProjectViewSet` | Project management |
| `/api/tasks` | `TaskViewSet` | Task management |
| `/api/jobs` | `JobViewSet` | Job management |
| `/api/users` | `UserViewSet` | User management |
| `/api/issues` | `IssueViewSet` | Issue tracking |
| `/api/comments` | `CommentViewSet` | Issue comments |
| `/api/labels` | `LabelViewSet` | Label definitions |
| `/api/cloudstorages` | `CloudStorageViewSet` | Cloud storage integration |
| `/api/organizations` | `OrganizationViewSet` | Organization management |
| `/api/webhooks` | `WebhookViewSet` | Webhook configuration |
| `/api/lambda/functions` | `FunctionViewSet` | Serverless functions |
| `/api/server/about` | - | Server metadata |

### Common Query Parameters

- `page=N` - Pagination (default: 10 items/page)
- `page_size=N` - Items per page (max: 100)
- `filter={json}` - JSON Logic filter
- `search=query` - Full-text search
- `sort=field` - Sort by field (prefix `-` for descending)

**Example**:
```bash
# Get tasks with specific filters
curl "http://localhost:8080/api/tasks?page=1&page_size=20&sort=-created_date&filter={\"and\":[{\"==\":[{\"var\":\"status\"},\"annotation\"]}]}"
```

### Response Format

```json
{
  "count": 100,
  "next": "http://localhost:8080/api/tasks?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Task 1",
      "status": "annotation",
      ...
    }
  ]
}
```

### API Documentation

- **Swagger UI**: http://localhost:8080/api/swagger/
- **ReDoc**: http://localhost:8080/api/docs/
- **OpenAPI Schema**: http://localhost:8080/api/schema/

---

## Key Patterns and Conventions

### Django Patterns

#### Model-Serializer-ViewSet Pattern

```python
# models.py - Database schema
class Task(models.Model):
    name = models.CharField(max_length=256)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    created_date = models.DateTimeField(auto_now_add=True)

# serializers.py - API representation
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ('created_date',)

# views.py - API endpoints
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
```

#### Permission Checking with OPA

```python
# views.py
from cvat.apps.iam.permissions import check_permission

class TaskViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        check_permission(self.request, 'create', serializer.validated_data)
        serializer.save()

# OPA Policy (cvat/apps/engine/rules/tasks.rego)
package tasks

import rego.v1

default allow := false

allow if {
    input.scope == "create"
    input.auth.user.is_staff
}
```

#### Background Task Pattern

```python
# Use RQ for long-running operations
import django_rq

@django_rq.job('default')
def process_task_data(task_id):
    task = Task.objects.get(pk=task_id)
    # Long operation
    task.status = 'completed'
    task.save()

# Enqueue from view
def create_task(request):
    task = Task.objects.create(...)
    process_task_data.delay(task.id)
    return Response({'id': task.id})
```

### Frontend Patterns

#### Redux Action-Reducer Pattern

```typescript
// actions/tasks-actions.ts
export function loadTasksAsync() {
    return async (dispatch: Dispatch) => {
        dispatch({ type: 'LOAD_TASKS_START' });
        try {
            const tasks = await cvat.tasks.get();
            dispatch({
                type: 'LOAD_TASKS_SUCCESS',
                payload: { tasks }
            });
        } catch (error) {
            dispatch({
                type: 'LOAD_TASKS_FAILED',
                payload: { error }
            });
        }
    };
}

// reducers/tasks-reducer.ts
export default function tasksReducer(state = initialState, action) {
    switch (action.type) {
        case 'LOAD_TASKS_START':
            return { ...state, fetching: true };
        case 'LOAD_TASKS_SUCCESS':
            return { ...state, fetching: false, tasks: action.payload.tasks };
        case 'LOAD_TASKS_FAILED':
            return { ...state, fetching: false, error: action.payload.error };
        default:
            return state;
    }
}
```

#### Component-Container Pattern

```typescript
// components/task-item/task-item.tsx (Presentational)
interface Props {
    task: Task;
    onDelete: (task: Task) => void;
}

export default function TaskItem({ task, onDelete }: Props): JSX.Element {
    return (
        <div className="cvat-task-item">
            <span>{task.name}</span>
            <Button onClick={() => onDelete(task)}>Delete</Button>
        </div>
    );
}

// containers/task-item/task-item.tsx (Connected)
import { connect } from 'react-redux';
import TaskItem from 'components/task-item/task-item';
import { deleteTaskAsync } from 'actions/tasks-actions';

const mapStateToProps = (state, ownProps) => ({
    task: state.tasks.items[ownProps.taskId],
});

const mapDispatchToProps = (dispatch) => ({
    onDelete: (task) => dispatch(deleteTaskAsync(task)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TaskItem);
```

### File Naming Conventions

**Backend (Python)**:
- Files: `snake_case.py` (e.g., `task_manager.py`)
- Classes: `PascalCase` (e.g., `TaskManager`)
- Functions/variables: `snake_case` (e.g., `get_task_by_id`)

**Frontend (TypeScript)**:
- Files: `kebab-case.tsx/.ts` (e.g., `task-item.tsx`)
- Components: `PascalCase` (e.g., `TaskItem`)
- Functions/variables: `camelCase` (e.g., `getTaskById`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_TASK_COUNT`)
- Types/Interfaces: `PascalCase` with `I` prefix for interfaces (optional)

---

## Deployment

### Docker Compose (Single Host)

```bash
# Production deployment
docker compose up -d

# With HTTPS (requires certificates in ./keys/)
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d

# With external database
docker compose -f docker-compose.yml -f docker-compose.external_db.yml up -d
```

**Environment variables** (`.env` file):
```bash
CVAT_HOST=cvat.example.com
CVAT_VERSION=v2.10.0
CVAT_ANALYTICS=1
ACME_EMAIL=admin@example.com  # For Let's Encrypt
```

### Kubernetes (Helm)

```bash
# Install CVAT
helm install cvat ./helm-chart \
    --namespace cvat \
    --create-namespace \
    --set cvat.backend.server.replicas=3 \
    --set postgresql.enabled=true \
    --set redis.enabled=true

# Upgrade
helm upgrade cvat ./helm-chart --namespace cvat

# Custom values
helm install cvat ./helm-chart -f my-values.yml
```

**Key Helm values**:
```yaml
cvat:
  backend:
    server:
      replicas: 3
      resources:
        limits:
          cpu: 2000m
          memory: 4Gi
  frontend:
    replicas: 2

postgresql:
  enabled: true
  persistence:
    size: 50Gi

redis:
  enabled: true
```

### Serverless Functions

```bash
# Deploy auto-annotation functions
cd serverless
./deploy_cpu.sh localhost:8080  # CPU models
./deploy_gpu.sh localhost:8080  # GPU models (requires NVIDIA GPU)

# Deploy specific function
nuctl deploy --project-name cvat \
    --path ./pytorch/facebookresearch/sam/nuclio \
    --platform local
```

---

## Troubleshooting

### Common Issues

#### Frontend build fails
```bash
# Clear Yarn cache
yarn cache clean

# Delete node_modules and reinstall
rm -rf node_modules cvat-*/node_modules .yarn/cache
yarn --immutable

# Rebuild in correct order
yarn build:cvat-data && yarn build:cvat-core && yarn build:cvat-canvas && yarn build:cvat-ui
```

#### Backend server won't start
```bash
# Check dependencies
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

# View logs
docker compose logs cvat_server

# Reset database
docker compose down -v  # WARNING: Deletes all data
docker compose up -d
python manage.py migrate
```

#### Tests fail
```bash
# Rebuild test environment
pytest ./tests/python --rebuild

# Check Docker resources
docker system df
docker system prune  # Free up space

# Ensure test user exists
docker exec cvat_server bash -c \
    "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python ~/manage.py shell"
```

#### OPA policy errors
```bash
# Test policies locally
docker run --rm -v "$PWD:/mnt/src:ro" -w /mnt/src \
    openpolicyagent/opa:0.63.0 test cvat/apps/*/rules -v

# Check OPA container logs
docker compose logs cvat_opa

# Verify OPA is receiving requests
curl http://localhost:8181/v1/data/
```

#### Port conflicts (Mac users)
```bash
# Check what's using port 5000/7000
lsof -i :5000
lsof -i :7000

# Disable AirPlay Receiver
# System Settings → General → AirDrop & Handoff → Untick AirPlay Receiver
```

### Debugging Tips

1. **Enable verbose logging**:
   ```python
   # cvat/settings/development.py
   LOGGING['loggers']['cvat']['level'] = 'DEBUG'
   ```

2. **Check worker queue status**:
   ```bash
   docker exec -it cvat_server python manage.py rqstats
   ```

3. **Inspect database**:
   ```bash
   docker exec -it cvat_db psql -U root -d cvat
   \dt  # List tables
   SELECT * FROM engine_task LIMIT 10;
   ```

4. **Monitor Redis**:
   ```bash
   docker exec -it cvat_redis_inmem redis-cli
   KEYS *
   GET some_key
   ```

5. **Check API response directly**:
   ```bash
   curl -u admin:password http://localhost:8080/api/server/about
   ```

---

## Quick Reference

### Useful Commands

```bash
# Backend
python manage.py migrate                    # Run migrations
python manage.py createsuperuser           # Create admin user
python manage.py collectstatic             # Collect static files
python manage.py shell                     # Django shell
python manage.py test cvat.apps.engine    # Run specific tests

# Frontend
yarn --immutable                           # Install dependencies
yarn workspace cvat-ui run build          # Build UI
yarn workspace cvat-ui run start          # Dev server
yarn run precommit:cvat-ui                # Lint UI code

# Docker
docker compose up -d                       # Start services
docker compose down                        # Stop services
docker compose logs -f cvat_server        # View logs
docker compose exec cvat_server bash      # Shell into container
docker compose ps                         # List containers

# Testing
pytest tests/python/                      # Run REST API tests
yarn run cypress:run:chrome               # Run E2E tests
python manage.py test cvat/apps -v 2     # Run unit tests
```

### Important Files

| File | Purpose |
|------|---------|
| `cvat/settings/base.py` | Main Django settings |
| `cvat/urls.py` | Main URL routing |
| `cvat/schema.yml` | OpenAPI API schema |
| `docker-compose.yml` | Production Docker config |
| `docker-compose.dev.yml` | Development overrides |
| `.vscode/launch.json` | VS Code debug configs |
| `package.json` | Frontend dependencies & scripts |
| `cvat/requirements/base.txt` | Python dependencies |
| `.eslintrc.cjs` | ESLint configuration |
| `.pylintrc` | Pylint configuration |

---

## Additional Resources

- **Documentation**: https://docs.cvat.ai/
- **Contributing Guide**: https://docs.cvat.ai/docs/contributing/
- **API Documentation**: https://docs.cvat.ai/docs/api_sdk/api/
- **GitHub Issues**: https://github.com/cvat-ai/cvat/issues
- **Gitter Chat**: https://gitter.im/opencv-cvat/public
- **Discord**: https://discord.gg/S6sRHhuQ7K
- **YouTube**: https://www.youtube.com/@cvat-ai

---

**Note**: This document is maintained by AI assistants working on CVAT. When making significant changes to the codebase structure, please update this file accordingly.
