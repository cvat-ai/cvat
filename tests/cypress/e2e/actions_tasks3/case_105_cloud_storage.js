// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Cloud storage.', () => {
    const caseId = '105';

    const cloudStorageFormElements = [
        '#display_name',
        '#description',
        '#provider_type',
        '.cvat-add-manifest-button',
        '.cvat-cloud-storage-reset-button',
        '.cvat-cloud-storage-submit-button',
    ];

    const dummyData = {
        manifest: 'manifest.jsonl',
        resource: 'container',
        display_name: 'Demonstration container',
        prefix: 'GCS_prefix',
        projectID: 'Some ID',
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check "Cloud Storage" page.', () => {
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.get('.cvat-empty-cloud-storages-list').should('exist');
            cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();
            cy.get('.cvat-cloud-storage-form').should('be.visible').within(() => {
                cloudStorageFormElements.forEach(($el) => {
                    cy.get($el).should('exist');
                });
            });
        });

        it('Check "Cloud Storage" manifest field.', () => {
            // Check add/remove manifest file
            cy.get('.cvat-add-manifest-button').should('be.visible').click();
            cy.get('.cvat-cloud-storage-manifest-field').should('exist').should('have.attr', 'value', '');
            cy.get('.cvat-cloud-storage-manifest-field').type(dummyData.manifest);
            cy.get('.cvat-cloud-storage-manifest-field').should('have.attr', 'value', dummyData.manifest);
            cy.get('[data-icon="delete"]').should('be.visible').click();
            cy.get('.cvat-cloud-storage-manifest-field').should('not.exist');

            // Check we can't add non-jsonl file
            cy.get('.cvat-add-manifest-button').should('be.visible').click();
            cy.get('.cvat-cloud-storage-manifest-field').type('manifest.json');
            cy.get('.cvat-cloud-storage-manifest-field').should('have.attr', 'value', 'manifest.json');
            cy.get('.cvat-cloud-storage-form').within(() => {
                cy.contains('Manifest file must have .jsonl extension').should('exist');
            });
            cy.get('[data-icon="delete"]').should('be.visible').click();
            cy.get('.cvat-cloud-storage-manifest-field').should('not.exist');
        });

        it('Check "AWS S3" provider fields.', () => {
            cy.get('#display_name').type(dummyData.display_name);
            cy.get('#display_name').should('have.attr', 'value', dummyData.display_name);
            cy.get('#provider_type').click();
            cy.contains('.cvat-cloud-storage-select-provider', 'AWS').click();
            cy.get('#resource').should('exist');
            cy.get('#resource').type(dummyData.resource);
            cy.get('#resource').should('have.attr', 'value', dummyData.resource);
            // Check fields with "Key id and secret access key pair"
            cy.get('#credentials_type').should('exist').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('[title="Key id and secret access key pair"]')
                .should('be.visible')
                .click();
            cy.get('#key').should('exist');
            cy.get('#secret_key').should('exist');
            // Check fields with "Anonymous access"
            cy.get('[title="Key id and secret access key pair"]').first().click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('[title="Anonymous access"]')
                .should('be.visible')
                .click();
            cy.get('#key').should('not.exist');
            cy.get('#secret_key').should('not.exist');
            cy.get('#region').should('exist').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('.cvat-cloud-storage-region-creator')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Add region').click();
                });
            cy.get('.cvat-incorrect-add-region-notification').should('exist');
            cy.closeNotification('.cvat-incorrect-add-region-notification');
        });

        it('Check "Azure Blob Container" provider fields.', () => {
            cy.contains('.cvat-cloud-storage-select-provider', 'AWS').click();
            cy.contains('.cvat-cloud-storage-select-provider', 'Azure').click();
            // Check fields with "Account name and SAS token"
            cy.get('#credentials_type').should('exist').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('[title="Account name and SAS token"]')
                .should('be.visible')
                .click();
            cy.get('#account_name').should('exist');
            cy.get('#SAS_token').should('exist');
            // Check fields with "Anonymous access"
            cy.get('[title="Account name and SAS token"]').first().click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('[title="Anonymous access"]')
                .should('be.visible')
                .click();
            cy.get('#account_name').should('exist');
            cy.get('#SAS_token').should('not.exist');
        });

        it('Check "Google cloud storage" provider fields.', () => {
            cy.contains('.cvat-cloud-storage-select-provider', 'Azure').click();
            cy.contains('.cvat-cloud-storage-select-provider', 'Google').click();
            cy.get('#resource')
                .should('exist')
                .should('have.attr', 'value', dummyData.resource);
            cy.get('#credentials_type').should('exist').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('[title="Key file"]')
                .should('be.visible')
                .click();
            cy.get('.cvat-cloud-storage-form-item-key-file').should('be.visible');
            cy.get('[title="Key file"]').first().click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('[title="Anonymous access"]')
                .should('be.visible')
                .click();
            cy.get('.cvat-cloud-storage-form-item-key-file').should('not.exist');
            cy.get('#prefix').should('exist');
            cy.get('#prefix').type(dummyData.prefix);
            cy.get('#prefix').should('have.value', dummyData.prefix);
            cy.get('#project_id').should('exist');
            cy.get('#project_id').type(dummyData.projectID);
            cy.get('#project_id').should('have.value', dummyData.projectID);
            cy.get('#location').should('exist').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .get('.cvat-cloud-storage-region-creator')
                .should('be.visible')
                .within(() => {
                    cy.contains('button', 'Add region').click();
                });
            cy.get('.cvat-incorrect-add-region-notification').should('exist');
            cy.closeNotification('.cvat-incorrect-add-region-notification');
            cy.get('.cvat-cloud-storage-reset-button').click();
            cy.get('.cvat-cloud-storage-form').should('not.exist');
        });

        it('Check select files from "Cloud Storage" when creating a task.', () => {
            cy.contains('.cvat-header-button', 'Tasks').click();
            cy.get('.cvat-create-task-dropdown').click();
            cy.get('.cvat-create-task-button').should('be.visible').click();
            cy.get('.cvat-create-task-content').should('be.visible').within(() => {
                cy.contains('[role="tab"]', 'Cloud Storage').click();
                cy.get('#cloudStorageSelect').should('exist');
            });
        });

        it('Verify that attempting to update a non-existent cloud storage displays an error message', () => {
            const nonExistCloudstorageId = 99;
            cy.intercept({
                method: 'GET',
                url: `/api/cloudstorages/${nonExistCloudstorageId}`,
            }).as('cloudstorageRequest');

            cy.visit(`/cloudstorages/update/${nonExistCloudstorageId}`);
            cy.wait('@cloudstorageRequest').its('response.statusCode').should('eq', 404);
            cy.get('.cvat-spinner').should('not.exist');
            cy.contains('Sorry, but the requested cloud storage was not found');
        });
    });
});
