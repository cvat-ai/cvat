// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const {
    cloudStoragesDummyDataGoogleStorage,
    cloudStoragesDummyDataAzureContainer,
    cloudStoragesDummyDataAzureBucket,
} = require('../../support/dummy-data');

context('Dummy Cloud storages.', { browser: '!firefox' }, () => {
    const caseId = '109';

    beforeEach(() => {
        cy.visit('auth/login');
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create dummy Google cloud storage and check fields.', () => {
            cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', cloudStoragesDummyDataGoogleStorage).as('createCS');
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.wait('@createCS').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item-empty-preview').should('have.length', 1);

            // Check and close notifications
            cy.get('.cvat-notification-notice-fetch-cloud-storage-status-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-status-failed');
            cy.get('.cvat-notification-notice-fetch-cloud-storage-preview-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-preview-failed');

            cy.get('.cvat-cloud-storage-item')
                .should('have.length', 1)
                .and('contain', 'Status: Error')
                .and('contain', '#3: Demo GCS')
                .and('contain', 'Provider: GOOGLE_CLOUD_STORAGE');

            cy.intercept('GET', 'api/v1/cloudstorages/3/status', 'NOT_FOUND').as('gcsStatus');
            cy.intercept(
                'GET',
                'api/v1/cloudstorages/3/preview',
                { fixture: '../integration/actions_tasks3/assets/case_109/preview_GOOGLE_CLOUD_STORAGE.png' },
            ).as('gcsPreview');

            cy.contains('.cvat-header-button', 'Models').should('be.visible').click();
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();

            cy.wait('@gcsStatus').its('response.statusCode').should('eq', 200);
            cy.wait('@gcsPreview').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item')
                .and('contain', 'Status: NOT_FOUND');
            cy.get('.cvat-cloud-storage-item-preview').should('exist');

            cy.get('.cvat-cloud-storage-item-menu-button').trigger('mousemove').trigger('mouseover');
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', 'Update').click();
                });

            cy.get('.cvat-notification-update-info-cloud-storage').should('exist');

            cy.get('.cvat-cloud-storage-form').should('be.visible');

            cy.get('#display_name')
                .should('be.visible')
                .and('have.value', cloudStoragesDummyDataGoogleStorage.results[0].display_name);
            cy.get('#description')
                .should('be.visible')
                .and('have.value', cloudStoragesDummyDataGoogleStorage.results[0].description);
            cy.get('.cvat-cloud-storage-select-provider')
                .should('be.visible')
                .and('have.text', 'Google Cloud Storage');
            cy.get('[title="Key file"]').should('be.visible');
            cy.get('#key_file').should('be.visible');
            cy.get('[title="fakeKey.json"]').should('be.visible');
            cy.get('#key_file').should('be.visible');
            cy.get('#prefix')
                .should('be.visible')
                .and('have.value', '');
            cy.get('#project_id')
                .should('be.visible')
                .and('have.value', '');
            cy.get('#location').should('exist');
            cy.get('[placeholder="manifest.jsonl"]')
                .should('have.attr', 'value', cloudStoragesDummyDataGoogleStorage.results[0].manifests[0]);

            cy.contains('button', 'Cancel').click();
        });

        it('Create dummy Azure Blob Container and check fields.', () => {
            cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', cloudStoragesDummyDataAzureContainer).as('createCS');
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.wait('@createCS').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item-empty-preview').should('have.length', 1);

            // Check and close notifications
            cy.get('.cvat-notification-notice-fetch-cloud-storage-status-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-status-failed');
            cy.get('.cvat-notification-notice-fetch-cloud-storage-preview-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-preview-failed');

            cy.get('.cvat-cloud-storage-item')
                .should('have.length', 1)
                .and('contain', 'Status: Error')
                .and('contain', '#2: Demonstration container')
                .and('contain', 'Provider: AZURE_CONTAINER');

            cy.intercept('GET', 'api/v1/cloudstorages/2/status', 'AVAILABLE').as('acStatus');
            cy.intercept(
                'GET',
                'api/v1/cloudstorages/2/preview',
                { fixture: '../integration/actions_tasks3/assets/case_109/preview_AZURE_CONTAINER.png' },
            ).as('acPreview');

            cy.contains('.cvat-header-button', 'Models').should('be.visible').click();
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();

            cy.wait('@acStatus').its('response.statusCode').should('eq', 200);
            cy.wait('@acPreview').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item')
                .and('contain', 'Status: AVAILABLE');
            cy.get('.cvat-cloud-storage-item-preview').should('exist');

            cy.get('.cvat-cloud-storage-item-menu-button').trigger('mousemove').trigger('mouseover');
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', 'Update').click();
                });

            cy.get('.cvat-notification-update-info-cloud-storage').should('exist');

            cy.get('.cvat-cloud-storage-form').should('be.visible');

            cy.get('#display_name')
                .should('be.visible')
                .and('have.value', 'Demonstration container');
            cy.get('#description')
                .should('be.visible')
                .and('have.value', 'It is first container');
            cy.get('.cvat-cloud-storage-select-provider')
                .should('be.visible')
                .and('have.text', 'Azure Blob Container');
            cy.get('#resource')
                .should('be.visible')
                .and('have.attr', 'value', 'container');
            cy.get('[title="Account name and SAS token"]').should('be.visible');
            cy.get('#account_name')
                .should('be.visible')
                .and('not.have.value', '');
            cy.get('#SAS_token')
                .should('be.visible')
                .and('not.have.value', '');
            cy.get('[placeholder="manifest.jsonl"]')
                .should('have.attr', 'value', 'manifest.jsonl');

            cy.contains('button', 'Cancel').click();
        });

        it('Create dummy AWS S3 and check fields.', () => {
            cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', cloudStoragesDummyDataAzureBucket).as('createCS');
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.wait('@createCS').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item-empty-preview').should('have.length', 1);

            // Check and close notifications
            cy.get('.cvat-notification-notice-fetch-cloud-storage-status-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-status-failed');
            cy.get('.cvat-notification-notice-fetch-cloud-storage-preview-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-preview-failed');

            cy.get('.cvat-cloud-storage-item')
                .should('have.length', 1)
                .and('contain', 'Status: Error')
                .and('contain', '#1: Demonstration bucket')
                .and('contain', 'Provider: AWS_S3_BUCKET');

            cy.intercept('GET', 'api/v1/cloudstorages/1/status', 'FORBIDDEN').as('awsStatus');
            cy.intercept(
                'GET',
                'api/v1/cloudstorages/1/preview',
                { fixture: '../integration/actions_tasks3/assets/case_109/preview_AWS_S3_BUCKET.png' },
            ).as('awsPreview');

            cy.contains('.cvat-header-button', 'Models').should('be.visible').click();
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();

            cy.wait('@awsStatus').its('response.statusCode').should('eq', 200);
            cy.wait('@awsPreview').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item')
                .and('contain', 'Status: FORBIDDEN');
            cy.get('.cvat-cloud-storage-item-preview').should('exist');

            cy.get('.cvat-cloud-storage-item-menu-button').trigger('mousemove').trigger('mouseover');
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', 'Update').click();
                });

            cy.get('.cvat-notification-update-info-cloud-storage').should('exist');

            cy.get('.cvat-cloud-storage-form').should('be.visible');

            cy.get('#display_name')
                .should('be.visible')
                .and('have.value', 'Demonstration bucket');
            cy.get('#description')
                .should('be.visible')
                .and('have.value', 'It is first bucket');
            cy.get('.cvat-cloud-storage-select-provider')
                .should('be.visible')
                .and('have.text', 'AWS S3');
            cy.get('#resource')
                .should('be.visible')
                .and('have.attr', 'value', 'bucket');
            cy.get('[title="Key id and secret access key pair"]').should('be.visible');
            cy.get('#key')
                .should('be.visible')
                .and('not.have.value', '');
            cy.get('#secret_key')
                .should('be.visible')
                .and('not.have.value', '');
            cy.get('#region').should('exist');
            cy.get('[placeholder="manifest.jsonl"]')
                .should('have.attr', 'value', 'manifest.jsonl');

            cy.contains('button', 'Cancel').click();
        });
    });
});
