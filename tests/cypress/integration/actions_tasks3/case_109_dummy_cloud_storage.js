// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const {
    cloudStoragesDummyDataGoogleStorage,
    cloudStoragesDummyDataAzureContainer,
    cloudStoragesDummyDataAzureBucket
} = require('../../support/dummy-data');

context('Cloud storage.', () => {
    const caseId = '109';

    beforeEach(() => {
        cy.visit('auth/login');
        cy.login();
    });

    // afterEach(() => {
    //     cy.logout();
    // });

    describe(`Testing case "${caseId}"`, () => {
        it('Create dummy Google cloud storage.', () => {
            cy.intercept('GET', 'api/v1/cloudstorages?page_size=12&page=1', cloudStoragesDummyDataGoogleStorage).as('createCS');
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.wait('@createCS').its('response.statusCode').should('eq', 200);

            cy.get('.cvat-cloud-storage-item-empty-preview').should('have.length', 1);

            // Check and close notifications
            cy.get('.cvat-notification-notice-fetch-cloud-storage-status-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-status-failed');
            cy.get('.cvat-notification-notice-fetch-cloud-storage-preview-failed').should('have.length', 1);
            cy.closeNotification('.cvat-notification-notice-fetch-cloud-storage-preview-failed');

            cy.get('.cvat-cloud-storage-item').should('have.length', 1).then((items) => {
                for (let i = 0; i < items.length; i++) {
                    expect(items[i].innerText).contain('Status: Error');
                }
                expect(items[0].innerText).contain('#3: Demo GCS');
                expect(items[0].innerText).contain('Provider: GOOGLE_CLOUD_STORAGE');
            });

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
