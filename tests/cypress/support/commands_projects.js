// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2024 CVAT.ai Corporation
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
    (
        projectName, labelName, attrName, textDefaultValue,
        multiAttrParams, advancedConfigurationParams,
        expectedResult = 'success',
    ) => {
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
        if (advancedConfigurationParams) {
            cy.advancedConfiguration(advancedConfigurationParams);
        }
        cy.contains('button', 'Continue').click();
        cy.get('.cvat-create-project-content').within(() => {
            cy.contains('button', 'Submit & Continue').click();
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

Cypress.Commands.add('openProjectActions', (projectName) => {
    cy.contains('.cvat-projects-project-item-title', projectName)
        .parents('.cvat-projects-project-item-card')
        .within(() => {
            cy.get('.cvat-projects-project-item-description').within(() => {
                cy.get('[type="button"]').click();
            });
        });
});

Cypress.Commands.add('clickInProjectMenu', (item, fromProjectPage, projectName = '') => {
    if (fromProjectPage) {
        cy.get('.cvat-project-top-bar-actions').click();
    } else {
        cy.openProjectActions(projectName);
    }

    cy.get('.cvat-project-actions-menu')
        .should('exist')
        .and('be.visible')
        .contains(item)
        .click();
});

Cypress.Commands.add('deleteProject', (projectName, projectID, expectedResult = 'success') => {
    cy.clickInProjectMenu('Delete', false, projectName);
    const interceptorName = `deleteProject_${projectID}`;
    cy.intercept('DELETE', `/api/projects/${projectID}**`).as(interceptorName);
    cy.get('.cvat-modal-confirm-remove-project')
        .should('contain', `The project ${projectID} will be deleted`)
        .within(() => {
            cy.contains('button', 'Delete').click();
        });
    if (expectedResult === 'success') {
        cy.wait(`@${interceptorName}`).then((interseption) => {
            expect(interseption.response.statusCode).to.be.equal(204);
        });
        cy.get('.cvat-projects-project-item-card').should('have.css', 'opacity', '0.5');
    } else if (expectedResult === 'fail') {
        cy.get('.cvat-projects-project-item-card').should('not.have.css', 'opacity', '0.5');
    }
});

Cypress.Commands.add('exportProject', ({
    projectName, type, dumpType, archiveCustomName,
}) => {
    cy.clickInProjectMenu('Export dataset', false, projectName);
    cy.get('.cvat-modal-export-project').should('be.visible').find('.cvat-modal-export-select').click();
    cy.contains('.cvat-modal-export-option-item', dumpType).should('be.visible').click();
    cy.get('.cvat-modal-export-select').should('contain.text', dumpType);
    if (type === 'dataset') {
        cy.get('.cvat-modal-export-project').find('.cvat-modal-export-save-images').should('not.be.checked').click();
    }
    if (archiveCustomName) {
        cy.get('.cvat-modal-export-project').find('.cvat-modal-export-filename-input').type(archiveCustomName);
    }
    cy.get('.cvat-modal-export-project').contains('button', 'OK').click();
    cy.get('.cvat-notification-notice-export-project-start').should('be.visible');
    cy.closeNotification('.cvat-notification-notice-export-project-start');
});

Cypress.Commands.add('importProject', ({
    projectName, format, archive,
}) => {
    cy.clickInProjectMenu('Import dataset', false, projectName);
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
    cy.closeNotification('.cvat-notification-notice-import-dataset-start');
    cy.get('.cvat-modal-import-dataset-status').should('not.exist');
});

Cypress.Commands.add(
    'backupProject',
    (
        projectName,
        backupFileName,
        targetStorage = null,
        useDefaultLocation = true,
    ) => {
        cy.clickInProjectMenu('Backup Project', false, projectName);
        cy.get('.cvat-modal-export-project').should('be.visible');
        if (backupFileName) {
            cy.get('.cvat-modal-export-project').find('.cvat-modal-export-filename-input').type(backupFileName);
        }
        if (!useDefaultLocation) {
            cy.get('.cvat-modal-export-project')
                .find('.cvat-settings-switch')
                .click();
            cy.get('.cvat-select-target-storage').within(() => {
                cy.get('.ant-select-selection-item').click();
            });
            cy.contains('.cvat-select-target-storage-location', targetStorage.location)
                .should('be.visible')
                .click();

            if (targetStorage && targetStorage.cloudStorageId) {
                cy.get('.cvat-search-target-storage-cloud-storage-field').click();
                cy.get('.cvat-cloud-storage-select-provider').click();
            }
        }
        cy.get('.cvat-modal-export-project').contains('button', 'OK').click();
        cy.get('.cvat-notification-notice-export-backup-start').should('be.visible');
        cy.closeNotification('.cvat-notification-notice-export-backup-start');
    },
);

Cypress.Commands.add('restoreProject', (archiveWithBackup, sourceStorage = null) => {
    cy.intercept({ method: /PATCH|POST/, url: /\/api\/projects\/backup.*/ }).as('restoreProject');
    cy.get('.cvat-create-project-dropdown').click();
    cy.get('.cvat-import-project-button').click();

    if (sourceStorage) {
        cy.get('.cvat-select-source-storage').within(() => {
            cy.get('.ant-select-selection-item').click();
        });
        cy.contains('.cvat-select-source-storage-location', sourceStorage.location)
            .should('be.visible')
            .click();
        if (sourceStorage.cloudStorageId) {
            cy.get('.cvat-search-source-storage-cloud-storage-field').click();
            cy.get('.cvat-cloud-storage-select-provider').click();
            cy.get('.cvat-modal-import-backup')
                .find('.cvat-modal-import-filename-input')
                .type(archiveWithBackup);
        }
    } else {
        cy.get('input[type=file]').attachFile(archiveWithBackup, { subjectType: 'drag-n-drop' });
        cy.get(`[title="${archiveWithBackup}"]`).should('be.visible');
    }

    cy.contains('button', 'OK').click();
    cy.get('.cvat-notification-notice-import-backup-start').should('be.visible');
    cy.closeNotification('.cvat-notification-notice-import-backup-start');

    if (!sourceStorage || !sourceStorage.cloudStorageId) {
        cy.wait('@restoreProject').its('response.statusCode').should('equal', 202);
        cy.wait('@restoreProject').its('response.statusCode').should('equal', 201);
        cy.wait('@restoreProject').its('response.statusCode').should('equal', 204);
        cy.wait('@restoreProject').its('response.statusCode').should('equal', 202);
    } else {
        cy.wait('@restoreProject').its('response.statusCode').should('equal', 202);
    }
    cy.wait('@restoreProject').then((interception) => {
        cy.wrap(interception).its('response.statusCode').should('be.oneOf', [201, 202]);
        if (interception.response.statusCode === 202) {
            cy.wait('@restoreProject').its('response.statusCode').should('equal', 201);
        }
    });

    cy.contains('The project has been restored successfully. Click here to open')
        .should('exist')
        .and('be.visible');
    cy.closeNotification('.ant-notification-notice-info');
});

Cypress.Commands.add('getDownloadFileName', () => {
    cy.intercept('GET', '**=download').as('download');
    cy.wait('@download', { requestTimeout: 10000 }).then((download) => {
        const filename = download.response.headers['content-disposition'].split(';')[1].split('filename=')[1];
        // need to remove quotes
        return filename.substring(1, filename.length - 1);
    });
});

Cypress.Commands.add('waitForFileUploadToCloudStorage', () => {
    cy.intercept('GET', /.*\/(annotations|dataset|backup)/).as('download');
    cy.wait('@download', { requestTimeout: 7000 }).then((interseption) => {
        expect(interseption.response.statusCode).to.be.equal(200);
    });
    cy.verifyNotification();
});

Cypress.Commands.add('waitForDownload', () => {
    cy.getDownloadFileName().then((filename) => {
        cy.verifyDownload(filename);
    });
    cy.verifyNotification();
});

Cypress.Commands.add('deleteProjectViaActions', (projectName) => {
    cy.clickInProjectMenu('Delete', true);
    cy.get('.cvat-modal-confirm-remove-project').within(() => {
        cy.contains('button', 'Delete').click();
    });
    cy.contains('.cvat-projects-project-item-title', projectName).should('not.exist');
});

Cypress.Commands.add('assignProjectToUser', (user) => {
    cy.get('.cvat-project-details').within(() => {
        cy.get('.cvat-user-search-field').click();
        cy.get('.cvat-user-search-field').type(user);
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

Cypress.Commands.add('movingTask', (taskName, projectName, labelMappingFrom, labelMappingTo, fromTaskPage) => {
    cy.clickInTaskMenu('Move to project', fromTaskPage, taskName);
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
            cy.get('.cvat-move-task-label-mapper-item-select')
                .should('be.visible')
                .and('not.have.class', 'ant-select-disabled')
                .click();
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
