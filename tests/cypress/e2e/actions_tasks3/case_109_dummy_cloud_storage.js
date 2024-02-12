// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const {
    dummyGoogleStorage,
    dummyAzureContainer,
    dummyAWSBucket,
} = require('../../support/dummy-data');

context('Dummy cloud storages.', { browser: '!firefox' }, () => {
    const caseId = '109';
    const imageFolder = '../e2e/actions_tasks3/assets/case_109';

    function testListDummyCloudStorages(dummyCS) {
        cy.intercept('GET', 'api/cloudstorages?**', dummyCS).as('listCS');
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
        cy.wait('@listCS').its('response.statusCode').should('eq', 200);
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
        status, id, displayName, provider, description,
    }) {
        cy.get('.cvat-cloud-storage-item').then((csItem) => {
            cy.get(csItem)
                .should('have.length', 1)
                .should('contain', `Status: ${status}`);
            if (description) {
                cy.get('.cvat-cloud-storage-description-icon')
                    .should('have.length', 1)
                    .trigger('mouseover');
                cy.get('[role="tooltip"]')
                    .should('be.visible')
                    .and('have.text', description);
            }
            if (displayName) {
                cy.get(csItem).should('contain', `#${id}: ${displayName}`);
            }
            if (provider) {
                cy.get(csItem).should('contain', `Provider: ${provider}`);
            }
            if (status !== 'Error') {
                cy.get(csItem).should('exist');
            }
        });
    }

    function testCSSetStatusPreview(id, status, image) {
        cy.intercept('GET', `api/cloudstorages/${id}/status?**`, status).as('csStatus');
        cy.intercept(
            'GET',
            `api/cloudstorages/${id}/preview?**`,
            { fixture: `${imageFolder}/${image}` },
        ).as('csPreview');

        cy.contains('.cvat-header-button', 'Models').should('be.visible').click();
        cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();

        cy.wait('@csStatus').its('response.statusCode').should('eq', 200);
        cy.wait('@csPreview').its('response.statusCode').should('eq', 200);
    }

    function testGoToCSUpdatePage() {
        cy.get('.cvat-cloud-storage-item-menu-button').trigger('mousemove');
        cy.get('.cvat-cloud-storage-item-menu-button').click();
        cy.get('.ant-dropdown')
            .not('.ant-dropdown-hidden')
            .within(() => {
                cy.contains('[role="menuitem"]', 'Update').click();
            });

        cy.get('.cvat-notification-update-info-cloud-storage').should('exist');

        cy.get('.cvat-cloud-storage-form').should('be.visible');
    }

    before(() => {
        cy.visit('auth/login');
    });

    beforeEach(() => {
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create dummy Google Cloud Storage and check fields.', () => {
            testListDummyCloudStorages(dummyGoogleStorage);
            testCheckAndCloseNotification();
            testCSValues({
                status: 'Error',
                id: 3,
                displayName: 'Demo GCS',
                provider: 'GOOGLE_CLOUD_STORAGE',
                description: 'It is first google cloud storage',
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
            cy.get('#provider_type').should('be.disabled');
            cy.get('.cvat-cloud-storage-select-provider')
                .should('be.visible')
                .and('have.text', 'Google Cloud Storage');
            cy.get('#resource')
                .should('be.disabled')
                .and('have.attr', 'value', 'gcsbucket');
            cy.get('[title="Key file"]').should('be.visible');
            cy.get('#key_file').should('be.visible');
            cy.get('[title="fakeKey.json"]').should('be.visible');
            cy.get('#project_id')
                .should('be.visible')
                .and('have.value', '');
            cy.get('#location').should('exist');
            cy.get('#prefix')
                .should('exist')
                .and('have.value', '');
            cy.get('[placeholder="manifest.jsonl"]')
                .should('have.attr', 'value', 'manifest.jsonl');
        });

        it('Create dummy Azure Blob Container and check fields.', () => {
            testListDummyCloudStorages(dummyAzureContainer);
            testCheckAndCloseNotification();
            testCSValues({
                status: 'Error',
                id: 2,
                displayName: 'Demonstration container',
                provider: 'AZURE_CONTAINER',
                description: 'It is first container',
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
            cy.get('#provider_type').should('be.disabled');
            cy.get('.cvat-cloud-storage-select-provider')
                .should('be.visible')
                .and('have.text', 'Azure Blob Container');
            cy.get('#resource')
                .should('be.disabled')
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
            testListDummyCloudStorages(dummyAWSBucket);
            testCheckAndCloseNotification();
            testCSValues({
                status: 'Error',
                id: 1,
                displayName: 'Demonstration bucket',
                provider: 'AWS_S3_BUCKET',
                description: 'It is first bucket',
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
            cy.get('#provider_type').should('be.disabled');
            cy.get('.cvat-cloud-storage-select-provider')
                .should('be.visible')
                .and('have.text', 'AWS S3');
            cy.get('#resource')
                .should('be.disabled')
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
