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
            cy.get('.cvat-notification-create-project-success').should('exist').find('[data-icon="close"]').click();
        } else if (expectedResult == 'fail') {
            cy.get('.cvat-notification-create-project-success').should('not.exist');
        }
        cy.goToProjectsList();
    },
);

Cypress.Commands.add('openProject', (projectName) => {
    cy.contains(projectName).click({ force: true });
    cy.get('.cvat-project-details').should('exist');
});

Cypress.Commands.add('projectActions', (projectName) => {
    cy.contains('.cvat-projects-project-item-title', projectName)
        .parents('.cvat-projects-project-item-card')
        .within(() => {
            cy.get('.cvat-porjects-project-item-description').within(() => {
                cy.get('[type="button"]').trigger('mouseover');
            });
        });
});

Cypress.Commands.add('deleteProject', (projectName, projectID, expectedResult = 'success') => {
    cy.projectActions(projectName);
    cy.get('.cvat-project-actions-menu').contains('Delete').click();
    cy.get('.cvat-modal-confirm-remove-project')
        .should('contain', `The project ${projectID} will be deleted`)
        .within(() => {
            cy.contains('button', 'Delete').click();
        });
    if (expectedResult === 'success') {
        cy.get('.cvat-projects-project-item-card').should('have.css', 'opacity', '0.5');
    } else if (expectedResult === 'fail') {
        cy.get('.cvat-projects-project-item-card').should('not.have.css', 'opacity', '0.5');
    }
});

Cypress.Commands.add('exportProject', ({ projectName, as, type, dumpType, archiveCustomeName }) => {
    cy.projectActions(projectName);
    cy.intercept('GET', `/api/v1/projects/**/${type}**`).as(as);
    cy.get('.cvat-project-actions-menu').contains('Export project dataset').click();
    cy.get('.cvat-modal-export-project').should('be.visible').find('.cvat-modal-export-select').click();
    cy.contains('.cvat-modal-export-option-item', dumpType).should('be.visible').click();
    cy.get('.cvat-modal-export-select').should('contain.text', dumpType);
    if (type === 'dataset') {
        cy.get('.cvat-modal-export-project').find('[type="checkbox"]').should('not.be.checked').check();
    }
    if (archiveCustomeName) {
        cy.get('.cvat-modal-export-project').find('.cvat-modal-export-filename-input').type(archiveCustomeName);
    }
    cy.get('.cvat-modal-export-project').contains('button', 'OK').click();
    cy.get('.cvat-notification-notice-export-project-start').should('be.visible');
    cy.wait(`@${as}`, { timeout: 5000 }).its('response.statusCode').should('equal', 202);
    cy.wait(`@${as}`).its('response.statusCode').should('equal', 201);
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

Cypress.Commands.add('movingTask', (taskName, projectName, labelMappingFrom, labelMappingTo, fromTask) => {
    if (fromTask) {
        cy.contains('.cvat-text-color', 'Actions').click();
    } else {
        cy.contains('strong', taskName).parents('.cvat-tasks-list-item').find('.cvat-menu-icon').click();
    }
    cy.get('.cvat-actions-menu')
        .should('be.visible')
        .find('[role="menuitem"]')
        .filter(':contains("Move to project")')
        .last()
        .click();
    cy.get('.cvat-task-move-modal').find('.cvat-project-search-field').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .within(() => {
            cy.get(`[title="${projectName}"]`).click();
        });
    if (labelMappingFrom !== labelMappingTo) {
        cy.get('.cvat-move-task-label-mapper-item').within(() => {
            cy.contains(labelMappingFrom).should('exist');
            cy.get('.cvat-move-task-label-mapper-item-select').click();
        });
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').find(`[title="${labelMappingTo}"]`).click();
    } else {
        cy.get('.cvat-move-task-label-mapper-item').within(() => {
            cy.get('.cvat-move-task-label-mapper-item-select').should('have.text', labelMappingFrom);
        });
    }
    cy.get('.cvat-task-move-modal').within(() => {
        cy.contains('button', 'OK').click();
    });
});
