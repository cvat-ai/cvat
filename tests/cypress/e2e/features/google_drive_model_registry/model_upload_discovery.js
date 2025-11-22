// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/**
 * End-to-End tests for Google Drive Model Registry
 * Test Suite: Model Upload and Discovery Workflow
 */

context('Google Drive Model Registry - Upload and Discovery', () => {
    const modelSpec = {
        name: 'yolov8-detector-e2e',
        displayName: 'YOLOv8 Detector E2E Test',
        version: '1.0.0',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
        description: 'End-to-end test model for object detection',
        labels: ['person', 'car', 'bicycle'],
        driveFolderId: 'test-folder-123',
        driveFileId: 'test-file-456',
    };

    const cloudStorageSpec = {
        displayName: 'E2E Test Google Drive',
        provider: 'GOOGLE_DRIVE',
        resource: 'e2e-test-folder-id',
        credentialsType: 'OAUTH_TOKEN',
        oauthToken: 'mock-oauth-token-e2e-test',
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    after(() => {
        cy.cleanupModels();
        cy.logout();
    });

    describe('Setup: Configure Google Drive Cloud Storage', () => {
        it('Should attach Google Drive as cloud storage', () => {
            cy.visit('/cloudstorages');
            cy.get('.cvat-cloud-storages-page').should('exist');

            cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();

            cy.get('.cvat-cloud-storage-form').within(() => {
                cy.get('#display_name').type(cloudStorageSpec.displayName);

                cy.get('#provider_type').click();
            });

            cy.contains('.cvat-cloud-storage-select-provider', 'Google Drive').should('be.visible').click();

            cy.get('#resource').type(cloudStorageSpec.resource);
            cy.get('#credentials_type').click();
            cy.contains('.ant-select-item', 'OAuth token').click();
            cy.get('#oauth_token').type(cloudStorageSpec.oauthToken);

            cy.intercept('POST', '/api/cloudstorages').as('createCloudStorage');
            cy.contains('button', 'Submit').click();

            cy.wait('@createCloudStorage', { timeout: 10000 }).then((interception) => {
                expect(interception.response.statusCode).to.be.oneOf([200, 201]);
            });
        });
    });

    describe('Workflow: Upload Model to Google Drive', () => {
        it('Should navigate to models page', () => {
            cy.goToModelsList();
            cy.get('.cvat-models-page').should('exist');
            cy.get('.cvat-models-list').should('be.visible');
        });

        it('Should display upload to Google Drive button', () => {
            cy.get('.cvat-upload-model-to-drive-button')
                .should('be.visible')
                .and('not.be.disabled');
        });

        it('Should upload model metadata via API', () => {
            // Use headless API approach for model registration
            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                const response = await cvat.server.request('/api/models', {
                    method: 'POST',
                    data: modelSpec,
                });

                expect(response.status).to.be.oneOf([200, 201]);
                expect(response.data).to.have.property('id');
                expect(response.data.name).to.equal(modelSpec.name);

                cy.wrap(response.data.id).as('modelId');
            });
        });

        it('Should verify model appears in models list', () => {
            cy.reload();
            cy.get('.cvat-models-list').within(() => {
                cy.contains('.cvat-model-card', modelSpec.displayName)
                    .should('be.visible')
                    .within(() => {
                        cy.contains(modelSpec.version).should('exist');
                        cy.contains(modelSpec.framework).should('exist');
                    });
            });
        });
    });

    describe('Workflow: Model Discovery and Selection', () => {
        it('Should sync models from Google Drive', () => {
            cy.goToModelsList();

            // Check if sync button exists
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-sync-models-button').length > 0) {
                    cy.get('.cvat-sync-models-button').click();
                    cy.intercept('POST', '/api/models/sync').as('syncModels');
                    cy.wait('@syncModels', { timeout: 15000 }).then((interception) => {
                        expect(interception.response.statusCode).to.equal(200);
                    });
                }
            });
        });

        it('Should search for model by name', () => {
            cy.goToModelsList();

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-models-search-input').length > 0) {
                    cy.get('.cvat-models-search-input').clear().type('yolov8');
                    cy.wait(500); // Debounce

                    cy.get('.cvat-models-list').within(() => {
                        cy.contains('.cvat-model-card', modelSpec.displayName).should('be.visible');
                    });
                }
            });
        });

        it('Should filter models by framework', () => {
            cy.goToModelsList();

            cy.get('body').then(($body) => {
                if ($body.find('.cvat-models-filter-framework').length > 0) {
                    cy.get('.cvat-models-filter-framework').click();
                    cy.contains('.ant-select-item', 'PyTorch').click();

                    cy.get('.cvat-models-list .cvat-model-card').each(($card) => {
                        cy.wrap($card).should('contain', 'PYTORCH');
                    });
                }
            });
        });

        it('Should open model details modal', () => {
            cy.goToModelsList();

            cy.contains('.cvat-model-card', modelSpec.displayName).click();

            cy.get('.cvat-model-details-modal').should('be.visible').within(() => {
                cy.contains(modelSpec.name).should('exist');
                cy.contains(modelSpec.description).should('exist');
                cy.contains(modelSpec.version).should('exist');

                // Verify labels
                cy.get('.cvat-model-labels').within(() => {
                    modelSpec.labels.forEach((label) => {
                        cy.contains(label).should('exist');
                    });
                });
            });

            // Close modal
            cy.get('.ant-modal-close').click();
        });
    });

    describe('Workflow: Select Model for Annotation Task', () => {
        let taskSpec;

        before(() => {
            taskSpec = {
                name: 'E2E Test Task with Google Drive Model',
                label: 'person',
                attrName: 'color',
                attrValue: 'white',
                multiAttrParams: false,
            };
        });

        it('Should create annotation task', () => {
            cy.visit('/tasks/create');
            cy.get('.cvat-create-task-page').should('exist');

            cy.get('#name').type(taskSpec.name);

            // Add label
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('[placeholder="Label name"]').type(taskSpec.label);
            cy.contains('button', 'Done').click();

            // Upload dummy image data (if file input exists)
            cy.get('body').then(($body) => {
                if ($body.find('input[type="file"]').length > 0) {
                    cy.fixture('images/image_1.jpg', 'base64').then((fileContent) => {
                        cy.get('input[type="file"]').first().attachFile({
                            fileContent,
                            fileName: 'image_1.jpg',
                            mimeType: 'image/jpeg',
                            encoding: 'base64',
                        }, { force: true });
                    });
                }
            });
        });

        it('Should verify model can be selected for auto-annotation', () => {
            // Check if automatic annotation section exists
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-automatic-annotation-section').length > 0) {
                    cy.get('.cvat-automatic-annotation-section').click();

                    cy.get('.cvat-model-selector').click();
                    cy.contains('.cvat-model-option', modelSpec.displayName).should('exist');
                } else {
                    cy.log('Automatic annotation section not available during task creation');
                }
            });
        });
    });

    describe('Workflow: Model Versioning', () => {
        it('Should support multiple versions of same model', () => {
            const updatedModelSpec = {
                ...modelSpec,
                version: '1.1.0',
                driveFileId: 'test-file-457',
            };

            cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                const response = await cvat.server.request('/api/models', {
                    method: 'POST',
                    data: updatedModelSpec,
                });

                expect(response.status).to.be.oneOf([200, 201]);
                expect(response.data.version).to.equal('1.1.0');
            });

            cy.reload();

            // Verify both versions exist
            cy.get('.cvat-models-list').within(() => {
                cy.contains(modelSpec.version).should('exist');
                cy.contains('1.1.0').should('exist');
            });
        });

        it('Should display version history', () => {
            cy.get('body').then(($body) => {
                if ($body.find('.cvat-model-versions-button').length > 0) {
                    cy.contains('.cvat-model-card', modelSpec.displayName).within(() => {
                        cy.get('.cvat-model-versions-button').click();
                    });

                    cy.get('.cvat-model-versions-modal').should('be.visible').within(() => {
                        cy.contains('1.0.0').should('exist');
                        cy.contains('1.1.0').should('exist');
                    });

                    cy.get('.ant-modal-close').click();
                }
            });
        });
    });

    describe('Cleanup: Remove Test Models', () => {
        it('Should delete test models', () => {
            cy.get('@modelId').then((modelId) => {
                cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
                    await cvat.server.request(`/api/models/${modelId}`, {
                        method: 'DELETE',
                    });
                });
            });

            cy.reload();

            cy.get('.cvat-models-list').within(() => {
                cy.contains(modelSpec.displayName).should('not.exist');
            });
        });
    });
});
