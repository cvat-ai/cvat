// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const {
    cloudStoragesDummyDataGoogleStorage,
    cloudStoragesDummyDataAzureContainer,
    cloudStoragesDummyDataAWSBucket,
} = require('../../support/dummy-data');

context('Dummy Cloud storages.', { browser: '!firefox' }, () => {
    const caseId = '109';
    const imageFolder = '../integration/actions_tasks3/assets/case_109';

    function testCreateDummyStorage(dummyCS) {
        cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', dummyCS).as('createCS');
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
        cy.wait('@createCS').its('response.statusCode').should('eq', 200);
        cy.get('.cvat-cloud-storage-item-empty-preview').should('have.length', 1);
    }

    function testCheckAndCloseNotification() {
        // Check and close notifications
        cy.get('.cvat-notification-notice-fetch-cloud-storage-status-failed').should('have.length', 1);
        cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-status-failed');
        cy.get('.cvat-notification-notice-fetch-cloud-storage-preview-failed').should('have.length', 1);
        cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-preview-failed');
    }

    function testCSValues({
        status, id, description, provider,
    }) {
        cy.get('.cvat-cloud-storage-item').should('have.length', 1);
        cy.get('.cvat-cloud-storage-item')
            .should('contain', `Status: ${status}`);
        if (description) {
            cy.get('.cvat-cloud-storage-item')
                .should('contain', `#${id}: ${description}`);
        }
        if (provider) {
            cy.get('.cvat-cloud-storage-item')
                .should('contain', `Provider: ${provider}`);
        }
        if (status !== 'Error') {
            cy.get('.cvat-cloud-storage-item-preview').should('exist');
        }
    }

    function testCSSetStatusPreview(id, status, image) {
        cy.intercept('GET', `api/v1/cloudstorages/${id}/status`, status).as('csStatus');
        cy.intercept(
            'GET',
            `api/v1/cloudstorages/${id}/preview`,
            { fixture: `${imageFolder}/${image}` },
        ).as('csPreview');

        cy.contains('.cvat-header-button', 'Models').should('be.visible').click();
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();

        cy.wait('@csStatus').its('response.statusCode').should('eq', 200);
        cy.wait('@csPreview').its('response.statusCode').should('eq', 200);
    }

    function testGoToCSUpdatePage() {
        cy.get('.cvat-cloud-storage-item-menu-button').trigger('mousemove').trigger('mouseover');
        cy.get('.ant-dropdown')
            .not('.ant-dropdown-hidden')
            .within(() => {
                cy.contains('[role="menuitem"]', 'Update').click();
            });

        cy.get('.cvat-notification-update-info-cloud-storage').should('exist');

        cy.get('.cvat-cloud-storage-form').should('be.visible');
    }

    beforeEach(() => {
        cy.visit('auth/login');
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create dummy Google cloud storage and check fields.', () => {
            testCreateDummyStorage(cloudStoragesDummyDataGoogleStorage);
            testCheckAndCloseNotification();
            testCSValues({
                status: 'Error', id: 3, description: 'Demo GCS', provider: 'GOOGLE_CLOUD_STORAGE',
            });
            testCSSetStatusPreview(3, 'NOT_FOUND', 'preview_GOOGLE_CLOUD_STORAGE.png');
            testCSValues({
                status: 'NOT_FOUND',
            });
            testGoToCSUpdatePage();

            cy.get('#display_name')
                .should('be.visible')
                .and('have.value', 'Demo GCS');
            cy.get('#description')
                .should('be.visible')
                .and('have.value', 'It is first google cloud storage');
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
                .should('have.attr', 'value', 'manifest.jsonl');
        });

        it('Create dummy Azure Blob Container and check fields.', () => {
            testCreateDummyStorage(cloudStoragesDummyDataAzureContainer);
            testCheckAndCloseNotification();
            testCSValues({
                status: 'Error', id: 2, description: 'Demonstration container', provider: 'AZURE_CONTAINER',
            });
            testCSSetStatusPreview(2, 'AVAILABLE', 'preview_AZURE_CONTAINER.png');
            testCSValues({
                status: 'AVAILABLE',
            });
            testGoToCSUpdatePage();

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
        });

        it('Create dummy AWS S3 and check fields.', () => {
            testCreateDummyStorage(cloudStoragesDummyDataAWSBucket);
            testCheckAndCloseNotification();
            testCSValues({
                status: 'Error', id: 1, description: 'Demonstration bucket', provider: 'AWS_S3_BUCKET',
            });
            testCSSetStatusPreview(1, 'FORBIDDEN', 'preview_AWS_S3_BUCKET.png');
            testCSValues({
                status: 'FORBIDDEN',
            });
            testGoToCSUpdatePage();

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
        });
    });
});
