// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/**
 * Cypress custom commands for Google Drive Model Registry E2E testing
 */

// ===========================
// Model Registry Commands
// ===========================

Cypress.Commands.add('goToGoogleDriveModels', () => {
    cy.get('a[value="models"]').click();
    cy.url().should('include', '/models');
    cy.get('.cvat-models-page').should('exist');
    cy.get('.cvat-models-list').should('be.visible');
});

Cypress.Commands.add('setupGoogleDriveCloudStorage', (spec = {}) => {
    const defaultSpec = {
        displayName: 'Test Google Drive Storage',
        provider: 'GOOGLE_DRIVE',
        resource: 'test-folder-id-123',
        credentialsType: 'OAUTH_TOKEN',
        oauthToken: 'test-oauth-token-mock',
        ...spec,
    };

    cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
    cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();

    cy.get('#display_name').type(defaultSpec.displayName);
    cy.get('#provider_type').click();
    cy.contains('.cvat-cloud-storage-select-provider', 'Google Drive').click();

    cy.get('#resource').type(defaultSpec.resource);
    cy.get('#credentials_type').click();
    cy.contains('.ant-select-item', 'OAuth token').click();

    cy.get('#oauth_token').type(defaultSpec.oauthToken);

    cy.intercept('POST', '/api/cloudstorages').as('createCloudStorage');
    cy.contains('button', 'Submit').click();

    cy.wait('@createCloudStorage').then((interception) => {
        expect(interception.response.statusCode).to.be.equal(201);
        return cy.wrap(interception.response.body.id);
    });

    cy.verifyNotification();
});

Cypress.Commands.add('uploadModelToDrive', (modelSpec) => {
    const defaultSpec = {
        name: 'test-model',
        displayName: 'Test Model',
        version: '1.0.0',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
        description: 'Test model description',
        labels: ['person', 'car'],
        file: 'models/test_model.pt',
        driveFolderId: 'test-folder-123',
        ...modelSpec,
    };

    cy.goToGoogleDriveModels();
    cy.get('.cvat-upload-model-to-drive-button').click();

    cy.get('.cvat-model-upload-modal').within(() => {
        cy.get('#model_name').type(defaultSpec.name);
        cy.get('#model_display_name').type(defaultSpec.displayName);
        cy.get('#model_version').type(defaultSpec.version);

        cy.get('#framework').click();
        cy.contains('.ant-select-item', defaultSpec.framework).click();

        cy.get('#model_type').click();
        cy.contains('.ant-select-item', defaultSpec.modelType).click();

        cy.get('#description').type(defaultSpec.description);

        // Add labels
        defaultSpec.labels.forEach((label) => {
            cy.get('#labels').type(`${label}{enter}`);
        });

        // Upload file
        cy.get('input[type="file"]').attachFile(defaultSpec.file);

        cy.get('#drive_folder_id').type(defaultSpec.driveFolderId);

        cy.intercept('POST', '/api/models/upload-to-drive').as('uploadModel');
        cy.contains('button', 'Upload').click();
    });

    cy.wait('@uploadModel').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 201, 202]);
        return cy.wrap(interception.response.body);
    });
});

Cypress.Commands.add('syncGoogleDriveModels', () => {
    cy.goToGoogleDriveModels();
    cy.get('.cvat-sync-models-button').click();

    cy.intercept('POST', '/api/models/sync').as('syncModels');
    cy.wait('@syncModels').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        return cy.wrap(interception.response.body);
    });

    cy.verifyNotification();
});

Cypress.Commands.add('registerGoogleDriveModel', (modelData) => {
    const defaultData = {
        name: 'registered-model',
        displayName: 'Registered Model',
        version: '1.0.0',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
        driveFolderId: 'folder-id',
        driveFileId: 'file-id',
        ...modelData,
    };

    cy.window().its('cvat').should('not.be.undefined').then(async (cvat) => {
        const response = await cvat.server.request('/api/models', {
            method: 'POST',
            data: defaultData,
        });
        return cy.wrap(response);
    });
});

