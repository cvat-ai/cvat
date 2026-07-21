// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('closeAnnotationsActionsModal', () => {
    cy.get('.cvat-action-runner-cancel-btn').should('have.text', 'Close');
    cy.get('.cvat-action-runner-cancel-btn').click();
    cy.get('.cvat-action-runner-content').should('not.exist');
});

Cypress.Commands.add('openAnnotationsActionsModal', () => {
    cy.interactMenu('Run actions');
    cy.get('.cvat-action-runner-content').should('exist').and('be.visible');
});

Cypress.Commands.add('runAnnotationsAction', () => {
    cy.get('.cvat-action-runner-run-btn').click();
    cy.get('.cvat-action-runner-progress').should('exist').and('be.visible');
    cy.get('.cvat-action-runner-run-btn').should('be.disabled');
});

Cypress.Commands.add('cancelAnnotationsAction', () => {
    cy.get('.cvat-action-runner-cancel-btn').should('have.text', 'Cancel').click();
    cy.get('.cvat-action-runner-progress').should('not.exist');
    cy.get('.cvat-action-runner-run-btn').should('not.be.disabled');
    cy.get('.cvat-action-runner-content').should('exist').and('be.visible');
});

Cypress.Commands.add('selectAnnotationsAction', (name) => {
    const getOption = () => cy
        .get('.ant-select-dropdown:visible')
        .contains('.ant-select-item-option', name);

    cy.get('.cvat-action-runner-list .ant-select')
        .should('exist').and('be.visible')
        .click();
    // Re-query before clicking because Ant Design may re-render the
    // dropdown and detach the option previously yielded by Cypress.
    getOption().should('be.visible');
    getOption().click({force: true});
    cy.get('.cvat-action-runner-list .ant-select-selection-item')
        .should('contain', name);
});

Cypress.Commands.add('waitAnnotationsAction', () => {
    cy.get('.cvat-action-runner-progress').should('not.exist'); // wait until action ends
});

Cypress.Commands.add('setAnnotationActionParameter', (parameterName, type, value) => {
    if (type === 'input') {
        cy.get('.cvat-action-runner-action-parameters').within(() => {
            cy.contains('.cvat-action-runner-action-parameter', parameterName)
                .get('input').clear();
            cy.contains('.cvat-action-runner-action-parameter', parameterName)
                .get('input').type(value);
        });
    }
});
