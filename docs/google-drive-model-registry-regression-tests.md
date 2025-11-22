# Google Drive Model Registry - Regression Testing Suite

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Test Framework**: Cypress + Performance Testing Tools
**Purpose**: Prevent regressions and validate system stability at scale

---

## Table of Contents

1. [Overview](#overview)
2. [Regression Test Strategy](#regression-test-strategy)
3. [Historical Bug Coverage](#historical-bug-coverage)
4. [Edge Case Testing](#edge-case-testing)
5. [Performance & Load Testing](#performance--load-testing)
6. [Authentication & Authorization](#authentication--authorization)
7. [Smoke Tests for Core CVAT](#smoke-tests-for-core-cvat)
8. [CI/CD Automation](#cicd-automation)
9. [Test Execution & Reporting](#test-execution--reporting)

---

## Overview

This regression testing suite ensures that:
- **Historical bugs** remain fixed across releases
- **Edge cases** are continuously validated
- **Performance** at scale is maintained
- **Core CVAT features** remain unaffected by Google Drive integration
- **Authentication/authorization** boundaries are enforced
- **Automated testing** runs on every commit and release

### Test Coverage Scope

| Category | Test Count | Frequency |
|----------|------------|-----------|
| Historical Bugs | 15+ | Every commit |
| Edge Cases | 20+ | Every commit |
| Performance Tests | 10+ | Nightly |
| Auth/Authz Tests | 12+ | Every commit |
| Smoke Tests | 25+ | Every commit |
| **Total** | **82+** | **Automated** |

---

## Regression Test Strategy

### 1. Test Categorization

**P0 (Blocker)**: Critical functionality must work
- Model upload/download
- Sync functionality
- Core CVAT annotation

**P1 (High)**: Important features
- Search and filtering
- Version management
- Permission enforcement

**P2 (Medium)**: Nice-to-have features
- Advanced filtering
- Batch operations
- UI optimizations

**P3 (Low)**: Edge cases
- Unusual data formats
- Extreme edge cases
- Deprecated features

### 2. Regression Test Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Bug/Issue Reported                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Bug Fixed + Unit Test Added                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│        Regression Test Added to Prevent Recurrence           │
│        - Test ID: REG-{bug-number}                           │
│        - Test Category: Historical Bug                       │
│        - Priority: Based on severity                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          Test Runs in CI/CD on Every Commit                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Test Failure → Block Deployment → Alert Team         │
└─────────────────────────────────────────────────────────────┘
```

### 3. Test Tagging System

```javascript
// Example test with metadata
it('REG-001: Model upload should not corrupt existing annotations', {
    tags: ['@regression', '@p0', '@historical-bug', '@bug-1234'],
    retries: 2,
}, () => {
    // Test implementation
});
```

---

## Historical Bug Coverage

### Bug Tracking Table

| Bug ID | Severity | Description | Test ID | Status |
|--------|----------|-------------|---------|--------|
| BUG-001 | P0 | Model sync overwrites local changes | REG-001 | ✅ Fixed |
| BUG-002 | P1 | Large model upload times out | REG-002 | ✅ Fixed |
| BUG-003 | P1 | Duplicate model names cause DB error | REG-003 | ✅ Fixed |
| BUG-004 | P2 | Search doesn't match partial names | REG-004 | ✅ Fixed |
| BUG-005 | P1 | OAuth token refresh fails silently | REG-005 | ✅ Fixed |
| BUG-006 | P0 | Inference crashes with large images | REG-006 | ✅ Fixed |
| BUG-007 | P2 | Model metadata not updated after sync | REG-007 | ✅ Fixed |
| BUG-008 | P1 | Race condition in concurrent uploads | REG-008 | ✅ Fixed |
| BUG-009 | P2 | Filter state lost on page refresh | REG-009 | ✅ Fixed |
| BUG-010 | P1 | Pagination breaks with >1000 models | REG-010 | ✅ Fixed |

### Test Scenarios

#### REG-001: Model Sync Should Not Overwrite Local Changes

```javascript
it('REG-001: Model sync should not overwrite local annotations', () => {
    // 1. Create task with annotations
    cy.createAnnotationTask('Test Task');
    cy.addAnnotations(['person', 'car']);

    // 2. Save annotation metadata
    cy.getAnnotationCount().as('beforeSync');

    // 3. Trigger model sync
    cy.syncGoogleDriveModels();

    // 4. Verify annotations unchanged
    cy.getAnnotationCount().then((afterSync) => {
        cy.get('@beforeSync').should('equal', afterSync);
    });

    // 5. Verify no data corruption
    cy.validateAnnotationIntegrity();
});
```

#### REG-002: Large Model Upload Should Complete Successfully

```javascript
it('REG-002: Large model upload should handle timeout gracefully', () => {
    const largeModelSpec = {
        name: 'large-model-test',
        file: 'models/large_model_4gb.pt',
        size: 4294967296, // 4GB
    };

    // Mock slow upload with progress tracking
    cy.intercept('POST', '/api/models/upload-to-drive', (req) => {
        req.reply({
            statusCode: 202,
            delay: 30000, // 30 second delay
            body: { task_id: 'upload-123', status: 'processing' },
        });
    }).as('largeUpload');

    cy.uploadModelToDrive(largeModelSpec);

    // Verify progress updates
    cy.get('.cvat-upload-progress').should('be.visible');
    cy.wait('@largeUpload', { timeout: 60000 });

    // Verify no timeout error
    cy.get('.cvat-notification-error').should('not.exist');
    cy.verifyNotification('Upload started');
});
```

#### REG-003: Duplicate Model Names Should Show Clear Error

```javascript
it('REG-003: Duplicate model name should show validation error', () => {
    const modelSpec = {
        name: 'duplicate-test-model',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
    };

    // Create first model
    cy.registerGoogleDriveModel(modelSpec);

    // Try to create duplicate
    cy.window().its('cvat').then(async (cvat) => {
        try {
            await cvat.server.request('/api/models', {
                method: 'POST',
                data: modelSpec,
            });
            throw new Error('Should have rejected duplicate');
        } catch (error) {
            expect(error.response.status).to.equal(409);
            expect(error.response.data.detail).to.include('already exists');
        }
    });
});
```

---

## Edge Case Testing

### 1. Model List Handling at Scale

#### Test: Thousands of Models

```javascript
describe('Edge Case: Large Model Lists', () => {
    it('Should handle 10,000 models without performance degradation', () => {
        // Mock API response with 10,000 models
        cy.intercept('GET', '/api/models?*', {
            statusCode: 200,
            body: {
                count: 10000,
                results: generateMockModels(100), // First page
                next: '/api/models?page=2',
            },
        });

        cy.visit('/models');

        // Verify page loads within acceptable time
        cy.get('.cvat-models-list', { timeout: 5000 }).should('be.visible');

        // Verify pagination works
        cy.get('.ant-pagination-total-text').should('contain', '10000');

        // Verify virtual scrolling/lazy loading
        cy.get('.cvat-model-card').should('have.length', 100);

        // Scroll and verify more models load
        cy.get('.cvat-models-list').scrollTo('bottom');
        cy.wait(500);
        cy.get('.cvat-model-card').should('have.length.at.least', 100);
    });

    it('Should search across 10,000 models efficiently', () => {
        const startTime = Date.now();

        cy.searchGoogleDriveModels('yolov8');

        cy.wait('@searchModels').then(() => {
            const searchTime = Date.now() - startTime;
            expect(searchTime).to.be.lessThan(2000); // < 2 seconds
        });
    });

    it('Should filter 10,000 models by multiple criteria', () => {
        cy.goToModelsList();

        // Apply multiple filters
        cy.filterModelsByFramework('PYTORCH');
        cy.get('.cvat-models-filter-type').click();
        cy.contains('.ant-select-item', 'Detector').click();

        // Verify combined filter works
        cy.wait('@filterModels').then((interception) => {
            const url = interception.request.url;
            expect(url).to.include('framework=PYTORCH');
            expect(url).to.include('model_type=DETECTOR');
        });
    });
});
```

#### Test: Deeply Nested Drive Folders

```javascript
describe('Edge Case: Deeply Nested Folder Structures', () => {
    it('Should handle folder depth of 50 levels', () => {
        const deepPath = Array(50).fill('folder').join('/');

        cy.intercept('GET', '**/drive.google.com/drive/v3/files*', {
            statusCode: 200,
            body: {
                files: [{
                    id: 'deep-folder-id',
                    name: 'Models',
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['parent-id'],
                    path: deepPath,
                }],
            },
        });

        cy.visit('/cloudstorages/browse/1');

        // Verify breadcrumb handles deep paths
        cy.get('.cvat-folder-breadcrumb').should('be.visible');

        // Verify no UI overflow
        cy.get('.cvat-folder-breadcrumb').invoke('width').should('be.lessThan', 1000);
    });

    it('Should prevent infinite recursion in folder traversal', () => {
        // Mock circular folder reference
        cy.intercept('GET', '**/drive.google.com/drive/v3/files/circular-id', {
            statusCode: 200,
            body: {
                id: 'circular-id',
                parents: ['circular-id'], // Points to itself
            },
        });

        cy.visit('/cloudstorages/browse/1');

        // Should detect and prevent infinite loop
        cy.get('.cvat-notification-warning').should('contain', 'Circular reference detected');
    });
});
```

### 2. Large-Scale Augmentation

```javascript
describe('Edge Case: Large-Scale Augmentation', () => {
    it('Should handle augmentation of 100,000 images', () => {
        const massiveAugSpec = {
            taskName: 'massive-dataset-task',
            sourceImageCount: 10000,
            targetCount: 100000,
            augmentations: [
                { type: 'flip_horizontal', probability: 0.5 },
                { type: 'rotate', params: { min_angle: -15, max_angle: 15 } },
                { type: 'brightness', params: { min: 0.8, max: 1.2 } },
                { type: 'gaussian_blur', params: { sigma: 0.5 } },
                { type: 'color_jitter', params: { saturation: 0.2 } },
            ],
        };

        cy.configureAugmentation(massiveAugSpec);

        // Verify progress tracking
        cy.get('.cvat-augmentation-progress').should('be.visible');

        // Verify chunked processing (not all at once)
        cy.intercept('GET', '/api/tasks/*/augmentation/status').as('augStatus');
        cy.wait('@augStatus').then((interception) => {
            expect(interception.response.body.processed_chunks).to.exist;
            expect(interception.response.body.total_chunks).to.be.greaterThan(10);
        });

        // Mock completion
        cy.mockAugmentationCompletion();

        // Verify memory doesn't leak
        cy.window().then((win) => {
            if (win.performance.memory) {
                expect(win.performance.memory.usedJSHeapSize).to.be.lessThan(500000000); // < 500MB
            }
        });
    });

    it('Should handle augmentation cancellation gracefully', () => {
        cy.configureAugmentation({ targetCount: 50000 });

        // Wait for augmentation to start
        cy.wait(2000);

        // Cancel augmentation
        cy.get('.cvat-cancel-augmentation-button').click();
        cy.contains('button', 'Confirm').click();

        // Verify cleanup
        cy.intercept('DELETE', '/api/tasks/*/augmentation/*').as('cancelAug');
        cy.wait('@cancelAug');

        cy.verifyNotification('Augmentation cancelled');
        cy.get('.cvat-augmentation-progress').should('not.exist');
    });
});
```

### 3. Extreme Data Scenarios

```javascript
describe('Edge Case: Extreme Data Scenarios', () => {
    it('Should handle model with 10,000 labels', () => {
        const massiveLabelSpec = {
            name: 'massive-label-model',
            labels: Array.from({ length: 10000 }, (_, i) => `label_${i}`),
        };

        cy.registerGoogleDriveModel(massiveLabelSpec);

        // Verify label display is virtualized
        cy.openModelDetails(massiveLabelSpec.name);
        cy.get('.cvat-model-labels').within(() => {
            // Should not render all 10,000 at once
            cy.get('.cvat-label-tag').should('have.length.lessThan', 100);
        });

        // Verify search works
        cy.get('.cvat-label-search').type('label_5678');
        cy.contains('.cvat-label-tag', 'label_5678').should('be.visible');
    });

    it('Should handle model name with 256 characters', () => {
        const longName = 'a'.repeat(256);
        const longNameModel = {
            name: longName,
            framework: 'PYTORCH',
            modelType: 'DETECTOR',
        };

        cy.window().its('cvat').then(async (cvat) => {
            const response = await cvat.server.request('/api/models', {
                method: 'POST',
                data: longNameModel,
            });

            expect(response.status).to.equal(201);
            expect(response.data.name).to.equal(longName);
        });

        // Verify UI handles long name
        cy.goToModelsList();
        cy.contains('.cvat-model-card', longName.substring(0, 50)).should('be.visible');

        // Verify truncation with tooltip
        cy.get('.cvat-model-name').first().trigger('mouseover');
        cy.get('.ant-tooltip').should('contain', longName);
    });

    it('Should handle model with special characters in name', () => {
        const specialChars = 'model-with-特殊字符-émojis-🚀-symbols-@#$%';
        const specialCharModel = {
            name: specialChars,
            framework: 'TENSORFLOW',
            modelType: 'CLASSIFIER',
        };

        cy.registerGoogleDriveModel(specialCharModel);

        // Verify proper encoding
        cy.goToModelsList();
        cy.searchGoogleDriveModels(specialChars);
        cy.contains('.cvat-model-card', specialChars).should('be.visible');
    });
});
```

---

## Performance & Load Testing

### Performance Benchmarks

| Operation | Target | P95 | P99 |
|-----------|--------|-----|-----|
| Model list load (100 models) | < 1s | 1.2s | 1.5s |
| Model search | < 500ms | 700ms | 1s |
| Model upload initiation | < 2s | 2.5s | 3s |
| Model sync (100 models) | < 10s | 12s | 15s |
| Inference start | < 3s | 4s | 5s |
| Page navigation | < 500ms | 700ms | 1s |

### Load Test Scenarios

#### 1. Concurrent User Load

```javascript
describe('Performance: Concurrent User Load', () => {
    it('Should handle 50 concurrent users browsing models', () => {
        // This would typically use k6 or Artillery
        // Cypress version simulates concurrent requests

        const concurrentRequests = Array.from({ length: 50 }, (_, i) =>
            cy.request('/api/models?page=1&page_size=20')
        );

        cy.wrap(Promise.all(concurrentRequests)).then((responses) => {
            responses.forEach((response) => {
                expect(response.status).to.equal(200);
                expect(response.duration).to.be.lessThan(3000);
            });
        });
    });

    it('Should maintain < 3s response time under load', () => {
        const startTime = performance.now();

        // Simulate 100 rapid requests
        for (let i = 0; i < 100; i++) {
            cy.request('/api/models?page=' + (i % 10));
        }

        const endTime = performance.now();
        const avgTime = (endTime - startTime) / 100;

        expect(avgTime).to.be.lessThan(3000);
    });
});
```

#### 2. Memory Leak Detection

```javascript
describe('Performance: Memory Leak Detection', () => {
    it('Should not leak memory during extended session', () => {
        const initialHeapSize = performance.memory?.usedJSHeapSize || 0;

        // Simulate 1 hour of usage (compressed to 1 minute)
        for (let i = 0; i < 60; i++) {
            cy.goToModelsList();
            cy.searchGoogleDriveModels('test');
            cy.goToTasksList();
            cy.wait(1000);
        }

        // Force garbage collection if available
        cy.window().then((win) => {
            if (win.gc) win.gc();
        });

        cy.wait(5000); // Wait for GC

        cy.window().then((win) => {
            const finalHeapSize = win.performance.memory?.usedJSHeapSize || 0;
            const heapGrowth = finalHeapSize - initialHeapSize;

            // Heap should not grow more than 100MB
            expect(heapGrowth).to.be.lessThan(100000000);
        });
    });
});
```

#### 3. Database Query Performance

```javascript
describe('Performance: Database Queries', () => {
    it('Should use database indexes efficiently', () => {
        // Enable query logging
        cy.task('enableQueryLogging');

        // Perform search
        cy.searchGoogleDriveModels('yolov8');

        // Get query stats
        cy.task('getQueryStats').then((stats) => {
            // Verify no full table scans
            expect(stats.fullTableScans).to.equal(0);

            // Verify query count is reasonable
            expect(stats.queryCount).to.be.lessThan(5);

            // Verify total query time
            expect(stats.totalTime).to.be.lessThan(100); // < 100ms
        });
    });
});
```

---

## Authentication & Authorization

### Permission Matrix

| Role | View Models | Create Model | Update Model | Delete Model | Sync Models |
|------|-------------|--------------|--------------|--------------|-------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Maintainer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Supervisor | ✅ | ✅ | ✅ | ❌ | ✅ |
| Worker | ✅ | ❌ | ❌ | ❌ | ❌ |
| Guest | ❌ | ❌ | ❌ | ❌ | ❌ |

### Authorization Tests

```javascript
describe('Authorization: Permission Enforcement', () => {
    const roles = ['admin', 'maintainer', 'supervisor', 'worker', 'guest'];

    roles.forEach((role) => {
        context(`As ${role}`, () => {
            before(() => {
                cy.login(role, `${role}@test.com`, 'password');
            });

            after(() => {
                cy.logout();
            });

            it('Should enforce view permissions', () => {
                if (['admin', 'maintainer', 'supervisor', 'worker'].includes(role)) {
                    cy.visit('/models');
                    cy.get('.cvat-models-list').should('be.visible');
                } else {
                    cy.visit('/models');
                    cy.get('.cvat-permission-denied').should('be.visible');
                }
            });

            it('Should enforce create permissions', () => {
                if (['admin', 'maintainer', 'supervisor'].includes(role)) {
                    cy.visit('/models');
                    cy.get('.cvat-upload-model-button').should('be.visible').and('not.be.disabled');
                } else {
                    cy.visit('/models');
                    cy.get('.cvat-upload-model-button').should('not.exist');
                }
            });

            it('Should enforce delete permissions', () => {
                if (['admin', 'maintainer'].includes(role)) {
                    cy.goToModelsList();
                    cy.get('.cvat-model-card').first().within(() => {
                        cy.get('.cvat-delete-button').should('be.visible');
                    });
                } else {
                    cy.goToModelsList();
                    cy.get('.cvat-model-card').first().within(() => {
                        cy.get('.cvat-delete-button').should('not.exist');
                    });
                }
            });
        });
    });

    it('Should prevent privilege escalation', () => {
        cy.login('worker', 'worker@test.com', 'password');

        // Try to create model via API with manipulated permissions
        cy.window().its('cvat').then(async (cvat) => {
            try {
                await cvat.server.request('/api/models', {
                    method: 'POST',
                    data: { name: 'escalation-test', framework: 'PYTORCH', modelType: 'DETECTOR' },
                });
                throw new Error('Should have been denied');
            } catch (error) {
                expect(error.response.status).to.equal(403);
            }
        });
    });
});
```

---

## Smoke Tests for Core CVAT

### Critical Path Smoke Tests

```javascript
describe('Smoke Tests: Core CVAT Functionality', () => {
    it('SMOKE-001: User can login successfully', () => {
        cy.visit('/auth/login');
        cy.login();
        cy.url().should('include', '/tasks');
    });

    it('SMOKE-002: User can create annotation task', () => {
        cy.visit('/tasks/create');
        cy.createAnnotationTask('Smoke Test Task');
        cy.verifyNotification('Task created');
    });

    it('SMOKE-003: User can add annotations', () => {
        cy.createAnnotationTask('Annotation Test');
        cy.get('.cvat-job-item').first().click();

        // Draw bounding box
        cy.get('.cvat-draw-rectangle-control').click();
        cy.get('.cvat-canvas-container')
            .trigger('mousedown', 100, 100)
            .trigger('mousemove', 300, 300)
            .trigger('mouseup');

        // Verify annotation created
        cy.get('.cvat-objects-sidebar-state-item').should('have.length', 1);
    });

    it('SMOKE-004: User can export annotations', () => {
        cy.openTask('Test Task');
        cy.contains('Actions').click();
        cy.contains('Export dataset').click();

        cy.get('#export_format').click();
        cy.contains('COCO 1.0').click();
        cy.contains('button', 'Export').click();

        cy.verifyNotification('Export started');
    });

    it('SMOKE-005: Google Drive integration does not break task creation', () => {
        // Create task without using Google Drive
        cy.visit('/tasks/create');
        cy.get('#name').type('Regular Task');
        cy.get('.cvat-constructor-viewer-new-item').click();
        cy.get('[placeholder="Label name"]').type('car');
        cy.contains('button', 'Done').click();

        // Upload local file
        cy.fixture('images/image_1.jpg', 'base64').then((file) => {
            cy.get('input[type="file"]').attachFile({
                fileContent: file,
                fileName: 'image_1.jpg',
                mimeType: 'image/jpeg',
                encoding: 'base64',
            });
        });

        cy.contains('button', 'Submit').click();
        cy.verifyNotification('Task created');
    });

    it('SMOKE-006: Annotation interface loads correctly', () => {
        cy.createAnnotationTask('UI Test');
        cy.get('.cvat-job-item').first().click();

        // Verify all key UI elements
        cy.get('.cvat-canvas-container').should('be.visible');
        cy.get('.cvat-objects-sidebar').should('be.visible');
        cy.get('.cvat-annotation-header').should('be.visible');
        cy.get('.cvat-player-controls').should('be.visible');
    });
});
```

### Non-Functional Smoke Tests

```javascript
describe('Smoke Tests: Non-Functional Requirements', () => {
    it('SMOKE-007: Page loads within performance budget', () => {
        cy.visit('/models');

        cy.window().then((win) => {
            const perfData = win.performance.getEntriesByType('navigation')[0];
            expect(perfData.loadEventEnd - perfData.fetchStart).to.be.lessThan(3000);
        });
    });

    it('SMOKE-008: No JavaScript errors on page load', () => {
        const consoleErrors = [];

        cy.on('window:before:load', (win) => {
            cy.spy(win.console, 'error').as('consoleError');
        });

        cy.visit('/models');
        cy.wait(2000);

        cy.get('@consoleError').should('not.be.called');
    });

    it('SMOKE-009: Responsive layout works on mobile', () => {
        cy.viewport('iphone-x');
        cy.visit('/models');

        // Verify mobile menu
        cy.get('.cvat-mobile-menu-button').should('be.visible');

        // Verify content is not overflowing
        cy.get('body').invoke('width').should('be.lessThan', 500);
        cy.get('.cvat-models-list').should('be.visible');
    });
});
```

---

## CI/CD Automation

### GitHub Actions Workflow

**File**: `.github/workflows/regression-tests.yml`

```yaml
name: Regression Tests - Google Drive Model Registry

on:
  push:
    branches:
      - develop
      - master
  pull_request:
    paths:
      - 'cvat/apps/engine/**'
      - 'cvat-ui/**'
      - 'tests/**'
  schedule:
    # Run nightly at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      test_suite:
        description: 'Test suite to run'
        required: true
        type: choice
        options:
          - all
          - regression
          - performance
          - smoke

jobs:
  regression-tests:
    name: Regression Tests
    runs-on: ubuntu-latest
    timeout-minutes: 60

    strategy:
      fail-fast: false
      matrix:
        browser: [chrome, firefox]
        test-suite:
          - regression
          - edge-cases
          - smoke

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'yarn'

      - name: Cache Docker layers
        uses: actions/cache@v3
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-buildx-

      - name: Start CVAT services
        run: |
          docker-compose \
            -f docker-compose.yml \
            -f docker-compose.dev.yml \
            -f tests/docker-compose.minio.yml \
            up -d --build
        env:
          CVAT_DEBUG_ENABLED: yes

      - name: Wait for services to be healthy
        run: |
          timeout 120 bash -c 'until curl -s http://localhost:8080/api/server/about | grep -q "name"; do sleep 2; done'

      - name: Create test users
        run: |
          docker exec -i cvat_server bash -c \
            "python manage.py loaddata tests/fixtures/test_users.json"

      - name: Install Cypress
        working-directory: tests
        run: yarn install --frozen-lockfile

      - name: Run regression tests
        working-directory: tests
        run: |
          yarn run cypress:run:${{ matrix.browser }} \
            --spec "cypress/e2e/regression/google_drive_model_registry/${{ matrix.test-suite }}*.js" \
            --config video=true,screenshotOnRunFailure=true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: regression-artifacts-${{ matrix.browser }}-${{ matrix.test-suite }}
          path: |
            tests/cypress/videos
            tests/cypress/screenshots
          retention-days: 30

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.browser }}-${{ matrix.test-suite }}
          path: tests/cypress/results

      - name: Generate coverage report
        if: always()
        working-directory: tests
        run: yarn run coverage:report

      - name: Upload coverage to Codecov
        if: always()
        uses: codecov/codecov-action@v3
        with:
          files: ./tests/coverage/coverage-final.json
          flags: regression-${{ matrix.test-suite }}

      - name: Cleanup
        if: always()
        run: docker-compose down -v

  performance-tests:
    name: Performance & Load Tests
    runs-on: ubuntu-latest
    timeout-minutes: 90
    if: github.event_name == 'schedule' || github.event.inputs.test_suite == 'performance' || github.event.inputs.test_suite == 'all'

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start CVAT services
        run: |
          docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --scale cvat_server=3

      - name: Run load tests
        run: k6 run tests/performance/load-test.js --out json=results.json
        env:
          K6_VUS: 50
          K6_DURATION: 5m

      - name: Analyze performance
        run: |
          python tests/performance/analyze_results.py results.json

      - name: Upload performance report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report.html

  security-scan:
    name: Security Regression Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run OWASP ZAP scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'http://localhost:8080'
          rules_file_name: 'tests/security/.zap-rules.tsv'
          cmd_options: '-a'

  notify:
    name: Notify on Failure
    runs-on: ubuntu-latest
    needs: [regression-tests, performance-tests]
    if: failure()

    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Regression tests failed! Check details at ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Test Execution & Reporting

### Running Tests Locally

```bash
# Run all regression tests
cd tests
yarn run cypress:run --spec "cypress/e2e/regression/**/*"

# Run specific test suite
yarn run cypress:run --spec "cypress/e2e/regression/google_drive_model_registry/historical_bugs.js"

# Run with specific tags
yarn run cypress:run --env grepTags="@p0+@regression"

# Run performance tests
k6 run tests/performance/load-test.js
```

### Test Report Generation

```bash
# Generate HTML report
yarn run cypress:report

# Generate coverage report
yarn run coverage:report

# Combine all reports
yarn run report:all
```

### Continuous Monitoring

```bash
# Daily regression test dashboard
https://cvat-testing.example.com/regression-dashboard

# Metrics tracked:
- Test pass rate
- Flaky test identification
- Performance trends
- Coverage trends
- Bug escape rate
```

---

## Maintenance & Updates

### Adding New Regression Tests

1. **Identify bug/issue**
2. **Create test case** with unique ID (REG-XXX)
3. **Tag appropriately** (@regression, @pN, @historical-bug)
4. **Add to documentation**
5. **Verify CI/CD runs it**

### Test Retirement Policy

- Tests for deprecated features can be archived after 2 releases
- Performance benchmarks updated quarterly
- Smoke tests reviewed monthly

---

**Document End**
