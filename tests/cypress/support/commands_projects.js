// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('goToProjectsList', () => {
    cy.get('[value="projects"]').click();
    cy.url().should('include', '/projects');
});

Cypress.Commands.add(
    'createProjects',
    (projectName, labelName, attrName, textDefaultValue, multiAttrParams, expectedResult = 'success') => {
        cy.get('#cvat-create-project-button').click();
        cy.get('#name').type(projectName);
        cy.get('.cvat-constructor-viewer-new-item').click();
        cy.get('[placeholder="Label name"]').type(labelName);
        cy.get('.cvat-new-attribute-button').click();
        cy.get('[placeholder="Name"]').type(attrName);
        cy.get('.cvat-attribute-type-input').click();
        cy.get('.cvat-attribute-type-input-text').click();
        cy.get('[placeholder="Default value"]').type(textDefaultValue);
        if (multiAttrParams) {
            cy.updateAttributes(multiAttrParams);
        }
        cy.contains('button', 'Done').click();
        cy.get('.cvat-create-project-content').within(() => {
            cy.contains('Submit').click();
        });
        if (expectedResult == 'success') {
            cy.contains('The project has been created').should('exist');
        } else if (expectedResult == 'fail') {
            cy.contains('The project has been created').should('not.exist');
        }
        cy.goToProjectsList();
    },
);

Cypress.Commands.add('openProject', (projectName) => {
    cy.contains(projectName).click({ force: true });
    cy.get('.cvat-project-details').should('exist');
});

Cypress.Commands.add('deleteProject', (projectName, projectID, expectedResult = 'success') => {
    cy.contains('.cvat-projects-project-item-title', projectName)
        .parents('.cvat-projects-project-item-card')
        .within(() => {
            cy.get('.cvat-porjects-project-item-description').within(() => {
                cy.get('[type="button"]').trigger('mouseover');
            });
        });
    cy.get('.cvat-project-actions-menu').contains('Delete').click();
    cy.get('.cvat-modal-confirm-remove-project')
        .should('contain', `The project ${projectID} will be deleted`)
        .within(() => {
            cy.contains('button', 'Delete').click();
        });
    if (expectedResult === 'success') {
        cy.get('.cvat-projects-project-item-card').should('have.css', 'opacity', '0.5');
    } else if (expectedResult === 'fail') {
        cy.get('.cvat-projects-project-item-card').should('not.have.attr', 'style');
    }
});

Cypress.Commands.add('deleteProjectViaActions', (projectName) => {
    cy.get('.cvat-project-top-bar-actions').trigger('mouseover');
    cy.get('.cvat-project-actions-menu').within(() => {
        cy.contains('[role="menuitem"]', 'Delete').click();
    });
    cy.get('.cvat-modal-confirm-remove-project').within(() => {
        cy.contains('button', 'Delete').click();
    });
    cy.contains('.cvat-projects-project-item-title', projectName).should('not.exist');
});

Cypress.Commands.add('assignProjectToUser', (user) => {
    cy.get('.cvat-project-details').within(() => {
        cy.get('.cvat-user-search-field').click().type(user);
        cy.wait(300);
    });
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .within(() => {
            cy.get(`.ant-select-item-option[title="${user}"]`).click();
        });
});

Cypress.Commands.add('closeNotification', (className) => {
    cy.get(className).find('span[aria-label="close"]').click();
    cy.get(className).should('not.exist');
});