Cypress.Commands.add('downloadGoogleDriveModel', (modelName) => {
    cy.goToGoogleDriveModels();

    cy.contains('.cvat-model-card', modelName).within(() => {
        cy.get('.cvat-download-button').click();
    });

    cy.intercept('POST', '/api/models/*/download').as('downloadModel');
    cy.wait('@downloadModel').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        return cy.wrap(interception.response.body);
    });
});

Cypress.Commands.add('deleteGoogleDriveModel', (modelName) => {
    cy.goToGoogleDriveModels();

    cy.contains('.cvat-model-card', modelName).within(() => {
        cy.get('.cvat-delete-button').click();
    });

    cy.get('.cvat-modal-confirm-delete').within(() => {
        cy.intercept('DELETE', '/api/models/*').as('deleteModel');
        cy.contains('button', 'Delete').click();
    });

    cy.wait('@deleteModel').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([204, 200]);
    });

    cy.verifyNotification();
});

Cypress.Commands.add('searchGoogleDriveModels', (query) => {
    cy.goToGoogleDriveModels();

    cy.get('.cvat-models-search-input').clear().type(query);

    cy.intercept('GET', '/api/models?*').as('searchModels');
    cy.wait('@searchModels').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        return cy.wrap(interception.response.body.results);
    });
});

Cypress.Commands.add('filterModelsByFramework', (framework) => {
    cy.goToGoogleDriveModels();

    cy.get('.cvat-models-filter-framework').click();
    cy.contains('.ant-select-item', framework).click();

    cy.intercept('GET', '/api/models?*').as('filterModels');
    cy.wait('@filterModels').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        return cy.wrap(interception.response.body.results);
    });
});

// ===========================
// Training Commands
// ===========================

Cypress.Commands.add('createTrainingJob', (jobSpec) => {
    const defaultSpec = {
        modelName: 'base-model',
        datasetPath: 'datasets/train.zip',
        epochs: 50,
        batchSize: 16,
        learningRate: 0.001,
        checkpointFolder: 'checkpoints/test',
        ...jobSpec,
    };

    cy.visit('/training');
    cy.get('.cvat-training-page').should('exist');
    cy.get('.cvat-create-training-job-button').click();

    cy.get('.cvat-training-job-form').within(() => {
        cy.get('#base_model').click();
        cy.contains('.cvat-model-option', defaultSpec.modelName).click();

        cy.get('#dataset_path').type(defaultSpec.datasetPath);
        cy.get('#epochs').clear().type(defaultSpec.epochs);
        cy.get('#batch_size').clear().type(defaultSpec.batchSize);
        cy.get('#learning_rate').clear().type(defaultSpec.learningRate);
        cy.get('#checkpoint_folder').type(defaultSpec.checkpointFolder);

        cy.intercept('POST', '/api/training/jobs').as('createTrainingJob');
        cy.contains('button', 'Start Training').click();
    });

    cy.wait('@createTrainingJob').then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
        return cy.wrap(interception.response.body);
    });
});

Cypress.Commands.add('mockTrainingJobCompletion', () => {
    cy.intercept('GET', '/api/training/jobs/*', {
        statusCode: 200,
        body: {
            id: 1,
            status: 'completed',
            progress: 100,
            metrics: {
                final_loss: 0.123,
                map_50: 0.87,
                map_95: 0.65,
            },
            checkpoints: [
                { epoch: 50, path: 'epoch_50.pt' },
                { name: 'best.pt', path: 'best.pt' },
            ],
        },
    }).as('completedTrainingJob');
});

// ===========================
// Inference Commands
// ===========================

