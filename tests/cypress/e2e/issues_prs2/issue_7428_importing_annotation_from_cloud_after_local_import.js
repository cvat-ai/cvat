// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Incorrect cloud storage filename used in subsequent import.', () => {
    const annotationsArchiveNameCloud = 'bazquux';
    const annotationsArchiveNameLocal = 'foobar';
    let createdCloudStorageId;
    const issueId = '7428';
    const exportFormat = 'CVAT for images';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };

    const serverHost = Cypress.config('baseUrl').includes('3000') ? 'localhost' : 'minio';

    const cloudStorageData = {
        displayName: 'Demo bucket',
        resource: 'public',
        manifest: 'manifest.jsonl',
        endpointUrl: `http://${serverHost}:9000`,
    };

    before(() => {
        createdCloudStorageId = cy.attachS3Bucket(cloudStorageData);
        cy.goToTaskList();
        cy.openTaskJob(taskName);
        cy.createRectangle(rectangleShape2Points);
        cy.saveJob('PATCH', 200, 'saveJobExportDataset');
        cy.goToTaskList();
        cy.openTask(taskName);
    });

    after(() => {
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
        cy.url().should('include', '/cloudstorages');
        cy.deleteCloudStorage(cloudStorageData.displayName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Export Annotation to the local storage', () => {
            cy.clickInTaskMenu('Export task dataset', true, taskName);
            cy.get('.cvat-modal-export-task').should('be.visible').find('.cvat-modal-export-select').click();
            cy.contains('.cvat-modal-export-option-item', exportFormat).should('be.visible').click();
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').should('contain.text', exportFormat);
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-filename-input').type(annotationsArchiveNameLocal);
            cy.contains('button', 'OK').click();
            cy.get('.cvat-notification-notice-export-task-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-task-start');
            cy.waitForDownload();
        });

        it('Export Annotation to the cloud storage', () => {
            cy.clickInTaskMenu('Export task dataset', true, taskName);
            cy.get('.cvat-modal-export-task').should('be.visible').find('.cvat-modal-export-select').click();
            cy.contains('.cvat-modal-export-option-item', exportFormat).should('be.visible').click();
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').should('contain.text', exportFormat);
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-filename-input').type(annotationsArchiveNameCloud);
            cy.get('.cvat-modal-export-task').find('.cvat-settings-switch').click();
            cy.get('.cvat-select-target-storage').within(() => {
                cy.get('.ant-select-selection-item').click();
            });
            cy.contains('.cvat-select-target-storage-location', 'Cloud storage').should('be.visible').click();

            if (createdCloudStorageId) {
                cy.get('.cvat-search-target-storage-cloud-storage-field').click();
                cy.get('.cvat-cloud-storage-select-provider').click();
            }
            cy.contains('button', 'OK').click();
            cy.get('.cvat-notification-notice-export-task-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-task-start');
            cy.waitForFileUploadToCloudStorage();
        });

        it('Import Annotation from the local storage', () => {
            cy.clickInTaskMenu('Upload annotations', true, taskName);
            cy.get('.cvat-modal-import-dataset').find('.cvat-modal-import-select').click();
            cy.contains('.cvat-modal-import-dataset-option-item', 'CVAT 1.1').click();
            cy.get('.cvat-modal-import-select').should('contain.text', 'CVAT 1.1');
            cy.get('input[type="file"]').attachFile('foobar.zip', { subjectType: 'drag-n-drop' });
            cy.get('[title="foobar.zip"]').should('be.visible');
            cy.contains('button', 'OK').click();
            cy.get('.cvat-modal-content-load-task-annotation')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Update').click();
                });
            cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-annotation-start');
            cy.verifyNotification();
            cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
        });
        it('Import Annotation from the cloud storage', () => {
            cy.clickInTaskMenu('Upload annotations', true, taskName);
            cy.get('.cvat-modal-import-dataset').find('.cvat-modal-import-select').click();
            cy.contains('.cvat-modal-import-dataset-option-item', 'CVAT 1.1').click();
            cy.get('.cvat-modal-import-select').should('contain.text', 'CVAT 1.1');
            cy.get('.cvat-modal-import-dataset')
                .find('.cvat-modal-import-switch-use-default-storage')
                .click();
            cy.get('.cvat-select-source-storage').within(() => {
                cy.get('.ant-select-selection-item').click();
            });
            cy.contains('.cvat-select-source-storage-location', 'Cloud storage')
                .should('be.visible')
                .click();
            if (createdCloudStorageId) {
                cy.get('.cvat-search-source-storage-cloud-storage-field').click();
                cy.get('.cvat-cloud-storage-select-provider').click();
            }
            cy.get('.cvat-modal-import-dataset')
                .find('.cvat-modal-import-filename-input')
                .type('bazquux.zip');
            cy.contains('button', 'OK').click();
            cy.get('.cvat-modal-content-load-task-annotation')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Update').click();
                });
            cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-import-annotation-start');
            cy.verifyNotification();
            cy.get('.cvat-notification-notice-upload-annotations-fail').should('not.exist');
        });
    });
});
