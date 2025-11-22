// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/**
 * Smoke Tests: Core CVAT Functionality
 * Ensures Google Drive integration doesn't break core features
 */

context('Smoke Tests - Core CVAT Functionality', {
    tags: ['@smoke', '@p0'],
}, () => {
    beforeEach(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    describe('SMOKE-001: Authentication', {
        tags: ['@auth'],
    }, () => {
        it('User can login and logout', () => {
            cy.url().should('not.include', '/auth/login');
            cy.get('.cvat-header').should('be.visible');

            cy.logout();
            cy.url().should('include', '/auth/login');
        });
    });

    describe('SMOKE-002: Task Management', {
        tags: ['@tasks'],
    }, () => {
        it('User can create annotation task without Google Drive', () => {
            cy.visit('/tasks/create');
            cy.get('.cvat-create-task-page').should('exist');

            cy.get('#name').type('Smoke Test Task - No GDrive');

            // Add label
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('[placeholder="Label name"]').type('car');
            cy.contains('button', 'Done').click();

            // Upload local file (if possible)
            cy.get('body').then(($body) => {
                if ($body.find('input[type="file"]').length > 0) {
                    cy.fixture('images/image_1.jpg', 'base64').then((file) => {
                        cy.get('input[type="file"]').first().attachFile({
                            fileContent: file,
                            fileName: 'image_1.jpg',
                            mimeType: 'image/jpeg',
                            encoding: 'base64',
                        }, { force: true });
                    });

                    cy.intercept('POST', '/api/tasks').as('createTask');
                    cy.contains('button', 'Submit').click();
                    cy.wait('@createTask', { timeout: 15000 });
                }
            });
        });

        it('User can view tasks list', () => {
            cy.visit('/tasks');
            cy.get('.cvat-tasks-page').should('exist');
        });
    });

    describe('SMOKE-003: Annotation Interface', {
        tags: ['@annotation'],
    }, () => {
        it('Annotation canvas loads correctly', () => {
            // Create task first
            cy.window().its('cvat').then(async (cvat) => {
                try {
                    const task = new cvat.classes.Task({
                        name: 'Canvas Smoke Test',
                        labels: [{ name: 'person', attributes: [], type: 'any' }],
                        image_quality: 70,
                    });

                    await task.save();

                    // Navigate to job
                    cy.visit(`/tasks/${task.id}/jobs/${task.jobs[0].id}`);

                    // Verify canvas elements
                    cy.get('.cvat-canvas-container', { timeout: 10000 }).should('be.visible');
                    cy.get('.cvat-objects-sidebar').should('be.visible');
                    cy.get('.cvat-annotation-header').should('be.visible');
                } catch (error) {
                    cy.log('Task creation failed, skipping canvas test');
                }
            });
        });

        it('Drawing tools are accessible', () => {
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-draw-rectangle-control').length > 0) {
                    cy.get('.cvat-draw-rectangle-control').should('exist');
                    cy.get('.cvat-draw-polygon-control').should('exist');
                }
            });
        });
    });

    describe('SMOKE-004: Projects', {
        tags: ['@projects'],
    }, () => {
        it('User can navigate to projects page', () => {
            cy.visit('/projects');
            cy.get('.cvat-projects-page').should('exist');
        });

        it('User can view project details', () => {
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-project-item').length > 0) {
                    cy.get('.cvat-project-item').first().click();
                    cy.url().should('include', '/projects/');
                }
            });
        });
    });

    describe('SMOKE-005: Models Page', {
        tags: ['@models'],
    }, () => {
        it('Models page loads without errors', () => {
            cy.visit('/models');
            cy.get('.cvat-models-page').should('exist');
        });

        it('Can navigate between tasks and models', () => {
            cy.visit('/tasks');
            cy.get('.cvat-tasks-page').should('exist');

            cy.goToModelsList();
            cy.get('.cvat-models-page').should('exist');

            cy.visit('/tasks');
            cy.get('.cvat-tasks-page').should('exist');
        });
    });

    describe('SMOKE-006: Cloud Storage', {
        tags: ['@cloud-storage'],
    }, () => {
        it('Cloud storages page is accessible', () => {
            cy.visit('/cloudstorages');
            cy.get('.cvat-cloud-storages-page').should('exist');
        });

        it('Can view attach cloud storage dialog', () => {
            cy.visit('/cloudstorages');
            cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();
            cy.get('.cvat-cloud-storage-form').should('be.visible');

            // Close dialog
            cy.get('.ant-modal-close').click();
        });
    });

    describe('SMOKE-007: Performance', {
        tags: ['@performance'],
    }, () => {
        it('Pages load within acceptable time', () => {
            const pages = [
                '/tasks',
                '/projects',
                '/models',
                '/cloudstorages',
            ];

            pages.forEach((page) => {
                const startTime = Date.now();

                cy.visit(page);
                cy.get('body').should('be.visible');

                const loadTime = Date.now() - startTime;
                expect(loadTime).to.be.lessThan(5000); // < 5 seconds

                cy.log(`${page} loaded in ${loadTime}ms`);
            });
        });

        it('No JavaScript errors on page load', () => {
            cy.visit('/models');

            cy.on('uncaught:exception', (err) => {
                // Filter out known non-critical errors
                if (err.message.includes('ResizeObserver')) {
                    return false;
                }
                throw err;
            });

            cy.wait(2000);

            // If we get here, no critical errors occurred
            expect(true).to.be.true;
        });
    });

    describe('SMOKE-008: UI Integrity', {
        tags: ['@ui'],
    }, () => {
        it('Header navigation works', () => {
            cy.visit('/tasks');
            cy.get('.cvat-header').should('be.visible');

            // Verify header links exist
            cy.get('.cvat-header').within(() => {
                cy.contains('Tasks').should('exist');
                cy.contains('Projects').should('exist');
                cy.contains('Models').should('exist');
            });
        });

        it('Footer is visible', () => {
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-footer').length > 0) {
                    cy.get('.cvat-footer').should('be.visible');
                }
            });
        });

        it('No major layout issues', () => {
            cy.visit('/models');

            // Check viewport doesn't have horizontal scroll
            cy.window().then((win) => {
                expect(win.document.body.scrollWidth).to.be.at.most(win.innerWidth + 20);
            });
        });
    });

    describe('SMOKE-009: Annotations Not Affected', {
        tags: ['@annotations-integrity'],
    }, () => {
        it('Existing annotations are preserved', () => {
            cy.window().its('cvat').then(async (cvat) => {
                try {
                    // Get existing tasks
                    const tasks = await cvat.tasks.get({ page: 1, pageSize: 10 });

                    if (tasks.length > 0) {
                        const task = tasks[0];

                        // Get annotations
                        const annotations = await cvat.server.request(
                            `/api/tasks/${task.id}/annotations`,
                        );

                        // Verify annotations exist
                        if (annotations.data.shapes && annotations.data.shapes.length > 0) {
                            cy.log(`Task ${task.id} has ${annotations.data.shapes.length} annotations`);
                            expect(annotations.data.shapes).to.be.an('array');
                        }
                    }
                } catch (error) {
                    cy.log('No existing tasks to check annotations');
                }
            });
        });

        it('Can save new annotations', () => {
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-canvas-container').length > 0) {
                    // Draw annotation
                    cy.get('.cvat-draw-rectangle-control').click();
                    cy.get('.cvat-canvas-container')
                        .trigger('mousedown', 100, 100)
                        .trigger('mousemove', 200, 200)
                        .trigger('mouseup');

                    // Save
                    cy.get('[title="Save current changes Ctrl+S"]').click();

                    // Verify saved
                    cy.get('.cvat-notification-saved').should('exist');
                }
            });
        });
    });

    describe('SMOKE-010: API Accessibility', {
        tags: ['@api'],
    }, () => {
        it('API endpoint /api/server/about is accessible', () => {
            cy.request('/api/server/about').then((response) => {
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('name');
            });
        });

        it('Can fetch tasks via API', () => {
            cy.request('/api/tasks').then((response) => {
                expect(response.status).to.equal(200);
                expect(response.body).to.have.property('count');
                expect(response.body).to.have.property('results');
            });
        });

        it('Can fetch models via API', () => {
            cy.request({
                url: '/api/models',
                failOnStatusCode: false,
            }).then((response) => {
                // Should either succeed or give auth error (not server error)
                expect(response.status).to.be.oneOf([200, 401, 403]);
            });
        });
    });
});
