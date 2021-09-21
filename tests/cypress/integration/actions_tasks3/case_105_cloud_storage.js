// Copyright (C) 2021 Intel Corporation
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

    before(() => {
        cy.visit('auth/login');
        cy.login();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check "Cloud Storage" page.', () => {
            cy.contains('.cvat-header-button', 'Cloud Storages').should('be.visible').click();
            cy.get('.cvat-empty-cloud-storages-list').should('be.visible');
            cy.get('.cvat-attach-cloud-storage-button').should('be.visible').click();
            cy.get('.cvat-cloud-storage-form').should('be.visible').within(() => {
                cloudStorageFormElements.forEach(($el) => {
                    cy.get($el).should('exist');
                });
            });
            cy.get('#provider_type').click();
            cy.contains('.cvat-cloud-storage-select-provider', 'AWS').click();
            cy.get('.cvat-cloud-storage-form').within(() => {
                cy.get('#resource').should('exist');
                cy.get('#credentials_type').should('exist');
                cy.get('#region').should('exist');
            });
            cy.contains('.cvat-cloud-storage-select-provider', 'AWS').click();
            cy.contains('.cvat-cloud-storage-select-provider', 'Azure').click();
            cy.get('.cvat-cloud-storage-form').within(() => {
                cy.get('#resource').should('exist');
                cy.get('#credentials_type').should('exist');
            });
            cy.get('.cvat-cloud-storage-reset-button').click();
            cy.get('.cvat-cloud-storage-form').should('not.exist');
        });

        it('Check select files from "Cloud Storage" when creating a task.', () => {
            cy.contains('.cvat-header-button', 'Tasks').click();
            cy.get('#cvat-create-task-button').should('be.visible').click();
            cy.get('.cvat-create-task-content').should('be.visible').within(() => {
                cy.contains('[role="tab"]', 'Cloud Storage').click();
                cy.get('#cloudStorageSelect').should('exist');
            });

        });
    });
});
