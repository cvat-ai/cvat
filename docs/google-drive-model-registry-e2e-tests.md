# Google Drive Model Registry - End-to-End (E2E) Integration Tests

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Test Framework**: Cypress
**Target**: CVAT Google Drive Model Registry Integration

---

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Backend + Frontend Workflow Tests](#backend--frontend-workflow-tests)
4. [Error and Edge Case Handling](#error-and-edge-case-handling)
5. [Test Execution](#test-execution)
6. [CI/CD Integration](#cicd-integration)

---

## Overview

This document describes the comprehensive End-to-End (E2E) integration test suite for the Google Drive Model Registry feature in CVAT. These tests validate complete workflows spanning backend services, frontend UI, and Google Drive API integration.

### Test Objectives

1. **Validate Full Workflows**: Test complete user journeys from upload to inference
2. **Backend-Frontend Integration**: Verify seamless communication between layers
3. **Google Drive Integration**: Ensure proper API interactions and data synchronization
4. **Error Handling**: Validate graceful degradation and error recovery
5. **Concurrency**: Test race conditions and simultaneous operations
6. **Security**: Verify authentication, authorization, and credential handling

### Test Framework

**Cypress** is used for E2E testing, following CVAT's existing test patterns:
- **Version**: Cypress 12.x+
- **Language**: JavaScript (ES6+)
- **Location**: `tests/cypress/e2e/features/google_drive_model_registry/`
- **Support Files**: `tests/cypress/support/commands_google_drive_models.js`

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Start CVAT with development dependencies
docker-compose \
    -f docker-compose.yml \
    -f docker-compose.dev.yml \
    -f tests/docker-compose.minio.yml \
    up -d

# 2. Create test user
docker exec -i cvat_server bash -c \
    "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python3 ~/manage.py shell"

# 3. Install Cypress dependencies
cd tests
yarn install
```

### Google Drive Test Setup

**Mock Google Drive Service** (for isolated testing):

```javascript
// tests/cypress/support/mock-google-drive.js
export const mockGoogleDriveAPI = () => {
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
            ],
        },
    }).as('listDriveFiles');

    cy.intercept('POST', '**/drive.google.com/drive/v3/files/*/copy', {
        statusCode: 200,
        body: { id: 'mock-copy-id', name: 'yolov8-copy.pt' },
    }).as('copyDriveFile');

    cy.intercept('GET', '**/drive.google.com/drive/v3/files/*/export', {
        statusCode: 200,
        headers: { 'content-type': 'application/octet-stream' },
        body: new Blob(['mock model content']),
    }).as('downloadDriveFile');
};
```

### Test Data

```javascript
// tests/cypress/fixtures/google-drive-models.json
{
  "validModel": {
    "name": "yolov8-detector",
    "displayName": "YOLOv8 Object Detector",
    "version": "1.0.0",
    "framework": "PYTORCH",
    "modelType": "DETECTOR",
    "description": "Test model for object detection",
    "labels": ["person", "car", "dog", "cat"],
    "driveFolderId": "test-folder-id-123",
    "driveFileId": "test-file-id-456"
  },
  "invalidModel": {
    "name": "invalid-model",
    "framework": "UNKNOWN",
    "modelType": "INVALID"
  },
  "googleDriveCredentials": {
    "type": "service_account",
    "project_id": "test-project",
    "private_key_id": "test-key-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    "client_email": "test@test-project.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  }
}
```

---

## Backend + Frontend Workflow Tests

### Test Suite 1: Model Upload and Discovery

**File**: `tests/cypress/e2e/features/google_drive_model_registry/model_upload_discovery.js`

#### Scenario 1.1: Upload Model to Google Drive and Discover in CVAT

```javascript
describe('Model Upload and Discovery Workflow', () => {
    const modelSpec = {
        name: 'yolov8-detector-e2e',
        displayName: 'YOLOv8 Detector E2E Test',
        version: '1.0.0',
        framework: 'PYTORCH',
        modelType: 'DETECTOR',
        description: 'End-to-end test model',
        labels: ['person', 'car', 'bicycle'],
        driveFolderId: 'test-folder-123',
        driveFileId: 'test-file-456',
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.setupGoogleDriveCloudStorage(); // Custom command
    });

    after(() => {
        cy.cleanupModels(); // Custom command
        cy.logout();
    });

    it('Should upload model file to Google Drive', () => {
        // Step 1: Navigate to Models page
        cy.goToModelsList();
        cy.get('.cvat-models-page').should('exist');

        // Step 2: Click "Upload to Google Drive" button
        cy.get('.cvat-upload-model-to-drive-button').should('be.visible').click();

        // Step 3: Fill upload form
        cy.get('#model_name').type(modelSpec.name);
        cy.get('#model_display_name').type(modelSpec.displayName);
        cy.get('#model_version').type(modelSpec.version);

        cy.get('#framework').click();
        cy.contains('.ant-select-item', 'PyTorch').click();

        cy.get('#model_type').click();
        cy.contains('.ant-select-item', 'Detector').click();

        // Step 4: Upload model file
        const modelFile = 'models/yolov8n.pt'; // From fixtures
        cy.get('input[type="file"]').attachFile(modelFile);
        cy.get('.cvat-model-file-name').should('contain', 'yolov8n.pt');

        // Step 5: Select Google Drive folder
        cy.get('.cvat-drive-folder-selector').click();
        cy.contains('.cvat-drive-folder-item', '/CVAT_Models/').click();

        // Step 6: Submit upload
        cy.intercept('POST', '/api/models/upload-to-drive').as('uploadModel');
        cy.get('.cvat-model-upload-submit').click();

        // Step 7: Verify upload started
        cy.wait('@uploadModel').then((interception) => {
            expect(interception.response.statusCode).to.equal(202);
            expect(interception.response.body).to.have.property('taskId');
        });

        // Step 8: Monitor upload progress
        cy.get('.cvat-upload-progress-modal').should('be.visible');
        cy.get('.ant-progress-text', { timeout: 30000 }).should('contain', '100%');
        cy.verifyNotification('Model uploaded successfully');
    });

    it('Should discover uploaded model in CVAT UI', () => {
        // Step 1: Trigger model sync
        cy.goToModelsList();
        cy.get('.cvat-sync-models-button').click();

        cy.intercept('POST', '/api/models/sync').as('syncModels');
        cy.wait('@syncModels').then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            expect(interception.response.body.synced).to.be.greaterThan(0);
        });

        // Step 2: Verify model appears in list
        cy.get('.cvat-models-list').within(() => {
            cy.contains('.cvat-model-card', modelSpec.displayName)
                .should('be.visible')
                .within(() => {
                    cy.contains(modelSpec.version).should('exist');
                    cy.contains(modelSpec.framework).should('exist');
                    cy.contains('Detector').should('exist');
                });
        });

        // Step 3: Open model details
        cy.contains('.cvat-model-card', modelSpec.displayName).click();
        cy.get('.cvat-model-details-modal').should('be.visible').within(() => {
            cy.contains(modelSpec.name).should('exist');
            cy.contains(modelSpec.description).should('exist');
            cy.get('.cvat-model-labels').within(() => {
                modelSpec.labels.forEach((label) => {
                    cy.contains(label).should('exist');
                });
            });
        });
    });

    it('Should select model for annotation task', () => {
        // Step 1: Create new annotation task
        cy.visit('/tasks/create');
        cy.get('.cvat-create-task-page').should('exist');

        // Step 2: Fill basic task info
        cy.get('#name').type('Test Task with Google Drive Model');
        cy.get('.cvat-constructor-viewer-new-item').click();
        cy.get('[placeholder="Label name"]').type('person');
        cy.contains('button', 'Done').click();

        // Step 3: Upload task data
        cy.get('input[type="file"]').attachFile('images/image_1.jpg');

        // Step 4: Select Google Drive model for auto-annotation
        cy.contains('Automatic annotation').click();
        cy.get('.cvat-model-selector').click();
        cy.contains('.cvat-model-option', modelSpec.displayName).click();

        // Step 5: Submit task creation
        cy.intercept('POST', '/api/tasks').as('createTask');
        cy.contains('button', 'Submit').click();

        cy.wait('@createTask').then((interception) => {
            expect(interception.response.statusCode).to.equal(201);
            expect(interception.response.body.model_id).to.exist;
        });

        cy.verifyNotification('Task created successfully');
    });
});
```

---

### Test Suite 2: Dataset Export and Training Workflow

**File**: `tests/cypress/e2e/features/google_drive_model_registry/dataset_export_training.js`

#### Scenario 2.1: Export Dataset to Google Drive

```javascript
describe('Dataset Export and Training Workflow', () => {
    let taskId;
    const exportSpec = {
        format: 'YOLO 1.1',
        destination: 'GOOGLE_DRIVE',
        driveFolderId: 'test-datasets-folder',
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.createAnnotationTask(); // Create task with annotations
    });

    after(() => {
        cy.cleanupTasks();
        cy.logout();
    });

    it('Should export annotated dataset to Google Drive', () => {
        // Step 1: Open task
        cy.goToTasksList();
        cy.openTask('Test Annotation Task');

        // Step 2: Navigate to export tab
        cy.contains('Actions').click();
        cy.contains('Export dataset').click();

        // Step 3: Select export format
        cy.get('.cvat-modal-export-dataset').within(() => {
            cy.get('#export_format').click();
            cy.contains('.ant-select-item', exportSpec.format).click();

            // Step 4: Select Google Drive as destination
            cy.get('#export_destination').click();
            cy.contains('.ant-select-item', 'Google Drive').click();

            // Step 5: Select Drive folder
            cy.get('.cvat-drive-folder-browser').should('be.visible');
            cy.contains('.cvat-drive-folder', 'Training_Datasets').click();

            // Step 6: Start export
            cy.intercept('POST', '/api/tasks/*/dataset/export').as('exportDataset');
            cy.contains('button', 'Export').click();
        });

        // Step 7: Verify export request
        cy.wait('@exportDataset').then((interception) => {
            expect(interception.response.statusCode).to.equal(202);
            expect(interception.response.body.task_id).to.exist;
        });

        // Step 8: Monitor export progress
        cy.get('.cvat-export-progress-notification').should('be.visible');
        cy.verifyNotification('Dataset exported to Google Drive', { timeout: 60000 });
    });

    it('Should launch training job with exported dataset', () => {
        // Step 1: Navigate to Training page
        cy.visit('/training');
        cy.get('.cvat-training-page').should('exist');

        // Step 2: Create new training job
        cy.get('.cvat-create-training-job-button').click();

        cy.get('.cvat-training-job-form').within(() => {
            // Step 3: Select base model from Google Drive
            cy.get('#base_model').click();
            cy.contains('.cvat-model-option', 'YOLOv8 Detector').click();

            // Step 4: Select training dataset from Google Drive
            cy.get('#dataset_source').click();
            cy.contains('.ant-select-item', 'Google Drive').click();

            cy.get('.cvat-drive-dataset-selector').click();
            cy.contains('.cvat-drive-file', 'Training_Datasets/task_1_yolo.zip').click();

            // Step 5: Configure training parameters
            cy.get('#epochs').clear().type('50');
            cy.get('#batch_size').clear().type('16');
            cy.get('#learning_rate').clear().type('0.001');

            // Step 6: Set checkpoint save location (Google Drive)
            cy.get('#checkpoint_destination').click();
            cy.contains('.ant-select-item', 'Google Drive').click();
            cy.get('#drive_checkpoint_folder').type('Model_Checkpoints/yolov8_training');

            // Step 7: Submit training job
            cy.intercept('POST', '/api/training/jobs').as('createTrainingJob');
            cy.contains('button', 'Start Training').click();
        });

        // Step 8: Verify training job created
        cy.wait('@createTrainingJob').then((interception) => {
            expect(interception.response.statusCode).to.equal(201);
            expect(interception.response.body.id).to.exist;
            expect(interception.response.body.status).to.equal('pending');
        });
    });

    it('Should monitor training completion and view checkpoints', () => {
        // Step 1: Open training jobs list
        cy.visit('/training');
        cy.get('.cvat-training-jobs-list').should('exist');

        // Step 2: Find the running job
        cy.get('.cvat-training-job-card').first().within(() => {
            cy.get('.cvat-job-status').should('contain', 'running');
            cy.get('.cvat-job-progress').should('be.visible');
        });

        // Step 3: Poll for completion (with timeout)
        cy.intercept('GET', '/api/training/jobs/*').as('getJobStatus');

        // Mock job completion for test (in real scenario, this would take time)
        cy.wait('@getJobStatus', { timeout: 5000 });

        // Simulate completed job
        cy.mockTrainingJobCompletion(); // Custom command

        // Step 4: Verify job completed
        cy.reload();
        cy.get('.cvat-training-job-card').first().within(() => {
            cy.get('.cvat-job-status').should('contain', 'completed');
            cy.get('.cvat-job-metrics').within(() => {
                cy.contains('Final Loss').should('exist');
                cy.contains('mAP').should('exist');
            });
        });

        // Step 5: View checkpoints in Google Drive
        cy.get('.cvat-training-job-card').first().within(() => {
            cy.contains('View Checkpoints').click();
        });

        cy.get('.cvat-checkpoints-modal').within(() => {
            cy.get('.cvat-checkpoint-list').children().should('have.length.at.least', 1);
            cy.contains('epoch_50.pt').should('exist');
            cy.contains('best.pt').should('exist');
        });

        // Step 6: Download checkpoint to register as new model
        cy.contains('.cvat-checkpoint-item', 'best.pt').within(() => {
            cy.get('.cvat-register-as-model-button').click();
        });

        cy.get('.cvat-register-model-modal').within(() => {
            cy.get('#model_name').should('have.value', 'yolov8-finetuned');
            cy.get('#version').type('1.1.0');
            cy.contains('button', 'Register').click();
        });

        cy.verifyNotification('Model registered successfully');
    });
});
```

---

### Test Suite 3: Inference Pipeline

**File**: `tests/cypress/e2e/features/google_drive_model_registry/inference_pipeline.js`

#### Scenario 3.1: Run Inference with Google Drive Model

```javascript
describe('Inference Pipeline Workflow', () => {
    const inferenceSpec = {
        modelName: 'yolov8-detector',
        taskName: 'Inference Test Task',
        confidenceThreshold: 0.5,
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.setupGoogleDriveModel(inferenceSpec.modelName);
        cy.createImageTask(inferenceSpec.taskName);
    });

    after(() => {
        cy.cleanupModels();
        cy.cleanupTasks();
        cy.logout();
    });

    it('Should select Google Drive model and launch inference', () => {
        // Step 1: Open task
        cy.goToTasksList();
        cy.openTask(inferenceSpec.taskName);
        cy.contains('Actions').click();
        cy.contains('Automatic annotation').click();

        // Step 2: Open model selector
        cy.get('.cvat-automatic-annotation-modal').within(() => {
            cy.get('.cvat-model-selector').click();
        });

        // Step 3: Filter models from Google Drive
        cy.get('.cvat-model-list-filters').within(() => {
            cy.get('#source_filter').click();
            cy.contains('.ant-select-item', 'Google Drive').click();
        });

        // Step 4: Select model
        cy.contains('.cvat-model-card', inferenceSpec.modelName).within(() => {
            cy.get('.cvat-model-status').should('contain', 'Ready');
            cy.contains('button', 'Select').click();
        });

        // Step 5: Configure inference parameters
        cy.get('.cvat-automatic-annotation-modal').within(() => {
            cy.get('#confidence_threshold').clear().type(inferenceSpec.confidenceThreshold);
            cy.get('#iou_threshold').clear().type('0.45');

            // Select frames to annotate
            cy.get('#frame_selection').click();
            cy.contains('.ant-select-item', 'All frames').click();

            // Step 6: Start inference
            cy.intercept('POST', '/api/tasks/*/annotations/auto').as('startInference');
            cy.contains('button', 'Annotate').click();
        });

        // Step 7: Verify inference started
        cy.wait('@startInference').then((interception) => {
            expect(interception.response.statusCode).to.equal(202);
            expect(interception.response.body.task_id).to.exist;
        });

        // Step 8: Monitor inference progress
        cy.get('.cvat-inference-progress-bar').should('be.visible');
        cy.get('.cvat-inference-status', { timeout: 60000 }).should('contain', 'Completed');
        cy.verifyNotification('Automatic annotation completed');
    });

    it('Should verify inference results in annotation UI', () => {
        // Step 1: Open job for annotation
        cy.goToTasksList();
        cy.openTask(inferenceSpec.taskName);
        cy.get('.cvat-job-item').first().click();

        // Step 2: Wait for canvas to load
        cy.get('.cvat-canvas-container').should('be.visible');
        cy.wait(2000);

        // Step 3: Verify annotations exist
        cy.get('.cvat-objects-sidebar-tabs').within(() => {
            cy.contains('Objects').click();
        });

        cy.get('.cvat-objects-sidebar-states-list').within(() => {
            cy.get('.cvat-objects-sidebar-state-item').should('have.length.at.least', 1);
        });

        // Step 4: Verify annotation details
        cy.get('.cvat-objects-sidebar-state-item').first().within(() => {
            cy.get('.cvat-object-item-label').should('exist');
            cy.get('.cvat-object-item-confidence').should('exist');
            cy.get('.cvat-object-item-confidence').invoke('text').then((confidence) => {
                const confValue = parseFloat(confidence);
                expect(confValue).to.be.at.least(inferenceSpec.confidenceThreshold);
            });
        });

        // Step 5: Verify bounding boxes on canvas
        cy.get('.cvat-canvas-container').within(() => {
            cy.get('rect.cvat_canvas_shape').should('have.length.at.least', 1);
        });

        // Step 6: Check inference metadata
        cy.get('.cvat-objects-sidebar-state-item').first().click();
        cy.get('.cvat-object-item-details').within(() => {
            cy.contains('Source: Automatic').should('exist');
            cy.contains('Model:').should('exist');
            cy.contains(inferenceSpec.modelName).should('exist');
        });
    });

    it('Should send REST API request and verify result overlays', () => {
        // Step 1: Get API token
        cy.window().its('localStorage').invoke('getItem', 'token').then((token) => {
            // Step 2: Prepare test image
            cy.fixture('images/test_image.jpg', 'base64').then((imageBase64) => {
                // Step 3: Send inference API request
                cy.request({
                    method: 'POST',
                    url: '/api/models/inference',
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: {
                        model_name: inferenceSpec.modelName,
                        image: imageBase64,
                        confidence_threshold: inferenceSpec.confidenceThreshold,
                        return_visualization: true,
                    },
                }).then((response) => {
                    // Step 4: Verify response structure
                    expect(response.status).to.equal(200);
                    expect(response.body).to.have.property('detections');
                    expect(response.body).to.have.property('visualization');
                    expect(response.body.detections).to.be.an('array');

                    // Step 5: Verify detection format
                    if (response.body.detections.length > 0) {
                        const detection = response.body.detections[0];
                        expect(detection).to.have.property('label');
                        expect(detection).to.have.property('confidence');
                        expect(detection).to.have.property('bbox');
                        expect(detection.bbox).to.have.all.keys('x', 'y', 'width', 'height');
                    }

                    // Step 6: Verify visualization image
                    expect(response.body.visualization).to.match(/^data:image\/(png|jpeg);base64,/);
                });
            });
        });
    });
});
```

---

### Test Suite 4: Augmentation Workflow

**File**: `tests/cypress/e2e/features/google_drive_model_registry/augmentation_workflow.js`

#### Scenario 4.1: Configure and Execute Dataset Augmentation

```javascript
describe('Dataset Augmentation Workflow', () => {
    const augmentationSpec = {
        taskName: 'Augmentation Source Task',
        outputFolder: 'Augmented_Datasets/test_aug',
        augmentations: [
            { type: 'flip_horizontal', probability: 0.5 },
            { type: 'rotate', params: { min_angle: -15, max_angle: 15 } },
            { type: 'brightness', params: { min: 0.8, max: 1.2 } },
        ],
        targetCount: 1000,
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.createAnnotationTask(augmentationSpec.taskName, { imageCount: 100 });
    });

    after(() => {
        cy.cleanupTasks();
        cy.logout();
    });

    it('Should configure augmentation pipeline', () => {
        // Step 1: Open task
        cy.goToTasksList();
        cy.openTask(augmentationSpec.taskName);

        // Step 2: Navigate to augmentation tab
        cy.contains('Actions').click();
        cy.contains('Dataset augmentation').click();

        cy.get('.cvat-augmentation-modal').within(() => {
            // Step 3: Select augmentation techniques
            cy.contains('Add Augmentation').click();

            augmentationSpec.augmentations.forEach((aug, index) => {
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

            // Step 4: Set target dataset size
            cy.get('#target_count').clear().type(augmentationSpec.targetCount);

            // Step 5: Select Google Drive as output destination
            cy.get('#output_destination').click();
            cy.contains('.ant-select-item', 'Google Drive').click();

            cy.get('.cvat-drive-folder-input').type(augmentationSpec.outputFolder);

            // Step 6: Preview augmentation
            cy.contains('button', 'Preview').click();
        });

        // Step 7: Verify preview
        cy.get('.cvat-augmentation-preview-modal').within(() => {
            cy.get('.cvat-preview-grid').children().should('have.length', 9);
            cy.contains('button', 'Close').click();
        });
    });

    it('Should execute augmentation and monitor progress', () => {
        cy.get('.cvat-augmentation-modal').within(() => {
            // Step 1: Start augmentation
            cy.intercept('POST', '/api/tasks/*/augmentation').as('startAugmentation');
            cy.contains('button', 'Start Augmentation').click();
        });

        // Step 2: Verify augmentation started
        cy.wait('@startAugmentation').then((interception) => {
            expect(interception.response.statusCode).to.equal(202);
            expect(interception.response.body.task_id).to.exist;
        });

        // Step 3: Monitor progress
        cy.get('.cvat-augmentation-progress-modal').should('be.visible').within(() => {
            cy.get('.ant-progress').should('exist');
            cy.get('.cvat-aug-status-text').should('contain', 'Processing');
        });

        // Step 4: Wait for completion (mocked for test speed)
        cy.mockAugmentationCompletion(); // Custom command
        cy.reload();

        cy.verifyNotification('Dataset augmentation completed', { timeout: 10000 });
    });

    it('Should verify augmented dataset in Google Drive', () => {
        // Step 1: Navigate to Cloud Storages
        cy.visit('/cloudstorages');
        cy.get('.cvat-cloud-storages-page').should('exist');

        // Step 2: Open Google Drive storage
        cy.contains('.cvat-cloud-storage-item', 'Google Drive').click();

        // Step 3: Browse to augmented folder
        cy.get('.cvat-cloud-storage-browser').within(() => {
            cy.contains('.cvat-folder', 'Augmented_Datasets').dblclick();
            cy.contains('.cvat-folder', 'test_aug').dblclick();
        });

        // Step 4: Verify files exist
        cy.get('.cvat-file-list').within(() => {
            cy.contains('images.zip').should('exist');
            cy.contains('annotations.json').should('exist');
            cy.contains('metadata.json').should('exist');
        });

        // Step 5: Download and verify metadata
        cy.contains('.cvat-file-item', 'metadata.json').within(() => {
            cy.get('.cvat-download-button').click();
        });

        cy.readFile('cypress/downloads/metadata.json').then((metadata) => {
            expect(metadata.original_count).to.equal(100);
            expect(metadata.augmented_count).to.be.at.least(augmentationSpec.targetCount);
            expect(metadata.augmentations).to.have.length(augmentationSpec.augmentations.length);
        });
    });

    it('Should create new task from augmented dataset', () => {
        // Step 1: Navigate to task creation
        cy.visit('/tasks/create');

        // Step 2: Fill basic info
        cy.get('#name').type('Task from Augmented Dataset');
        cy.get('.cvat-constructor-viewer-new-item').click();
        cy.get('[placeholder="Label name"]').type('object');
        cy.contains('button', 'Done').click();

        // Step 3: Select Google Drive as source
        cy.get('.cvat-data-source-selector').click();
        cy.contains('.ant-select-item', 'Google Drive').click();

        // Step 4: Browse to augmented dataset
        cy.get('.cvat-drive-file-selector').click();
        cy.get('.cvat-drive-browser-modal').within(() => {
            cy.contains('.cvat-folder', 'Augmented_Datasets').dblclick();
            cy.contains('.cvat-folder', 'test_aug').dblclick();
            cy.contains('.cvat-file', 'images.zip').click();
            cy.contains('button', 'Select').click();
        });

        // Step 5: Import annotations
        cy.get('#use_zip_chunks').check();
        cy.get('#import_annotations').check();
        cy.get('#annotation_file').click();
        cy.contains('.cvat-file-option', 'annotations.json').click();

        // Step 6: Submit task creation
        cy.intercept('POST', '/api/tasks').as('createTask');
        cy.contains('button', 'Submit').click();

        cy.wait('@createTask').then((interception) => {
            expect(interception.response.statusCode).to.equal(201);
            expect(interception.response.body.size).to.be.at.least(augmentationSpec.targetCount);
        });

        cy.verifyNotification('Task created successfully');
    });
});
```

---

## Error and Edge Case Handling

### Test Suite 5: Error Handling and Edge Cases

**File**: `tests/cypress/e2e/features/google_drive_model_registry/error_handling.js`

```javascript
describe('Error Handling and Edge Cases', () => {
    before(() => {
        cy.visit('/auth/login');
        cy.login();
    });

    after(() => {
        cy.logout();
    });

    describe('Upload Failures', () => {
        it('Should handle failed model upload (network error)', () => {
            cy.goToModelsList();
            cy.get('.cvat-upload-model-button').click();

            // Fill form
            cy.fillModelUploadForm({
                name: 'test-model',
                framework: 'PYTORCH',
                file: 'models/yolov8n.pt',
            });

            // Mock network failure
            cy.intercept('POST', '/api/models/upload-to-drive', {
                statusCode: 500,
                body: { detail: 'Network error: Unable to reach Google Drive API' },
            }).as('uploadFailed');

            cy.contains('button', 'Upload').click();
            cy.wait('@uploadFailed');

            // Verify error notification
            cy.get('.cvat-notification-error').within(() => {
                cy.contains('Upload failed').should('exist');
                cy.contains('Network error').should('exist');
            });

            // Verify upload status
            cy.get('.cvat-upload-status').should('contain', 'Failed');

            // Verify retry button
            cy.get('.cvat-retry-upload-button').should('be.visible');
        });

        it('Should handle invalid model file format', () => {
            cy.goToModelsList();
            cy.get('.cvat-upload-model-button').click();

            // Try to upload wrong file type
            cy.get('input[type="file"]').attachFile('documents/readme.txt');

            // Verify validation error
            cy.get('.ant-form-item-explain-error').should('contain', 'Invalid file format');
            cy.contains('button', 'Upload').should('be.disabled');
        });

        it('Should handle oversized model file', () => {
            cy.goToModelsList();
            cy.get('.cvat-upload-model-button').click();

            // Mock large file
            cy.intercept('POST', '/api/models/upload-to-drive', {
                statusCode: 413,
                body: { detail: 'File size exceeds maximum limit of 5GB' },
            }).as('fileTooLarge');

            cy.fillModelUploadForm({
                name: 'large-model',
                framework: 'TENSORFLOW',
                file: 'models/huge_model.pb',
            });

            cy.contains('button', 'Upload').click();
            cy.wait('@fileTooLarge');

            cy.get('.cvat-notification-error').should('contain', 'File size exceeds maximum');
        });
    });

    describe('Expired Credentials', () => {
        it('Should handle expired Google Drive OAuth token', () => {
            // Mock expired token response
            cy.intercept('GET', '/api/models*', {
                statusCode: 401,
                body: { detail: 'Google Drive credentials expired' },
            }).as('expiredCredentials');

            cy.goToModelsList();
            cy.wait('@expiredCredentials');

            // Verify error message
            cy.get('.cvat-auth-error-banner').should('be.visible').within(() => {
                cy.contains('Google Drive credentials have expired').should('exist');
                cy.get('.cvat-reauth-button').should('be.visible');
            });

            // Click reauth button
            cy.get('.cvat-reauth-button').click();

            // Verify redirect to OAuth flow
            cy.get('.cvat-oauth-modal').should('be.visible').within(() => {
                cy.contains('Reconnect Google Drive').should('exist');
                cy.get('.cvat-oauth-url').should('exist');
            });
        });

        it('Should handle invalid service account credentials', () => {
            cy.visit('/cloudstorages');
            cy.get('.cvat-attach-cloud-storage-button').click();

            // Fill Google Drive form with invalid credentials
            cy.fillGoogleDriveStorageForm({
                displayName: 'Invalid GDrive',
                credentialsType: 'SERVICE_ACCOUNT',
                credentials: '{"invalid": "json"}',
            });

            cy.intercept('POST', '/api/cloudstorages', {
                statusCode: 400,
                body: { detail: 'Invalid service account credentials format' },
            }).as('invalidCreds');

            cy.contains('button', 'Submit').click();
            cy.wait('@invalidCreds');

            cy.get('.cvat-notification-error').should('contain', 'Invalid service account credentials');
        });
    });

    describe('Concurrency and Race Conditions', () => {
        it('Should handle concurrent model uploads', () => {
            cy.goToModelsList();

            // Start first upload
            cy.uploadModelToDrive('model-1', 'models/model1.pt');

            // Start second upload immediately
            cy.uploadModelToDrive('model-2', 'models/model2.pt');

            // Verify both uploads are tracked
            cy.get('.cvat-upload-queue').within(() => {
                cy.contains('model-1').should('exist');
                cy.contains('model-2').should('exist');
            });

            // Verify sequential processing
            cy.get('.cvat-upload-status-model-1').should('contain', 'Uploading');
            cy.get('.cvat-upload-status-model-2').should('contain', 'Queued');
        });

        it('Should handle simultaneous sync requests', () => {
            cy.goToModelsList();

            // Trigger sync multiple times
            cy.get('.cvat-sync-models-button').click();
            cy.get('.cvat-sync-models-button').click();
            cy.get('.cvat-sync-models-button').click();

            // Verify only one sync runs
            cy.get('@syncModels.all').should('have.length', 1);

            // Verify UI feedback
            cy.get('.cvat-sync-status').should('contain', 'Sync already in progress');
        });

        it('Should handle race condition: delete while download', () => {
            cy.goToModelsList();

            // Start download
            cy.contains('.cvat-model-card', 'test-model').within(() => {
                cy.get('.cvat-download-button').click();
            });

            // Try to delete immediately
            cy.contains('.cvat-model-card', 'test-model').within(() => {
                cy.get('.cvat-delete-button').click();
            });

            cy.get('.cvat-modal-confirm-delete').within(() => {
                cy.contains('button', 'Delete').click();
            });

            // Verify error or graceful handling
            cy.get('.cvat-notification-warning').should('contain', 'Cannot delete model while download is in progress');
        });
    });

    describe('Full Workflow Error Recovery', () => {
        it('Should cleanup artifacts after failed training', () => {
            // Start training with intentional failure
            cy.createTrainingJob({
                modelName: 'fail-model',
                dataset: 'invalid-dataset.zip',
            });

            // Mock training failure
            cy.intercept('GET', '/api/training/jobs/*', {
                statusCode: 200,
                body: {
                    id: 1,
                    status: 'failed',
                    error: 'Invalid dataset format',
                },
            }).as('trainingFailed');

            cy.wait('@trainingFailed');

            // Verify cleanup initiated
            cy.intercept('DELETE', '/api/training/jobs/*/cleanup').as('cleanup');
            cy.get('.cvat-training-job-card').within(() => {
                cy.get('.cvat-cleanup-button').click();
            });

            cy.wait('@cleanup').then((interception) => {
                expect(interception.response.statusCode).to.equal(204);
            });

            cy.verifyNotification('Temporary files cleaned up');
        });

        it('Should handle container shutdown during inference', () => {
            // Start inference
            cy.runInference('test-task', 'yolov8-detector');

            // Simulate container shutdown
            cy.intercept('GET', '/api/tasks/*/annotations/auto/status', {
                statusCode: 503,
                body: { detail: 'Service unavailable: Inference container stopped' },
            }).as('containerDown');

            cy.wait('@containerDown');

            // Verify error handling
            cy.get('.cvat-inference-error').should('be.visible').within(() => {
                cy.contains('Inference interrupted').should('exist');
                cy.get('.cvat-restart-button').should('be.visible');
            });

            // Verify partial results saved
            cy.contains('button', 'View partial results').click();
            cy.get('.cvat-annotation-canvas').should('exist');
        });

        it('Should handle permission changes during operation', () => {
            // Start model download
            cy.downloadModel('protected-model');

            // Mock permission denied mid-operation
            cy.intercept('GET', '/api/models/*/download', {
                statusCode: 403,
                body: { detail: 'Permission denied: Model access revoked' },
            }).as('permissionDenied');

            cy.wait('@permissionDenied');

            // Verify graceful error
            cy.get('.cvat-notification-error').should('contain', 'Permission denied');

            // Verify model marked as inaccessible
            cy.goToModelsList();
            cy.contains('.cvat-model-card', 'protected-model').within(() => {
                cy.get('.cvat-access-status').should('contain', 'Access denied');
                cy.get('.cvat-download-button').should('be.disabled');
            });
        });
    });

    describe('Data Integrity', () => {
        it('Should validate model metadata before registration', () => {
            cy.intercept('POST', '/api/models', (req) => {
                expect(req.body).to.have.property('name');
                expect(req.body).to.have.property('framework');
                expect(req.body).to.have.property('modelType');
                expect(req.body).to.have.property('driveFolderId');
                expect(req.body).to.have.property('driveFileId');
                expect(req.body.version).to.match(/^\d+\.\d+\.\d+$/);
            }).as('createModel');

            cy.registerModel({
                name: 'validated-model',
                framework: 'PYTORCH',
                modelType: 'DETECTOR',
                version: '1.0.0',
            });

            cy.wait('@createModel');
        });

        it('Should prevent duplicate model registration', () => {
            // Register model first time
            cy.registerModel({ name: 'unique-model' });
            cy.verifyNotification('Model registered successfully');

            // Try to register same model again
            cy.registerModel({ name: 'unique-model' });

            cy.intercept('POST', '/api/models', {
                statusCode: 409,
                body: { detail: 'Model with this name already exists' },
            }).as('duplicateModel');

            cy.wait('@duplicateModel');
            cy.get('.cvat-notification-error').should('contain', 'Model with this name already exists');
        });

        it('Should verify file checksums after download', () => {
            cy.intercept('GET', '/api/models/*/download', (req) => {
                req.reply({
                    statusCode: 200,
                    headers: {
                        'X-File-Checksum': 'sha256:abc123...',
                        'Content-Type': 'application/octet-stream',
                    },
                    body: 'mock-model-content',
                });
            }).as('downloadModel');

            cy.downloadModel('checksum-model');
            cy.wait('@downloadModel');

            // Verify checksum validation in console/logs
            cy.window().its('console').then((console) => {
                expect(console.log).to.have.been.calledWith(
                    sinon.match(/Checksum verified: sha256:abc123/),
                );
            });
        });
    });
});
```

---

## Test Execution

### Running E2E Tests

```bash
# Run all Google Drive Model Registry E2E tests
cd tests
yarn run cypress:run:chrome --spec "cypress/e2e/features/google_drive_model_registry/**/*"

# Run specific test suite
yarn run cypress:run:chrome --spec "cypress/e2e/features/google_drive_model_registry/model_upload_discovery.js"

# Run with specific browser
yarn run cypress:run:firefox --spec "cypress/e2e/features/google_drive_model_registry/**/*"

# Open interactive Cypress UI
yarn run cypress:open
# Then select test files from the UI
```

### Test Configuration

**File**: `tests/cypress.config.js`

```javascript
module.exports = {
    e2e: {
        baseUrl: 'http://localhost:8080',
        specPattern: 'cypress/e2e/**/*.js',
        supportFile: 'cypress/support/e2e.js',
        video: true,
        screenshotOnRunFailure: true,
        viewportWidth: 1920,
        viewportHeight: 1080,
        defaultCommandTimeout: 10000,
        requestTimeout: 30000,
        responseTimeout: 30000,
        // Google Drive specific timeouts
        env: {
            DRIVE_UPLOAD_TIMEOUT: 120000,
            TRAINING_TIMEOUT: 300000,
            INFERENCE_TIMEOUT: 60000,
        },
    },
};
```

### Environment Variables

```bash
# .env.test
CVAT_HOST=localhost:8080
GOOGLE_DRIVE_TEST_FOLDER_ID=test-folder-123
GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY=path/to/test-key.json
ENABLE_GOOGLE_DRIVE_MOCKS=true
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/e2e-google-drive.yml`

```yaml
name: E2E Tests - Google Drive Model Registry

on:
  pull_request:
    paths:
      - 'cvat/apps/engine/**'
      - 'cvat-ui/**'
      - 'tests/cypress/e2e/features/google_drive_model_registry/**'
  push:
    branches:
      - develop
      - master

jobs:
  e2e-google-drive:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        browser: [chrome, firefox]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Start CVAT services
        run: |
          docker-compose \
            -f docker-compose.yml \
            -f docker-compose.dev.yml \
            -f tests/docker-compose.minio.yml \
            up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:8080/api/server/about; do sleep 2; done'

      - name: Create test user
        run: |
          docker exec -i cvat_server bash -c \
            "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python3 ~/manage.py shell"

      - name: Install Cypress
        working-directory: tests
        run: yarn install

      - name: Run E2E tests
        working-directory: tests
        run: |
          yarn run cypress:run:${{ matrix.browser }} \
            --spec "cypress/e2e/features/google_drive_model_registry/**/*"
        env:
          ENABLE_GOOGLE_DRIVE_MOCKS: true

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-artifacts-${{ matrix.browser }}
          path: |
            tests/cypress/videos
            tests/cypress/screenshots

      - name: Stop services
        if: always()
        run: docker-compose down -v
```

---

## Test Coverage Report

### Expected Coverage

| Workflow | Test Cases | Status |
|----------|------------|--------|
| Model Upload & Discovery | 3 | ✓ |
| Dataset Export & Training | 3 | ✓ |
| Inference Pipeline | 3 | ✓ |
| Augmentation | 4 | ✓ |
| Upload Failures | 3 | ✓ |
| Expired Credentials | 2 | ✓ |
| Concurrency | 3 | ✓ |
| Full Workflow Recovery | 3 | ✓ |
| Data Integrity | 3 | ✓ |
| **Total** | **27** | **✓** |

---

## Maintenance

### Updating Tests

When Google Drive API or CVAT features change:

1. Update mock responses in `support/mock-google-drive.js`
2. Update fixture data in `fixtures/google-drive-models.json`
3. Update custom commands in `support/commands_google_drive_models.js`
4. Re-run full test suite to verify

### Debugging Failed Tests

```bash
# Run with debug mode
DEBUG=cypress:* yarn run cypress:run

# Run in headed mode
yarn run cypress:run --headed --no-exit

# Run with browser console logs
yarn run cypress:run --browser chrome --headed --browser-args="--auto-open-devtools-for-tabs"
```

---

**Document End**
