// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Dump/upload annotation. "Velodyne Points" format.', () => {
    const caseId = '92';
    const cuboidCreationParams = {
        labelName: labelName,
    };
    const dumpTypeVC = 'Kitti Raw Format';
    let annotationVCArchiveName = '';

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName).within(() => {
            cy.contains('button', 'Update').click();
        });
    }

    function uploadToTask(toTaskName) {
        cy.contains('.cvat-item-task-name', toTaskName)
            .parents('.cvat-tasks-list-item')
            .find('.cvat-menu-icon')
            .trigger('mouseover');
        cy.contains('Upload annotations').trigger('mouseover');
        cy.readFile('cypress/downloads/' + annotationVCArchiveName, 'binary')
            .then(Cypress.Blob.binaryStringToBlob)
            .then((fileContent) => {
                cy.contains('.cvat-menu-load-submenu-item', dumpTypeVC.split(' ')[0])
                    .should('be.visible')
                    .within(() => {
                        cy.get('.cvat-menu-load-submenu-item-button').click().get('input[type=file]').attachFile({
                            fileContent: fileContent,
                            fileName: annotationVCArchiveName,
                        });
                    });
            });
    }

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Save a job. Dump with "Velodyne Points" format.', () => {
            cy.saveJob('PATCH', 200, 'saveJob');
            cy.intercept('GET', '/api/v1/tasks/**/annotations**').as('dumpAnnotations');
            cy.interactMenu('Export task dataset');
            cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').click();
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .contains('.cvat-modal-export-option-item', dumpTypeVC)
                .click();
            cy.get('.cvat-modal-export-select').should('contain.text', dumpTypeVC);
            cy.get('.cvat-modal-export-task').contains('button', 'OK').click();
            cy.wait('@dumpAnnotations', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@dumpAnnotations').its('response.statusCode').should('equal', 201);
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');

            cy.wait(2000); // Waiting for the full download.
            cy.task('listFiles', 'cypress/downloads').each((fileName) => {
                if (fileName.includes(dumpTypeVC.toLowerCase())) {
                    annotationVCArchiveName = fileName;
                }
            });
        });

        it('Upload "Velodyne Points" format annotation to job.', () => {
            cy.interactMenu('Upload annotations');
            cy.readFile('cypress/downloads/' + annotationVCArchiveName, 'binary')
                .then(Cypress.Blob.binaryStringToBlob)
                .then((fileContent) => {
                    cy.contains('.cvat-menu-load-submenu-item', dumpTypeVC.split(' ')[0])
                        .should('be.visible')
                        .within(() => {
                            cy.get('.cvat-menu-load-submenu-item-button').click().get('input[type=file]').attachFile({
                                fileContent: fileContent,
                                fileName: annotationVCArchiveName,
                            });
                        });
                });
            cy.intercept('PUT', '/api/v1/jobs/**/annotations**').as('uploadAnnotationsPut');
            cy.intercept('GET', '/api/v1/jobs/**/annotations**').as('uploadAnnotationsGet');
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.wait('@uploadAnnotationsPut', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@uploadAnnotationsPut').its('response.statusCode').should('equal', 201);
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.get('button').contains('Save').click({ force: true });
        });

        it('Upload annotation to task.', () => {
            cy.goToTaskList();
            uploadToTask(taskName);
            confirmUpdate('.cvat-modal-content-load-task-annotation');
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.get('[data-icon="close"]').click();
            cy.openTaskJob(taskName);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.get('button').contains('Save').click({ force: true });
        });
    });
});
