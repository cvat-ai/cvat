// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Changing a label name via label constructor.', () => {
    const caseId = '42';
    const firstLabelName = `First case ${caseId}`;
    const secondLabelName = `Second case ${caseId}`;

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.get('#cvat-create-task-button').click();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Set empty label name. Press "Done" button. Alert exist.', () => {
            cy.get('.cvat-constructor-viewer-new-item').click(); // Open label constructor
            cy.contains('[type="submit"]', 'Done').click();
            cy.contains('[role="alert"]', 'Please specify a name').should('exist').and('be.visible');
        });

        it('Change label name to any other correct value. Press "Done" button. The label created.', () => {
            cy.get('[placeholder="Label name"]').type(firstLabelName);
            cy.contains('[type="submit"]', 'Done').click({ force: true });
            cy.get('.cvat-constructor-viewer-item').should('exist').and('have.text', firstLabelName);
        });

        it('Change label name to any other correct value. Press "Cancel". Label name is not changed.', () => {
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
            cy.get('[placeholder="Label name"]').clear().type(secondLabelName);
            cy.contains('[type="button"]', 'Cancel').click();
            cy.get('.cvat-constructor-viewer-item').should('exist').and('have.text', firstLabelName);
        });

        it('Change label name to any other correct value. Press "Done". Label name changed.', () => {
            cy.get('.cvat-constructor-viewer-item').find('[aria-label="edit"]').click();
            cy.get('[placeholder="Label name"]').clear().type(secondLabelName);
            cy.contains('[type="submit"]', 'Done').click();
            cy.get('.cvat-constructor-viewer-item')
                .should('exist')
                .and('have.length', 1)
                .and('have.text', secondLabelName);
        });
    });
});
