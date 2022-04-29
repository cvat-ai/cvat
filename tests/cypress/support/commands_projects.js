// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

Cypress.Commands.add('goToProjectsList', () => {
    cy.get('[value="projects"]').click();
    cy.url().should('include', '/projects');
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add(
    'createProjects',
    (projectName, labelName, attrName, textDefaultValue, multiAttrParams, expectedResult = 'success') => {
        cy.get('.cvat-create-project-dropdown').click();
        cy.get('.cvat-create-project-button').click();
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
        if (expectedResult === 'success') {
            cy.get('.cvat-notification-create-project-success').should('exist').find('[data-icon="close"]').click();
        } else if (expectedResult === 'fail') {
            cy.get('.cvat-notification-create-project-success').should('not.exist');
        }
        cy.goToProjectsList();
    },
);

Cypress.Commands.add('deleteProjects', (authResponse, projectsToDelete) => {
    const authKey = authResponse.body.key;
    cy.request({
        url: '/api/projects?page_size=all',
        headers: {
            Authorization: `Token ${authKey}`,
        },
    }).then((_response) => {
        const responceResult = _response.body.results;
        for (const project of responceResult) {
            const { id, name } = project;
            for (const projectToDelete of projectsToDelete) {
                if (name === projectToDelete) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/projects/${id}`,
                        headers: {
                            Authorization: `Token ${authKey}`,
                        },
                    });
                }
            }
        }
    });
});

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

Cypress.Commands.add('exportProject', ({
    projectName, type, dumpType, archiveCustomeName,
}) => {
    cy.projectActions(projectName);
    cy.get('.cvat-project-actions-menu').contains('Export dataset').click();
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
});

Cypress.Commands.add('importProject', ({
    projectName, format, archive,
}) => {
    cy.projectActions(projectName);
    cy.get('.cvat-project-actions-menu').contains('Import dataset').click();
    cy.get('.cvat-modal-import-dataset').find('.cvat-modal-import-select').click();
    if (format === 'Sly Point Cloud Format') {
        cy.get('.ant-select-dropdown')
            .not('.ant-select-dropdown-hidden')
            .trigger('wheel', { deltaY: 1000 });
    }
    cy.contains('.cvat-modal-import-dataset-option-item', format).click();
    cy.get('.cvat-modal-import-select').should('contain.text', format);
    cy.get('input[type="file"]').last().attachFile(archive, { subjectType: 'drag-n-drop' });
    cy.get(`[title="${archive}"]`).should('be.visible');
    cy.contains('button', 'OK').click();
    cy.get('.cvat-modal-import-dataset-status').should('be.visible');
    cy.get('.cvat-notification-notice-import-dataset-start').should('be.visible');
    cy.get('.cvat-modal-import-dataset-status').should('not.exist');
});

Cypress.Commands.add('backupProject', (projectName) => {
    cy.projectActions(projectName);
    cy.get('.cvat-project-actions-menu').contains('Backup Project').click();
});

Cypress.Commands.add('restoreProject', (archiveWithBackup) => {
    cy.intercept('POST', '/api/projects/backup?**').as('restoreProject');
    cy.get('.cvat-create-project-dropdown').click();
    cy.get('.cvat-import-project').click().find('input[type=file]').attachFile(archiveWithBackup);
    cy.wait('@restoreProject', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
    cy.wait('@restoreProject').its('response.statusCode').should('equal', 201);
    cy.contains('Project has been created succesfully')
        .should('exist')
        .and('be.visible');
    cy.get('[data-icon="close"]').click(); // Close the notification
});

Cypress.Commands.add('getDownloadFileName', () => {
    cy.intercept('GET', '**=download').as('download');
    cy.wait('@download').then((download) => {
        const filename = download.response.headers['content-disposition'].split(';')[1].split('filename=')[1];
        // need to remove quotes
        return filename.substring(1, filename.length - 1);
    });
});

Cypress.Commands.add('waitForDownload', () => {
    cy.getDownloadFileName().then((filename) => {
        cy.verifyDownload(filename);
    });
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
        .last()
        .should('be.visible')
        .within(() => {
            cy.get(`[title="${projectName}"]`).click();
        });
    if (labelMappingFrom !== labelMappingTo) {
        cy.get('.cvat-move-task-label-mapper-item').within(() => {
            cy.contains(labelMappingFrom).should('exist');
            cy.get('.cvat-move-task-label-mapper-item-select').should('be.visible').click();
        });
        cy.get('.ant-select-dropdown')
            .last()
            .should('be.visible')
            .find(`[title="${labelMappingTo}"]`).click();
    } else {
        cy.get('.cvat-move-task-label-mapper-item').within(() => {
            cy.get('.cvat-move-task-label-mapper-item-select').should('have.text', labelMappingFrom);
        });
    }
    cy.get('.cvat-task-move-modal').within(() => {
        cy.contains('button', 'OK').click();
    });
});
