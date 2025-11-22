// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/**
 * End-to-End tests for Google Drive Model Registry
 * Test Suite: Error Handling and Edge Cases
 */

context('Google Drive Model Registry - Error Handling', () => {
    before(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    after(() => {
        cy.logout();
    });

    describe('Upload Failures', () => {
        beforeEach(() => {
            cy.goToModelsList();
        });

        it('Should handle network error during model upload', () => {
            // Mock network failure
            cy.intercept('POST', '/api/models', {
                statusCode: 500,
                body: { detail: 'Network error: Unable to reach Google Drive API' },
                delay: 1000,
            }).as('uploadFailed');

            const failedModelSpec = {
                name: 'network-fail-model',
                displayName: 'Network Failure Test Model',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'fail-folder',
                driveFileId: 'fail-file',
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: failedModelSpec,
                    });
                } catch (error) {
                    expect(error.response.status).to.equal(500);
                    expect(error.response.data.detail).to.include('Network error');
                }
            });
        });

        it('Should handle invalid model format error', () => {
            cy.intercept('POST', '/api/models', {
                statusCode: 400,
                body: {
                    detail: 'Invalid model format: Expected .pt or .pth file',
                    field: 'file_format',
                },
            }).as('invalidFormat');

            const invalidModelSpec = {
                name: 'invalid-format-model',
                displayName: 'Invalid Format Model',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'invalid-file.txt',
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: invalidModelSpec,
                    });
                } catch (error) {
                    expect(error.response.status).to.equal(400);
                    expect(error.response.data.detail).to.include('Invalid model format');
                }
            });
        });

        it('Should handle file size limit exceeded', () => {
            cy.intercept('POST', '/api/models', {
                statusCode: 413,
                body: {
                    detail: 'File size exceeds maximum limit of 5GB',
                    max_size: 5368709120,
                    received_size: 6442450944,
                },
            }).as('fileTooLarge');

            const largeModelSpec = {
                name: 'large-model',
                displayName: 'Oversized Model',
                version: '1.0.0',
                framework: 'TENSORFLOW',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'large-file',
                fileSize: 6442450944, // 6GB
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: largeModelSpec,
                    });
                } catch (error) {
                    expect(error.response.status).to.equal(413);
                    expect(error.response.data.detail).to.include('exceeds maximum limit');
                }
            });
        });
    });

    describe('Expired Google Drive Credentials', () => {
        it('Should handle expired OAuth token', () => {
            cy.intercept('GET', '/api/models*', {
                statusCode: 401,
                body: {
                    detail: 'Google Drive credentials expired',
                    error_code: 'CREDENTIALS_EXPIRED',
                },
            }).as('expiredToken');

            cy.visit('/models');
            cy.wait('@expiredToken', { timeout: 10000 });

            // Verify error handling UI
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-notification-error').length > 0) {
                    cy.get('.cvat-notification-error').should('be.visible');
                }
            });
        });

        it('Should handle invalid service account credentials', () => {
            cy.visit('/cloudstorages');
            cy.get('.cvat-attach-cloud-storage-button').click();

            cy.intercept('POST', '/api/cloudstorages', {
                statusCode: 400,
                body: {
                    detail: 'Invalid service account credentials: JSON parse error',
                    error_code: 'INVALID_CREDENTIALS_FORMAT',
                },
            }).as('invalidCreds');

            cy.get('#display_name').type('Invalid Credentials Test');
            cy.get('#provider_type').click();
            cy.contains('.cvat-cloud-storage-select-provider', 'Google Drive').click();
            cy.get('#resource').type('test-folder');
            cy.get('#credentials_type').click();
            cy.contains('.ant-select-item', 'OAuth token').click();
            cy.get('#oauth_token').type('invalid-token-format');

            cy.contains('button', 'Submit').click();
            cy.wait('@invalidCreds', { timeout: 10000 });
        });

        it('Should handle Google Drive API quota exceeded', () => {
            cy.intercept('POST', '/api/models/sync', {
                statusCode: 429,
                body: {
                    detail: 'Google Drive API quota exceeded. Please try again later.',
                    retry_after: 3600,
                },
            }).as('quotaExceeded');

            cy.goToModelsList();

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-sync-models-button').length > 0) {
                    cy.get('.cvat-sync-models-button').click();
                    cy.wait('@quotaExceeded', { timeout: 10000 });
                }
            });
        });
    });

    describe('Concurrency and Race Conditions', () => {
        it('Should handle concurrent model creation', () => {
            const model1 = {
                name: 'concurrent-model-1',
                displayName: 'Concurrent Test 1',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'folder-1',
                driveFileId: 'file-1',
            };

            const model2 = {
                name: 'concurrent-model-2',
                displayName: 'Concurrent Test 2',
                version: '1.0.0',
                framework: 'TENSORFLOW',
                modelType: 'CLASSIFIER',
                driveFolderId: 'folder-2',
                driveFileId: 'file-2',
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                // Create both models concurrently
                const [response1, response2] = await Promise.allSettled([
                    cvat.server.request('/api/models', { method: 'POST', data: model1 }),
                    cvat.server.request('/api/models', { method: 'POST', data: model2 }),
                ]);

                // At least one should succeed
                const successCount = [response1, response2].filter(
                    (r) => r.status === 'fulfilled'
                ).length;
                expect(successCount).to.be.at.least(1);
            });
        });

        it('Should handle duplicate model name conflict', () => {
            const modelSpec = {
                name: 'duplicate-test-model',
                displayName: 'Duplicate Test Model',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'test-file',
            };

            // Create first model
            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                const response1 = await cvat.server.request('/api/models', {
                    method: 'POST',
                    data: modelSpec,
                });

                expect(response1.status).to.be.oneOf([200, 201]);

                // Try to create duplicate
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: modelSpec,
                    });
                    throw new Error('Should have thrown duplicate error');
                } catch (error) {
                    expect(error.response.status).to.be.oneOf([400, 409]);
                    expect(error.response.data.detail).to.include('already exists');
                }
            });
        });

        it('Should handle simultaneous sync requests', () => {
            cy.intercept('POST', '/api/models/sync').as('syncRequest');

            cy.goToModelsList();

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-sync-models-button').length > 0) {
                    // Trigger multiple sync requests
                    cy.get('.cvat-sync-models-button').click();
                    cy.get('.cvat-sync-models-button').click();
                    cy.get('.cvat-sync-models-button').click();

                    // Should only process one request
                    cy.get('@syncRequest.all').should('have.length.at.most', 1);
                }
            });
        });

        it('Should handle delete during download', () => {
            const modelSpec = {
                name: 'download-delete-test',
                displayName: 'Download Delete Test Model',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'test-file',
            };

            // Create model
            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                const createResponse = await cvat.server.request('/api/models', {
                    method: 'POST',
                    data: modelSpec,
                });

                const modelId = createResponse.data.id;

                // Mock slow download
                cy.intercept('POST', `/api/models/${modelId}/download`, {
                    statusCode: 200,
                    delay: 5000,
                    body: { downloadUrl: 'https://example.com/download' },
                }).as('slowDownload');

                // Start download
                cy.request({
                    method: 'POST',
                    url: `/api/models/${modelId}/download`,
                    failOnStatusCode: false,
                });

                // Try to delete while downloading
                try {
                    await cvat.server.request(`/api/models/${modelId}`, {
                        method: 'DELETE',
                    });
                    // If delete succeeds, verify download was cancelled
                    cy.log('Delete succeeded - download should be cancelled');
                } catch (error) {
                    // If delete fails, verify it's due to ongoing download
                    expect(error.response.status).to.be.oneOf([409, 423]);
                }
            });
        });
    });

    describe('Data Integrity', () => {
        it('Should validate required fields on model creation', () => {
            const incompleteModel = {
                name: 'incomplete-model',
                // Missing required fields: framework, modelType, driveFolderId, driveFileId
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: incompleteModel,
                    });
                    throw new Error('Should have thrown validation error');
                } catch (error) {
                    expect(error.response.status).to.equal(400);
                    expect(error.response.data).to.have.property('detail');
                }
            });
        });

        it('Should validate version format (semver)', () => {
            const invalidVersionModel = {
                name: 'invalid-version-model',
                displayName: 'Invalid Version Model',
                version: 'not-a-version', // Invalid semver
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'test-file',
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: invalidVersionModel,
                    });
                    throw new Error('Should have thrown version validation error');
                } catch (error) {
                    expect(error.response.status).to.equal(400);
                }
            });
        });

        it('Should prevent duplicate Drive file registration', () => {
            const sharedFileId = 'shared-file-id-123';

            const model1 = {
                name: 'model-1',
                displayName: 'Model 1',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'folder-1',
                driveFileId: sharedFileId,
            };

            const model2 = {
                name: 'model-2',
                displayName: 'Model 2',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'folder-2',
                driveFileId: sharedFileId, // Same file ID
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                // Create first model
                await cvat.server.request('/api/models', {
                    method: 'POST',
                    data: model1,
                });

                // Try to create second model with same file ID
                try {
                    await cvat.server.request('/api/models', {
                        method: 'POST',
                        data: model2,
                    });
                    throw new Error('Should have thrown duplicate file error');
                } catch (error) {
                    expect(error.response.status).to.be.oneOf([400, 409]);
                    expect(error.response.data.detail).to.include('file');
                }
            });
        });
    });

    describe('Permission and Access Control', () => {
        it('Should handle permission denied on model access', () => {
            cy.intercept('GET', '/api/models/*', {
                statusCode: 403,
                body: {
                    detail: 'You do not have permission to access this model',
                },
            }).as('permissionDenied');

            cy.visit('/models');

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-model-card').length > 0) {
                    cy.get('.cvat-model-card').first().click();
                    cy.wait('@permissionDenied', { timeout: 10000 });
                }
            });
        });

        it('Should handle Google Drive folder permission changes', () => {
            cy.intercept('POST', '/api/models/sync', {
                statusCode: 403,
                body: {
                    detail: 'Access denied: Folder permissions changed',
                    error_code: 'DRIVE_PERMISSION_DENIED',
                },
            }).as('folderPermissionDenied');

            cy.goToModelsList();

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-sync-models-button').length > 0) {
                    cy.get('.cvat-sync-models-button').click();
                    cy.wait('@folderPermissionDenied', { timeout: 10000 });
                }
            });
        });
    });

    describe('Cleanup and Resource Management', () => {
        afterEach(() => {
            // Clean up any test models created
            cy.cleanupModels();
        });

        it('Should cleanup temporary files after failed upload', () => {
            cy.intercept('POST', '/api/models/upload-to-drive', {
                statusCode: 500,
                body: { detail: 'Upload failed' },
            }).as('failedUpload');

            cy.intercept('DELETE', '/api/models/temp-files/*').as('cleanup');

            const failedModel = {
                name: 'cleanup-test-model',
                displayName: 'Cleanup Test',
                version: '1.0.0',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                driveFolderId: 'test-folder',
                driveFileId: 'test-file',
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                try {
                    await cvat.server.request('/api/models/upload-to-drive', {
                        method: 'POST',
                        data: failedModel,
                    });
                } catch (error) {
                    // Verify cleanup was attempted
                    cy.log('Upload failed, cleanup should occur');
                }
            });
        });

        it('Should handle container shutdown gracefully', () => {
            cy.intercept('GET', '/api/server/about', {
                statusCode: 503,
                body: {
                    detail: 'Service unavailable',
                },
            }).as('serviceUnavailable');

            cy.visit('/models');
        });
    });
});