Cypress.Commands.add('runInference', (taskName, modelName, options = {}) => {
    const defaultOptions = {
        confidenceThreshold: 0.5,
        iouThreshold: 0.45,
        frameSelection: 'all',
        ...options,
    };

    cy.goToTasksList();
    cy.openTask(taskName);
    cy.contains('Actions').click();
    cy.contains('Automatic annotation').click();

    cy.get('.cvat-automatic-annotation-modal').within(() => {
        cy.get('.cvat-model-selector').click();
    });

    cy.contains('.cvat-model-card', modelName).within(() => {
        cy.contains('button', 'Select').click();
    });

    cy.get('.cvat-automatic-annotation-modal').within(() => {
        cy.get('#confidence_threshold').clear().type(defaultOptions.confidenceThreshold);
        cy.get('#iou_threshold').clear().type(defaultOptions.iouThreshold);

        cy.intercept('POST', '/api/tasks/*/annotations/auto').as('startInference');
        cy.contains('button', 'Annotate').click();
    });

    cy.wait('@startInference').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 202]);
        return cy.wrap(interception.response.body);
    });
});

// ===========================
// Augmentation Commands
// ===========================

Cypress.Commands.add('configureAugmentation', (augmentationSpec) => {
    const defaultSpec = {
        taskName: 'source-task',
        augmentations: [
            { type: 'flip_horizontal', probability: 0.5 },
        ],
        targetCount: 1000,
        outputFolder: 'augmented-datasets/test',
        ...augmentationSpec,
    };

    cy.goToTasksList();
    cy.openTask(defaultSpec.taskName);
    cy.contains('Actions').click();
    cy.contains('Dataset augmentation').click();

    cy.get('.cvat-augmentation-modal').within(() => {
        defaultSpec.augmentations.forEach((aug, index) => {
            if (index > 0) cy.contains('Add Augmentation').click();

            cy.get('.cvat-augmentation-item').eq(index).within(() => {
                cy.get('.cvat-aug-type-selector').click();
                cy.contains('.ant-select-item', aug.type.replace('_', ' ')).click();

                if (aug.probability) {
                    cy.get('#probability').clear().type(aug.probability);
                }

                if (aug.params) {
                    Object.entries(aug.params).forEach(([key, value]) => {
                        cy.get(`#${key}`).clear().type(value);
                    });
                }
            });
        });

        cy.get('#target_count').clear().type(defaultSpec.targetCount);
        cy.get('#output_destination').click();
        cy.contains('.ant-select-item', 'Google Drive').click();
        cy.get('#drive_output_folder').type(defaultSpec.outputFolder);

        cy.intercept('POST', '/api/tasks/*/augmentation').as('startAugmentation');
        cy.contains('button', 'Start Augmentation').click();
    });

    cy.wait('@startAugmentation').then((interception) => {
        expect(interception.response.statusCode).to.be.oneOf([200, 202]);
        return cy.wrap(interception.response.body);
    });
});

Cypress.Commands.add('mockAugmentationCompletion', () => {
    cy.intercept('GET', '/api/tasks/*/augmentation/status', {
        statusCode: 200,
        body: {
            status: 'completed',
            progress: 100,
            outputPath: 'augmented-datasets/test',
            stats: {
                originalCount: 100,
                augmentedCount: 1000,
                augmentationsApplied: 3,
            },
        },
    }).as('completedAugmentation');
});

// ===========================
// Mock & Utility Commands
// ===========================

Cypress.Commands.add('mockGoogleDriveAPI', () => {
    // Mock Google Drive file list
    cy.intercept('GET', '**/drive.google.com/drive/v3/files*', {
        statusCode: 200,
        body: {
            files: [
                {
                    id: 'mock-file-id-1',
                    name: 'yolov8.pt',
                    mimeType: 'application/octet-stream',
                    size: 52428800,
                    modifiedTime: '2025-01-15T10:00:00Z',
                },
                {
                    id: 'mock-file-id-2',
                    name: 'model.json',
                    mimeType: 'application/json',
                    size: 1024,
                    modifiedTime: '2025-01-15T10:00:00Z',
                },
            ],
        },
    }).as('listDriveFiles');

    // Mock file download
    cy.intercept('GET', '**/drive.google.com/drive/v3/files/*/export', {
        statusCode: 200,
        headers: { 'content-type': 'application/octet-stream' },
        body: 'mock-model-content',
    }).as('downloadDriveFile');

    // Mock file upload
    cy.intercept('POST', '**/www.googleapis.com/upload/drive/v3/files*', {
        statusCode: 200,
        body: {
            id: 'mock-uploaded-file-id',
            name: 'uploaded-model.pt',
            mimeType: 'application/octet-stream',
        },
    }).as('uploadDriveFile');
});

