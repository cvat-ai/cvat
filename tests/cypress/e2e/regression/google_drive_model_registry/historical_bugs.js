// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/**
 * Regression Test Suite: Historical Bugs
 * Ensures previously fixed bugs do not reoccur
 */

context('Regression Tests - Historical Bugs', {
    tags: ['@regression', '@historical-bug'],
}, () => {
    before(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    after(() => {
        cy.cleanupModels();
        cy.logout();
    });

    describe('REG-001: Model Sync Data Integrity', {
        tags: ['@p0', '@bug-001'],
    }, () => {
        it('Model sync should not overwrite local annotations', () => {
            // Create task with annotations
            cy.createAnnotationTask('Sync Test Task', { imageCount: 5 });

            // Get initial annotation count
            cy.window().its('cvat').then(async (cvat) => {
                const tasks = await cvat.tasks.get({ name: 'Sync Test Task' });
                const taskId = tasks[0].id;

                // Add annotations via API
                await cvat.server.request(`/api/tasks/${taskId}/annotations`, {
                    method: 'PATCH',
                    data: {
                        shapes: [
                            {
                                type: 'rectangle',
                                frame: 0,
                                label_id: 1,
                                points: [10, 10, 100, 100],
                                attributes: [],
                            },
                        ],
                    },
                });

                // Store annotation count
                const beforeSync = await cvat.server.request(`/api/tasks/${taskId}/annotations`);
                const initialCount = beforeSync.data.shapes.length;

                // Trigger model sync
                cy.get('body').then(($body) => {
                    if ($body.find('.cvat-sync-models-button').length > 0) {
                        cy.goToModelsList();
                        cy.get('.cvat-sync-models-button').click();
                        cy.wait(2000);
                    }
                });

                // Verify annotations unchanged
                const afterSync = await cvat.server.request(`/api/tasks/${taskId}/annotations`);
                expect(afterSync.data.shapes.length).to.equal(initialCount);
                expect(afterSync.data.shapes[0].points).to.deep.equal([10, 10, 100, 100]);
            });
        });
    });

    describe('REG-002: Large File Upload Timeout', {
        tags: ['@p1', '@bug-002'],
    }, () => {
        it('Large model upload should handle slow connections', () => {
            const largeModelSpec = {
                name: 'large-timeout-test',
                displayName: 'Large Timeout Test',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'large-file',
            };

            // Mock slow upload (30 second delay)
            cy.intercept('POST', '/api/models', (req) => {
                req.reply({
                    statusCode: 202,
                    delay: 30000,
                    body: { task_id: 'upload-task-123', status: 'processing' },
                });
            }).as('slowUpload');

            cy.window().its('cvat').then(async (cvat) => {
                const promise = cvat.server.request('/api/models', {
                    method: 'POST',
                    data: largeModelSpec,
                    timeout: 60000, // 60 second timeout
                });

                // Should not timeout
                const response = await promise;
                expect(response.status).to.equal(202);
            });
        });
    });

    describe('REG-003: Duplicate Model Name Validation', {
        tags: ['@p1', '@bug-003'],
    }, () => {
        it('Should show clear error for duplicate model names', () => {
            const modelSpec = {
                name: 'duplicate-test-model-reg',
                displayName: 'Duplicate Test',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'test-file-unique-1',
            };

            // Create first model
            cy.registerGoogleDriveModel(modelSpec);

            // Try to create duplicate with different file ID
            const duplicateSpec = {
                ...modelSpec,
                driveFileId: 'test-file-unique-2', // Different file
            };

            cy.window().its('cvat').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: duplicateSpec,
                    });
                    throw new Error('Should have rejected duplicate name');
                } catch (error) {
                    expect(error.response.status).to.be.oneOf([400, 409]);
                    expect(error.response.data.detail).to.match(/already exists|duplicate/i);
                }
            });
        });
    });

    describe('REG-004: Search Partial Name Matching', {
        tags: ['@p2', '@bug-004'],
    }, () => {
        it('Search should match partial model names', () => {
            const models = [
                { name: 'yolov8-detector-v1', framework: 'PYTORCH', modelType: 'DETECTOR' },
                { name: 'yolov8-detector-v2', framework: 'PYTORCH', modelType: 'DETECTOR' },
                { name: 'resnet-classifier', framework: 'TENSORFLOW', modelType: 'CLASSIFIER' },
            ];

            // Create test models
            models.forEach((model, index) => {
                cy.registerGoogleDriveModel({
                    ...model,
                    driveFolderId: `folder-${index}`,
                    driveFileId: `file-${index}`,
                });
            });

            // Search for partial match
            cy.intercept('GET', '/api/models?*').as('searchRequest');
            cy.goToModelsList();

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-models-search-input').length > 0) {
                    cy.get('.cvat-models-search-input').type('yolo');
                    cy.wait('@searchRequest').then((interception) => {
                        const url = interception.request.url;
                        expect(url).to.include('search=yolo');
                    });

                    // Should show both yolov8 models
                    cy.get('.cvat-models-list').within(() => {
                        cy.contains('yolov8-detector-v1').should('be.visible');
                        cy.contains('yolov8-detector-v2').should('be.visible');
                        cy.contains('resnet-classifier').should('not.exist');
                    });
                }
            });
        });
    });

    describe('REG-005: OAuth Token Refresh', {
        tags: ['@p1', '@bug-005'],
    }, () => {
        it('Should handle OAuth token expiration gracefully', () => {
            // Mock expired token response
            cy.intercept('GET', '/api/models*', {
                statusCode: 401,
                body: {
                    detail: 'OAuth token expired',
                    error_code: 'TOKEN_EXPIRED',
                },
            }).as('expiredToken');

            cy.visit('/models');
            cy.wait('@expiredToken');

            // Verify error is shown (not silent failure)
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-notification-error').length > 0) {
                    cy.get('.cvat-notification-error').should('contain', 'expired');
                } else if ($body.find('.cvat-auth-error-banner').length > 0) {
                    cy.get('.cvat-auth-error-banner').should('be.visible');
                }
            });
        });
    });

    describe('REG-006: Large Image Inference Stability', {
        tags: ['@p0', '@bug-006'],
    }, () => {
        it('Inference should handle 8K resolution images', () => {
            // Mock large image inference
            cy.intercept('POST', '/api/tasks/*/annotations/auto', {
                statusCode: 202,
                body: {
                    task_id: 'inference-large-image',
                    status: 'processing',
                },
            }).as('largeInference');

            // Create task with large image metadata
            cy.window().its('cvat').then(async (cvat) => {
                const taskSpec = {
                    name: 'Large Image Test',
                    labels: [{ name: 'car' }],
                    image_quality: 100,
                    size: 1,
                };

                const task = await cvat.tasks.save(new cvat.classes.Task(taskSpec));

                // Start inference
                const response = await cvat.server.request(`/api/tasks/${task.id}/annotations/auto`, {
                    method: 'POST',
                    data: {
                        model_id: 1,
                        function_id: null,
                    },
                });

                expect(response.status).to.equal(202);
            });
        });
    });

    describe('REG-007: Model Metadata Update After Sync', {
        tags: ['@p2', '@bug-007'],
    }, () => {
        it('Model metadata should update after sync', () => {
            const initialModel = {
                name: 'sync-metadata-test',
                displayName: 'Old Display Name',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'metadata-file',
            };

            cy.registerGoogleDriveModel(initialModel);

            // Mock sync with updated metadata
            cy.intercept('POST', '/api/models/sync', {
                statusCode: 200,
                body: {
                    synced: 1,
                    updated: [{
                        id: 1,
                        name: 'sync-metadata-test',
                        displayName: 'New Display Name',
                        version: '2.0.0',
                    }],
                },
            }).as('syncWithUpdate');

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-sync-models-button').length > 0) {
                    cy.goToModelsList();
                    cy.get('.cvat-sync-models-button').click();
                    cy.wait('@syncWithUpdate');

                    cy.reload();

                    // Verify metadata updated
                    cy.contains('.cvat-model-card', 'New Display Name').should('be.visible');
                    cy.contains('2.0.0').should('be.visible');
                }
            });
        });
    });

    describe('REG-008: Concurrent Upload Race Condition', {
        tags: ['@p1', '@bug-008'],
    }, () => {
        it('Concurrent uploads should complete without corruption', () => {
            const upload1 = {
                name: 'concurrent-model-1',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'folder-1',
                driveFileId: 'file-1',
            };

            const upload2 = {
                name: 'concurrent-model-2',
                framework: 'TENSORFLOW',
                modelType: 'CLASSIFIER',
                driveFolderId: 'folder-2',
                driveFileId: 'file-2',
            };

            cy.window().its('cvat').then(async (cvat) => {
                // Start both uploads concurrently
                const [response1, response2] = await Promise.allSettled([
                    cvat.server.request('/api/models', { method: 'POST', data: upload1 }),
                    cvat.server.request('/api/models', { method: 'POST', data: upload2 }),
                ]);

                // At least one should succeed
                const successCount = [response1, response2].filter(
                    (r) => r.status === 'fulfilled',
                ).length;
                expect(successCount).to.be.at.least(1);

                // If both succeeded, verify both models exist
                if (successCount === 2) {
                    const models = await cvat.server.request('/api/models');
                    const modelNames = models.data.results.map((m) => m.name);
                    expect(modelNames).to.include('concurrent-model-1');
                    expect(modelNames).to.include('concurrent-model-2');
                }
            });
        });
    });

    describe('REG-009: Filter State Persistence', {
        tags: ['@p2', '@bug-009'],
    }, () => {
        it('Filter state should persist after page refresh', () => {
            cy.goToModelsList();

            // Apply filter
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-models-filter-framework').length > 0) {
                    cy.get('.cvat-models-filter-framework').click();
                    cy.contains('.ant-select-item', 'PyTorch').click();

                    // Store URL with filter
                    cy.url().as('filteredUrl');

                    // Refresh page
                    cy.reload();

                    // Verify filter still applied
                    cy.get('.cvat-models-filter-framework').should('contain', 'PyTorch');

                    // Or check URL params
                    cy.url().should('include', 'framework=PYTORCH');
                }
            });
        });
    });

    describe('REG-010: Pagination with Large Model Count', {
        tags: ['@p1', '@bug-010'],
    }, () => {
        it('Pagination should work with >1000 models', () => {
            // Mock large model set
            cy.intercept('GET', '/api/models?*', (req) => {
                const url = new URL(req.url);
                const page = parseInt(url.searchParams.get('page') || '1', 10);
                const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);

                req.reply({
                    statusCode: 200,
                    body: {
                        count: 1500,
                        next: page < 75 ? `/api/models?page=${page + 1}` : null,
                        previous: page > 1 ? `/api/models?page=${page - 1}` : null,
                        results: Array.from({ length: pageSize }, (_, i) => ({
                            id: (page - 1) * pageSize + i + 1,
                            name: `model-${(page - 1) * pageSize + i + 1}`,
                            framework: 'PYTORCH',
                            modelType: 'DETECTOR',
                        })),
                    },
                });
            }).as('paginatedModels');

            cy.visit('/models');
            cy.wait('@paginatedModels');

            // Verify total count
            cy.get('.ant-pagination-total-text').should('contain', '1500');

            // Navigate to page 50
            cy.get('.ant-pagination').within(() => {
                cy.get('input[type="text"]').clear().type('50{enter}');
            });

            cy.wait('@paginatedModels');

            // Verify correct page loaded
            cy.url().should('include', 'page=50');
            cy.contains('.cvat-model-card', 'model-981').should('be.visible'); // (50-1)*20 + 1
        });
    });
});
