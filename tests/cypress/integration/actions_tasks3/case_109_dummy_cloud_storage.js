// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const { cloudStoragesDummyData } = require('../../../../cvat-core/tests/mocks/dummy-data.mock');

context('Cloud storage.', () => {
    const caseId = '109';

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create dummy cloud storages without previwe and status.', () => {
            cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', cloudStoragesDummyData).as('createCS');

            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.wait('@createCS').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item-empty-preview').should('have.length', 3);

            // Check and close notifications
            cy.get('.cvat-notification-notice-fetch-cloud-storage-status-failed')
                .should('have.length', 3)
                .find('[data-icon="close"]')
                .click({ multiple: true });
            cy.get('.cvat-notification-notice-fetch-cloud-storage-preview-failed')
                .should('have.length', 3)
                .find('[data-icon="close"]')
                .click({ multiple: true });

            cy.get('.cvat-cloud-storage-item').should('have.length', 3).then((items) => {
                for (let i = 0; i < items.length; i++) {
                    expect(items[i].innerText).contain('Status: Error');
                }
                expect(items[0].innerText).contain('#3: Demo GCS');
                expect(items[0].innerText).contain('Provider: GOOGLE_CLOUD_STORAGE');

                expect(items[1].innerText).contain('#2: Demonstration container');
                expect(items[1].innerText).contain('Provider: AZURE_CONTAINER');

                expect(items[2].innerText).contain('#1: Demonstration bucket');
                expect(items[2].innerText).contain('Provider: AWS_S3_BUCKET');
            });
        });

        it('Set status and preview for Google cloud storage.', () => {
            cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', cloudStoragesDummyData).as('createCS');

            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.wait('@createCS').its('response.statusCode').should('eq', 200);

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
        });
    });
});