Cypress.Commands.add('fillModelUploadForm', (formData) => {
    const defaultData = {
        name: 'test-model',
        displayName: 'Test Model',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
        file: 'models/test.pt',
        ...formData,
    };

    cy.get('#model_name').type(defaultData.name);
    cy.get('#model_display_name').type(defaultData.displayName);

    cy.get('#framework').click();
    cy.contains('.ant-select-item', defaultData.framework).click();

    cy.get('#model_type').click();
    cy.contains('.ant-select-item', defaultData.modelType).click();

    if (defaultData.file) {
        cy.get('input[type="file"]').attachFile(defaultData.file);
    }
});

Cypress.Commands.add('fillGoogleDriveStorageForm', (formData) => {
    const defaultData = {
        displayName: 'Test Google Drive',
        credentialsType: 'OAUTH_TOKEN',
        credentials: 'test-token',
        ...formData,
    };

    cy.get('#display_name').type(defaultData.displayName);
    cy.get('#provider_type').click();
    cy.contains('.cvat-cloud-storage-select-provider', 'Google Drive').click();

    cy.get('#credentials_type').click();
    cy.contains('.ant-select-item', defaultData.credentialsType).click();

    if (defaultData.credentialsType === 'OAUTH_TOKEN') {
        cy.get('#oauth_token').type(defaultData.credentials);
    }
});

Cypress.Commands.add('cleanupModels', () => {
    cy.task('getAuthHeaders').then((authHeaders) => {
        cy.request({
            method: 'GET',
            url: '/api/models',
            headers: authHeaders,
        }).then((response) => {
            response.body.results.forEach((model) => {
                if (model.name.includes('test') || model.name.includes('mock')) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/models/${model.id}`,
                        headers: authHeaders,
                        failOnStatusCode: false,
                    });
                }
            });
        });
    });
});

Cypress.Commands.add('setupGoogleDriveModel', (modelName = 'test-model') => {
    cy.registerGoogleDriveModel({
        name: modelName,
        displayName: `${modelName} Display`,
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
    });
});

Cypress.Commands.add('verifyModelInList', (modelName) => {
    cy.goToGoogleDriveModels();
    cy.get('.cvat-models-list').within(() => {
        cy.contains('.cvat-model-card', modelName).should('be.visible');
    });
});

Cypress.Commands.add('openModelDetails', (modelName) => {
    cy.goToGoogleDriveModels();
    cy.contains('.cvat-model-card', modelName).click();
    cy.get('.cvat-model-details-modal').should('be.visible');
});

// ===========================
// Task Creation with Models
// ===========================

Cypress.Commands.add('createAnnotationTask', (taskName = 'Test Task', options = {}) => {
    const defaultOptions = {
        labels: ['person', 'car'],
        imageCount: 10,
        ...options,
    };

    cy.visit('/tasks/create');
    cy.get('#name').type(taskName);

    // Add labels
    defaultOptions.labels.forEach((label) => {
        cy.get('.cvat-constructor-viewer-new-item').click();
        cy.get('[placeholder="Label name"]').type(label);
        cy.contains('button', 'Done').click();
    });

    // Add images (mock)
    for (let i = 0; i < defaultOptions.imageCount; i++) {
        cy.get('input[type="file"]').attachFile(`images/image_${i + 1}.jpg`, {
            force: true,
        });
    }

    cy.intercept('POST', '/api/tasks').as('createTask');
    cy.contains('button', 'Submit').click();

    cy.wait('@createTask').then((interception) => {
        expect(interception.response.statusCode).to.equal(201);
        return cy.wrap(interception.response.body);
    });

    cy.verifyNotification();
});

Cypress.Commands.add('createImageTask', (taskName, imageCount = 5) => {
    cy.createAnnotationTask(taskName, { imageCount });
});
