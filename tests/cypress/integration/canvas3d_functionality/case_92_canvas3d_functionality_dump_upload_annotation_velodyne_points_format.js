// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Dump/upload annotation. "Velodyne Points" format.', () => {
    const caseId = '92';
    const cuboidCreationParams = {
        labelName,
    };
    const dumpTypeVC = 'Kitti Raw Format';
    let annotationVCArchiveName = '';
    let annotationVCArchiveNameCustomeName = '';

    function confirmUpdate(modalWindowClassName) {
        cy.get(modalWindowClassName).should('be.visible').within(() => {
            cy.contains('button', 'Update').click();
        });
    }

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.saveJob('PATCH', 200, 'saveJob');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export with "Velodyne Points" format.', () => {
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: dumpTypeVC,
            };
            cy.exportTask(exportAnnotation);
            cy.getDownloadFileName().then((file) => {
                annotationVCArchiveName = file;
                cy.verifyDownload(annotationVCArchiveName);
            });
        });

        it('Export with "Point Cloud" format. Renaming the archive', () => {
            const exportAnnotationRenameArchive = {
                as: 'exportAnnotationsRenameArchive',
                type: 'annotations',
                format: dumpTypeVC,
                archiveCustomeName: 'task_export_3d_annotation_custome_name_vc_format',
            };
            cy.exportTask(exportAnnotationRenameArchive);
            cy.getDownloadFileName().then((file) => {
                annotationVCArchiveNameCustomeName = file;
                cy.verifyDownload(annotationVCArchiveNameCustomeName);
            });
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.exist');
        });

        it('Upload "Velodyne Points" format annotation to job.', () => {
            cy.interactMenu('Upload annotations');
            cy.readFile(`cypress/fixtures/${annotationVCArchiveName}`, 'binary')
                .then(Cypress.Blob.binaryStringToBlob)
                .then((fileContent) => {
                    cy.contains('.cvat-menu-load-submenu-item', dumpTypeVC.split(' ')[0])
                        .should('be.visible')
                        .within(() => {
                            cy.get('.cvat-menu-load-submenu-item-button').click().get('input[type=file]').attachFile({
                                fileContent,
                                fileName: annotationVCArchiveName,
                            });
                        });
                });
            confirmUpdate('.cvat-modal-content-load-job-annotation');
            cy.intercept('GET', '/api/jobs/**/annotations**').as('uploadAnnotationsGet');
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.get('button').contains('Save').click().trigger('mouseout');
        });

        it('Upload annotation to task.', () => {
            cy.goToTaskList();
            cy.contains('.cvat-item-task-name', taskName)
                .parents('.cvat-tasks-list-item')
                .find('.cvat-menu-icon')
                .trigger('mouseover');
            cy.contains('Upload annotations').trigger('mouseover');
            cy.readFile(`cypress/fixtures/${annotationVCArchiveNameCustomeName}`, 'binary')
                .then(Cypress.Blob.binaryStringToBlob)
                .then((fileContent) => {
                    cy.contains('.cvat-menu-load-submenu-item', dumpTypeVC.split(' ')[0])
                        .should('be.visible')
                        .within(() => {
                            cy.get('.cvat-menu-load-submenu-item-button').click().get('input[type=file]').attachFile({
                                fileName: annotationVCArchiveNameCustomeName,
                                fileContent,
                            });
                        });
                });
            confirmUpdate('.cvat-modal-content-load-task-annotation');
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.get('[data-icon="close"]').click();
            cy.openTaskJob(taskName);
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist');
            cy.removeAnnotations();
            cy.get('button').contains('Save').click().trigger('mouseout');
        });
    });
});
