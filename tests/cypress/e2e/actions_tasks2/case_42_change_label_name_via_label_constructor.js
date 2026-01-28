// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Changing a label name via label constructor.', () => {
    const caseId = '42';
    const firstLabelName = `First case ${caseId}`;
    const secondLabelName = `Second case ${caseId}`;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.get('.cvat-create-task-dropdown').click();
        cy.get('.cvat-create-task-button').click();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Set empty label name. Press "Continue" button. Label name is not created. Label constructor is closed.', () => {
            cy.get('.cvat-constructor-viewer-new-item').click(); // Open label constructor
            cy.contains('[type="submit"]', 'Continue').click();
            cy.contains('[type="submit"]', 'Continue').trigger('mouseout');
            cy.contains('[role="alert"]', 'Please specify a name').should('exist').and('be.visible');
            cy.contains('[type="button"]', 'Cancel').click(); // Close label constructor
        });

        it('Change label name to any other correct value. Press "Continue" button. The label created.', () => {
            cy.get('.cvat-constructor-viewer-new-item').click(); // Open label constructor
            cy.get('[placeholder="Label name"]').type(firstLabelName);
            cy.contains('[type="submit"]', 'Continue').click({ force: true });
            cy.contains('[type="button"]', 'Cancel').click(); // Close label constructor
            cy.get('.cvat-constructor-viewer-item').should('exist').and('have.text', firstLabelName);
        });

        it('Change label name to any other correct value. Press "Cancel". Label name is not changed.', () => {
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
            cy.get('[placeholder="Label name"]').clear();
            cy.get('[placeholder="Label name"]').type(secondLabelName);
            cy.contains('[type="button"]', 'Cancel').click();
            cy.get('.cvat-constructor-viewer-item').should('exist').and('have.text', firstLabelName);
        });

        it('Change label name to any other correct value. Press "Done". Label name changed.', () => {
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
            cy.get('[placeholder="Label name"]').clear();
            cy.get('[placeholder="Label name"]').type(secondLabelName);
            cy.contains('[type="submit"]', 'Done').click();
            cy.get('.cvat-constructor-viewer-item')
                .should('exist')
                .and('have.length', 1)
                .and('have.text', secondLabelName);
        });
    });
});
